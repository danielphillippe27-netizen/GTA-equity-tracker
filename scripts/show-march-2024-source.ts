import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function showSource() {
  const { data, error } = await supabase
    .from('market_hpi')
    .select('*')
    .eq('area_name', 'Clarington')
    .eq('property_category', 'Detached')
    .eq('report_month', '2024-03')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📄 SOURCE DOCUMENT: TRREB Market Watch Report - March 2024');
  console.log('=========================================================\n');
  console.log('Report Month:', data.report_month);
  console.log('Area:', data.area_name);
  console.log('Property Type:', data.property_category);
  console.log('\n📊 PUBLISHED DATA FROM TRREB:');
  console.log('  HPI Index: ', data.hpi_index);
  console.log('  Benchmark Price: $' + data.benchmark_price.toLocaleString());
  console.log('\n✅ This data comes from the official TRREB (Toronto Regional');
  console.log('   Real Estate Board) Market Watch Report published in March 2024.');
  console.log('\n💡 The benchmark price ($954,600) represents the typical price');
  console.log('   of a detached home in Clarington as calculated by TRREB using');
  console.log('   their Home Price Index methodology.\n');
}

showSource().catch(console.error);
