import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check2024Data() {
  console.log('\n📊 CHECKING ALL 2024 DATA\n');
  console.log('==========================\n');

  // Get all unique months in 2024
  const { data: months } = await supabase
    .from('market_hpi')
    .select('report_month')
    .like('report_month', '2024-%')
    .order('report_month', { ascending: true });

  const uniqueMonths = [...new Set(months?.map(m => m.report_month))];
  
  console.log(`Found data for ${uniqueMonths.length} months in 2024:`);
  console.log(uniqueMonths.join(', '));
  console.log('\n');

  // Check each month's record count
  for (const month of uniqueMonths) {
    const { count } = await supabase
      .from('market_hpi')
      .select('*', { count: 'exact', head: true })
      .eq('report_month', month);

    console.log(`${month}: ${count} records`);
  }

  // Get sample records from March 2024 to see what was imported
  console.log('\n\n📋 SAMPLE RECORDS FROM MARCH 2024:\n');
  
  const { data: marchSample } = await supabase
    .from('market_hpi')
    .select('area_name, property_category, hpi_index, benchmark_price')
    .eq('report_month', '2024-03')
    .order('area_name', { ascending: true })
    .limit(20);

  marchSample?.forEach(r => {
    console.log(`${r.area_name.padEnd(25)} ${r.property_category.padEnd(15)} HPI: ${String(r.hpi_index).padEnd(8)} Price: $${r.benchmark_price?.toLocaleString()}`);
  });

  console.log('\n\n💡 DATA SOURCE:\n');
  console.log('All 2024 data came from PDF extraction using process-all-archives.ts');
  console.log('PDF files should be located at:');
  console.log('  /Users/danielphillippe/.openclaw/workspace/market archive 1996 - present/\n');
  console.log('To verify specific values, you should:');
  console.log('  1. Check if the PDF files exist and are readable');
  console.log('  2. Manually verify key data points from the original PDFs');
  console.log('  3. Re-run the extraction if PDFs are available\n');
}

check2024Data().catch(console.error);
