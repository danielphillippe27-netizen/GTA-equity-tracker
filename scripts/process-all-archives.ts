import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ARCHIVE_DIR = '/Users/danielphillippe/.openclaw/workspace/market archive 1996 - present';

async function processAllFiles() {
  const files = fs.readdirSync(ARCHIVE_DIR)
    .filter(f => f.startsWith('mw') && f.endsWith('.pdf'))
    .sort(); 

  console.log(`Found ${files.length} archive files. Starting processing...`);

  for (const file of files) {
    await processFile(file);
  }
}

async function processFile(filename: string) {
  const match = filename.match(/mw(\d{2})(\d{2})\.pdf/);
  if (!match) return;

  const yy = parseInt(match[1]);
  const mm = match[2];
  const year = yy >= 90 ? `19${yy}` : `20${yy < 10 ? '0' + yy : yy}`;
  const reportMonth = `${year}-${mm}`;

  console.log(`Processing ${filename} (${reportMonth})...`);

  try {
    // 1. Check total pages using pdfinfo
    const infoCmd = `pdfinfo "${path.join(ARCHIVE_DIR, filename)}" | grep Pages | awk '{print $2}'`;
    const totalPages = parseInt(execSync(infoCmd, { encoding: 'utf-8' }).trim());

    // 2. Decide which pages to scan
    // Recent reports are ~28 pages. Old reports are ~4-10 pages.
    // If > 20 pages, scan 24-28.
    // If < 20 pages, scan EVERYTHING (safe for text extraction).
    let text = '';
    
    if (totalPages > 20) {
       // Modern format
       try {
         const cmd = `pdftotext -f 24 -l 28 -layout "${path.join(ARCHIVE_DIR, filename)}" -`;
         text = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
       } catch (e) {
         // Fallback if 24-28 fails (maybe slightly shorter)
         const cmd = `pdftotext -f ${totalPages-5} -l ${totalPages} -layout "${path.join(ARCHIVE_DIR, filename)}" -`;
         text = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
       }
    } else {
       // Old format (short report) -> Scan all
       const cmd = `pdftotext -layout "${path.join(ARCHIVE_DIR, filename)}" -`;
       text = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    }

    // 3. Parse Data
    const rows = parseTableData(text, reportMonth);
    
    // Deduplicate rows before inserting
    const uniqueRows = Array.from(new Map(rows.map(item => 
      [`${item.report_month}-${item.area_name}-${item.property_category}`, item]
    )).values());

    if (uniqueRows.length === 0) {
      console.log(`  ⚠️ No data found for ${filename} (Text extraction empty or format mismatched).`);
      return;
    }

    // 4. Upsert to Supabase
    const { error } = await supabase.from('market_hpi').upsert(uniqueRows, {
      onConflict: 'report_month, area_name, property_category',
      ignoreDuplicates: false
    });

    if (error) {
      console.error(`  ❌ DB Error for ${filename}:`, error.message);
    } else {
      console.log(`  ✅ Imported ${rows.length} rows.`);
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ Error processing ${filename}:`, errorMessage);
  }
}

function parseTableData(text: string, reportMonth: string) {
  const lines = text.split('\n');
  const results: any[] = [];
  const categories = [null, 'Detached', 'Semi-Detached', 'Townhouse', 'Condo Apt'];

  for (const line of lines) {
    if (line.includes('Index') && line.includes('Benchmark')) continue;
    if (line.includes('Market Watch') || line.includes('Copyright')) continue;

    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const parts = cleanLine.split(/\s{2,}/);
    if (parts.length < 5) continue;

    const areaName = parts[0];
    if (areaName.includes('Price Index') || areaName.includes('Composite')) continue;
    
    // Ignore lines that look like headers or garbage
    if (!areaName.match(/[a-zA-Z]/)) continue; 

    // Extract numbers
    const numbersStr = cleanLine.substring(areaName.length).trim();
    const tokens = numbersStr.split(/\s+/);

    if (tokens.length < 9) continue; // Loosened constraint for older files

    for (let i = 1; i <= 4; i++) {
      const baseIdx = i * 3;
      if (baseIdx + 1 >= tokens.length) break;

      const idxVal = tokens[baseIdx];
      const priceVal = tokens[baseIdx + 1];

      // Remove non-numeric chars except dot
      const hpi = parseFloat(idxVal.replace(/[^0-9.]/g, ''));
      const price = parseFloat(priceVal.replace(/[^0-9.]/g, ''));

      if (isNaN(hpi) || isNaN(price)) continue;
      // Sanity check: HPI is usually 100-500, Price > 10000
      if (price < 1000) continue; 

      results.push({
        report_month: reportMonth,
        area_name: areaName,
        property_category: categories[i],
        hpi_index: hpi,
        benchmark_price: price
      });
    }
  }

  return results;
}

processAllFiles();
