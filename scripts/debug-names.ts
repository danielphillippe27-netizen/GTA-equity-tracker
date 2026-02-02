import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNames() {
  // Get all area names from Dec 1999
  const { data, error } = await supabase
    .from('market_hpi')
    .select('area_name')
    .eq('report_month', '1999-12')
    .limit(20);

  if (error) { console.error(error); return; }
  
  console.log("Area Names in Dec 1999:", data?.map(d => d.area_name));
}

checkNames();
