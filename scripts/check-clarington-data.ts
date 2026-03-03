import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClaringtonData() {
  console.log('\n📊 Checking Clarington Detached data...\n');

  // Check for March 2024 data
  const { data: marchData, error: marchError } = await supabase
    .from('market_hpi')
    .select('*')
    .ilike('area_name', '%clarington%')
    .ilike('property_category', '%detached%')
    .eq('report_month', '2024-03')
    .order('report_month', { ascending: false });

  console.log('March 2024 Data:');
  console.log('----------------');
  if (marchError) {
    console.error('Error:', marchError);
  } else if (marchData && marchData.length > 0) {
    marchData.forEach((row: any) => {
      console.log(`Area: ${row.area_name}`);
      console.log(`Property: ${row.property_category}`);
      console.log(`Report Month: ${row.report_month}`);
      console.log(`HPI Index: ${row.hpi_index}`);
      console.log(`Benchmark Price: $${row.benchmark_price?.toLocaleString()}`);
      console.log('---');
    });
  } else {
    console.log('No data found for March 2024');
  }

  // Check for latest data
  const { data: latestData, error: latestError } = await supabase
    .from('market_hpi')
    .select('*')
    .ilike('area_name', '%clarington%')
    .ilike('property_category', '%detached%')
    .order('report_month', { ascending: false })
    .limit(5);

  console.log('\n\nLatest Data (Top 5 records):');
  console.log('-----------------------------');
  if (latestError) {
    console.error('Error:', latestError);
  } else if (latestData && latestData.length > 0) {
    latestData.forEach((row: any) => {
      console.log(`Area: ${row.area_name}`);
      console.log(`Property: ${row.property_category}`);
      console.log(`Report Month: ${row.report_month}`);
      console.log(`HPI Index: ${row.hpi_index}`);
      console.log(`Benchmark Price: $${row.benchmark_price?.toLocaleString()}`);
      console.log('---');
    });
  } else {
    console.log('No latest data found');
  }

  // Calculate what the appreciation should be
  if (marchData && marchData.length > 0 && latestData && latestData.length > 0) {
    // Make sure we're comparing Detached to Detached
    const marchDetached = marchData.find((r: any) => r.property_category === 'Detached');
    const latestDetached = latestData.find((r: any) => r.property_category === 'Detached');
    
    if (!marchDetached || !latestDetached) {
      console.log('\n⚠️  Could not find matching Detached data');
      return;
    }

    const purchaseHPI = marchDetached.hpi_index;
    const currentHPI = latestDetached.hpi_index;
    const purchaseBenchmark = marchDetached.benchmark_price;
    const currentBenchmark = latestDetached.benchmark_price;

    if (purchaseHPI && currentHPI) {
      const hpiAppreciation = currentHPI / purchaseHPI;
      console.log('\n\n📈 Appreciation Factor Analysis (DETACHED ONLY):');
      console.log('================================================');
      console.log(`HPI at Purchase (${marchDetached.report_month}): ${purchaseHPI}`);
      console.log(`HPI Current (${latestDetached.report_month}): ${currentHPI}`);
      console.log(`HPI-based Appreciation: ${hpiAppreciation.toFixed(4)}x (${((hpiAppreciation - 1) * 100).toFixed(1)}%)`);
    }

    if (purchaseBenchmark && currentBenchmark) {
      const benchmarkAppreciation = currentBenchmark / purchaseBenchmark;
      console.log(`\nBenchmark at Purchase: $${purchaseBenchmark.toLocaleString()}`);
      console.log(`Benchmark Current: $${currentBenchmark.toLocaleString()}`);
      console.log(`Benchmark-based Appreciation: ${benchmarkAppreciation.toFixed(4)}x (${((benchmarkAppreciation - 1) * 100).toFixed(1)}%)`);
    }

    // Test with purchase price of $900,000
    const purchasePrice = 900000;
    if (purchaseHPI && currentHPI) {
      const hpiValue = Math.round(purchasePrice * (currentHPI / purchaseHPI));
      const hpiEquity = hpiValue - purchasePrice;
      console.log(`\n💰 For $${purchasePrice.toLocaleString()} purchase price:`);
      console.log(`HPI-based Current Value: $${hpiValue.toLocaleString()}`);
      console.log(`HPI-based Equity: $${hpiEquity.toLocaleString()}`);
    }

    if (purchaseBenchmark && currentBenchmark) {
      const benchmarkValue = Math.round(purchasePrice * (currentBenchmark / purchaseBenchmark));
      const benchmarkEquity = benchmarkValue - purchasePrice;
      console.log(`\nBenchmark-based Current Value: $${benchmarkValue.toLocaleString()}`);
      console.log(`Benchmark-based Equity: $${benchmarkEquity.toLocaleString()}`);
    }
  }
}

checkClaringtonData().catch(console.error);
