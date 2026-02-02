import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkModernEra() {
  console.log('🏥 Checking Health of Modern Era (2012-2025)...\n');

  // Check Brampton Detached
  const { data: brampton } = await supabase
    .from('market_hpi')
    .select('report_month')
    .eq('area_name', 'Brampton')
    .eq('property_category', 'Detached')
    .gte('report_month', '2012-01')
    .lte('report_month', '2025-12')
    .order('report_month');

  if (!brampton) return;

  const months = brampton.map(r => r.report_month);
  const uniqueMonths = [...new Set(months)];
  
  console.log(`✅ Found ${uniqueMonths.length} months for Brampton Detached.`);
  console.log(`   Range: ${uniqueMonths[0]} to ${uniqueMonths[uniqueMonths.length-1]}`);

  // Gap Check
  let gaps = 0;
  let prev = new Date(uniqueMonths[0] + '-01');
  for (let i = 1; i < uniqueMonths.length; i++) {
    const curr = new Date(uniqueMonths[i] + '-01');
    const diff = (curr.getFullYear() - prev.getFullYear()) * 12 + (curr.getMonth() - prev.getMonth());
    if (diff > 1) {
      console.log(`   ⚠️ GAP: ${uniqueMonths[i-1]} -> ${uniqueMonths[i]}`);
      gaps++;
    }
    prev = curr;
  }

  if (gaps === 0) console.log('   ✨ No gaps found in Brampton!');

  // Check Condo
  const { count: condoCount } = await supabase
    .from('market_hpi')
    .select('*', { count: 'exact', head: true })
    .eq('property_category', 'Condo Apt')
    .gte('report_month', '2012-01');
    
  console.log(`\n✅ Total Condo records (2012+): ${condoCount}`);
}

checkModernEra();
