import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDataQuality() {
  console.log('\n🔍 DATA QUALITY AUDIT\n');
  console.log('=====================\n');

  // 1. Check total records
  const { count } = await supabase
    .from('market_hpi')
    .select('*', { count: 'exact', head: true });

  console.log(`Total records in database: ${count}\n`);

  // 2. Check for records with missing data
  const { data: missingBenchmark } = await supabase
    .from('market_hpi')
    .select('report_month, area_name, property_category')
    .is('benchmark_price', null)
    .limit(10);

  console.log(`Records with missing benchmark_price: ${missingBenchmark?.length || 0}`);

  const { data: missingHPI } = await supabase
    .from('market_hpi')
    .select('report_month, area_name, property_category')
    .is('hpi_index', null)
    .limit(10);

  console.log(`Records with missing hpi_index: ${missingHPI?.length || 0}\n`);

  // 3. Sample 2024 data for major areas
  console.log('📊 SAMPLING 2024 DATA FOR VERIFICATION\n');
  console.log('(Compare these with TRREB reports to verify accuracy)\n');

  const areas = [
    'Toronto',
    'Mississauga', 
    'Brampton',
    'Clarington',
    'Oakville',
    'Markham'
  ];

  for (const area of areas) {
    const { data } = await supabase
      .from('market_hpi')
      .select('*')
      .eq('area_name', area)
      .eq('property_category', 'Detached')
      .eq('report_month', '2024-03')
      .single();

    if (data) {
      console.log(`${area} - Detached (March 2024):`);
      console.log(`  HPI: ${data.hpi_index}, Benchmark: $${data.benchmark_price?.toLocaleString()}`);
    } else {
      console.log(`${area} - No data found`);
    }
  }

  // 4. Check for suspicious patterns
  console.log('\n\n🚨 CHECKING FOR SUSPICIOUS PATTERNS\n');

  // Check if HPI and benchmark don't correlate properly
  const { data: recentData } = await supabase
    .from('market_hpi')
    .select('*')
    .gte('report_month', '2024-01')
    .order('report_month', { ascending: false })
    .limit(100);

  if (recentData) {
    // Group by area and check if HPI/benchmark ratios are consistent
    const ratios = new Map<string, number[]>();
    
    for (const record of recentData) {
      if (record.hpi_index && record.benchmark_price) {
        const key = `${record.area_name}-${record.property_category}`;
        const ratio = record.benchmark_price / record.hpi_index;
        
        if (!ratios.has(key)) {
          ratios.set(key, []);
        }
        ratios.get(key)!.push(ratio);
      }
    }

    // Find areas with high variance in HPI/benchmark ratio (might indicate errors)
    console.log('Areas with inconsistent HPI/Benchmark ratios:\n');
    let foundInconsistencies = false;

    for (const [key, values] of ratios.entries()) {
      if (values.length > 2) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const coeffVariation = (stdDev / avg) * 100;

        // If coefficient of variation > 5%, might be suspicious
        if (coeffVariation > 5) {
          console.log(`⚠️  ${key}: CV = ${coeffVariation.toFixed(1)}% (high variance)`);
          foundInconsistencies = true;
        }
      }
    }

    if (!foundInconsistencies) {
      console.log('✅ No major inconsistencies detected in HPI/Benchmark ratios');
    }
  }

  // 5. Check the import script to see how data was loaded
  console.log('\n\n📝 DATA SOURCE ANALYSIS\n');
  console.log('Checking how data was imported...\n');

  const { data: sampleRecords } = await supabase
    .from('market_hpi')
    .select('report_month, area_name, property_category, hpi_index, benchmark_price')
    .eq('report_month', '2025-12')
    .limit(5);

  console.log('Sample of most recent data (Dec 2025):');
  sampleRecords?.forEach(r => {
    console.log(`  ${r.area_name} ${r.property_category}: HPI=${r.hpi_index}, Price=$${r.benchmark_price?.toLocaleString()}`);
  });

  console.log('\n💡 RECOMMENDATION:\n');
  console.log('To verify data accuracy, you should:');
  console.log('1. Download the actual TRREB Market Watch PDFs for March 2024');
  console.log('2. Manually verify key data points (especially high-volume areas)');
  console.log('3. Check if the PDF extraction code has any parsing issues\n');
}

auditDataQuality().catch(console.error);
