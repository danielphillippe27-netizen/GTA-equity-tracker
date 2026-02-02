import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkGaps() {
  console.log('📊 Checking for missing months (Brampton)...');

  const { data, error } = await supabase
    .from('market_hpi')
    .select('report_month')
    .in('area_name', ['Brampton', 'W23', 'W24']) // Modern + Historic codes
    .eq('property_category', 'Detached')
    .order('report_month');

  if (error || !data) { console.error(error); return; }

  const months = data.map(r => r.report_month);
  const uniqueMonths = [...new Set(months)];

  console.log(`Found ${uniqueMonths.length} valid months for Brampton.`);
  console.log(`Range: ${uniqueMonths[0]} to ${uniqueMonths[uniqueMonths.length - 1]}`);

  // Check for gaps
  if (uniqueMonths.length > 0) {
    let prev = new Date(uniqueMonths[0] + '-01');
    for (let i = 1; i < uniqueMonths.length; i++) {
      const curr = new Date(uniqueMonths[i] + '-01');
      const diffMonths = (curr.getFullYear() - prev.getFullYear()) * 12 + (curr.getMonth() - prev.getMonth());
      
      if (diffMonths > 1) {
        console.log(`⚠️ Gap found: ${diffMonths - 1} missing month(s) between ${uniqueMonths[i-1]} and ${uniqueMonths[i]}`);
      }
      prev = curr;
    }
  }
}

checkGaps();
