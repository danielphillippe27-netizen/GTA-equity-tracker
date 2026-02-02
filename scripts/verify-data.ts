import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Checking Market History for "Brampton" (Detached)...\n');

  const { data, error } = await supabase
    .from('market_hpi')
    .select('*')
    .eq('area_name', 'Brampton')
    .eq('property_category', 'Detached')
    .in('report_month', ['1999-12', '2010-12', '2020-12', '2024-12']) // Check a few key points
    .order('report_month', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.table(data);
}

checkData();
