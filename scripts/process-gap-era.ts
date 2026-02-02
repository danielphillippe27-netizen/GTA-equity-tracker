import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ARCHIVE_DIR = '/Users/danielphillippe/.openclaw/workspace/market archive 1996 - present';

// Regex to find District Codes (W01, C14, N11, etc.)
// Matches start of line, followed by Code, then spaces, then numbers/currencies
const DISTRICT_ROW_REGEX = /^([WECN](?:0[1-9]|[1-9][0-9]))\s+(?:[\d,]+\s+){2,}\$([\d,]+)/;

async function processGapEra() {
  const files = fs.readdirSync(ARCHIVE_DIR)
    .filter(f => f.startsWith('mw') && f.endsWith('.pdf'))
    .sort();

  console.log(`🔎 Scanning for Gap Era files (1996-2011)...`);

  for (const file of files) {
    const match = file.match(/mw(\d{2})(\d{2})\.pdf/);
    if (!match) continue;

    const yy = parseInt(match[1]);
    const year = yy >= 90 ? 1900 + yy : 2000 + yy;
    
    // Target range: 1996 to 2011
    if (year < 1996 || year > 2011) continue;

    await processFile(file, `${year}-${match[2]}`);
  }
}

async function processFile(filename: string, reportMonth: string) {
  console.log(`Processing ${filename} (${reportMonth})...`);

  try {
    // Scan ALL pages for these old/messy files
    const cmd = `pdftotext -layout "${path.join(ARCHIVE_DIR, filename)}" -`;
    const text = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });

    const rows = parseGapData(text, reportMonth);

    if (rows.length === 0) {
      console.log(`  ⚠️ No data found.`);
      return;
    }

    // Deduplicate (take first occurrence of an area, usually the summary table)
    const uniqueRows = Array.from(new Map(rows.map(item => 
      [item.area_name, item]
    )).values());

    const { error } = await supabase.from('market_hpi').upsert(uniqueRows, {
      onConflict: 'report_month, area_name, property_category',
      ignoreDuplicates: false
    });

    if (error) {
      console.error(`  ❌ DB Error:`, error.message);
    } else {
      console.log(`  ✅ Imported ${uniqueRows.length} areas.`);
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ Error:`, errorMessage);
  }
}

function parseGapData(text: string, reportMonth: string) {
  const lines = text.split('\n');
  const results: any[] = [];

  for (const line of lines) {
    const cleanLine = line.trim();
    
    // Look for lines starting with District Code (e.g., W23 ...)
    // And containing a price ($...)
    const match = cleanLine.match(DISTRICT_ROW_REGEX);
    
    if (match) {
      const areaCode = match[1]; 
      
      // NEW LOGIC: 
      // 1. Find all numbers that look like currency (with or without $)
      // Matches: 100,000 or 1,000,000 or $100,000
      const numberMatches = cleanLine.match(/(?:\$)?[\d]{1,3}(?:,[\d]{3})+(?:\.[\d]{2})?/g);
      
      if (!numberMatches) continue;

      let volumeFound = false;
      let validPrice = 0;
      
      for (const numStr of numberMatches) {
        const val = parseFloat(numStr.replace(/[$,]/g, ''));
        
        // Identify Volume first (Usually > $2 Million)
        if (!volumeFound && val > 2000000) {
          volumeFound = true;
          continue; // The NEXT number is likely the Average Price
        }

        // If we found volume, the next reasonable number is Avg Price
        if (volumeFound) {
           if (val > 50000 && val < 2000000) {
             validPrice = val;
             break; 
           }
        }
        
        // Fallback: If no volume found yet, but we see a price-like number?
        // Be careful not to pick "Sales Count" (e.g. 1,400)
        // Let's assume Price > 100,000 (in 1996 prices were ~198k)
        if (val > 100000 && val < 2000000) {
            // Store it as a candidate, but prefer the one after volume if possible
            if (validPrice === 0) validPrice = val;
        }
      }

      if (validPrice > 0) {
        results.push({
          report_month: reportMonth,
          area_name: areaCode,
          property_category: 'All',
          benchmark_price: validPrice,
          hpi_index: null
        });
      }
    }
  }
  return results;
}

processGapEra();
