import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMarch2024() {
  console.log('\n🔧 Correcting Clarington Detached benchmark price for March 2024...\n');

  // First, show current value
  const { data: current } = await supabase
    .from('market_hpi')
    .select('*')
    .eq('area_name', 'Clarington')
    .eq('property_category', 'Detached')
    .eq('report_month', '2024-03')
    .single();

  if (current) {
    console.log('Current value in database:');
    console.log(`  Benchmark Price: $${current.benchmark_price?.toLocaleString()}`);
    console.log(`  HPI Index: ${current.hpi_index}`);
  }

  // Update to correct value
  const { error } = await supabase
    .from('market_hpi')
    .update({ 
      benchmark_price: 980382
    })
    .eq('area_name', 'Clarington')
    .eq('property_category', 'Detached')
    .eq('report_month', '2024-03');

  if (error) {
    console.error('❌ Error updating:', error);
    return;
  }

  // Verify the update
  const { data: updated } = await supabase
    .from('market_hpi')
    .select('*')
    .eq('area_name', 'Clarington')
    .eq('property_category', 'Detached')
    .eq('report_month', '2024-03')
    .single();

  console.log('\n✅ Updated successfully!');
  console.log('\nNew value in database:');
  console.log(`  Benchmark Price: $${updated.benchmark_price?.toLocaleString()}`);
  console.log(`  HPI Index: ${updated.hpi_index}`);

  // Recalculate what the equity would be with correct price
  const currentPrice = 848500; // December 2025
  const purchasePrice = 980382; // Corrected March 2024
  const appreciation = currentPrice / purchasePrice;
  
  console.log('\n📊 Recalculated metrics with correct benchmark:');
  console.log(`  Appreciation: ${appreciation.toFixed(4)}x (${((appreciation - 1) * 100).toFixed(1)}%)`);
  
  const userPurchasePrice = 900000;
  const newValue = Math.round(userPurchasePrice * appreciation);
  const newEquity = newValue - userPurchasePrice;
  
  console.log(`\n💰 For $${userPurchasePrice.toLocaleString()} purchase price:`);
  console.log(`  New Current Value: $${newValue.toLocaleString()}`);
  console.log(`  New Equity: $${newEquity.toLocaleString()}\n`);
}

fixMarch2024().catch(console.error);
