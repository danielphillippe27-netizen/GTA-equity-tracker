import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { getLookupKeys } from '../lib/district-mapping';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testPickering() {
  const target = 'Pickering';
  const lookupKeys = getLookupKeys(target);
  
  console.log(`\n🎯 Searching for "${target}" using keys:`, lookupKeys);
  
  const { data, error } = await supabase
    .from('market_hpi')
    .select('report_month, area_name, property_category, benchmark_price')
    .in('area_name', lookupKeys)
    .eq('property_category', 'Detached')
    .in('report_month', ['1999-12', '2015-12', '2024-12']) // Check 3 eras
    .order('report_month');

  if (error) { console.error(error); return; }

  console.table(data);
}

testPickering();
