import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanDatabase() {
  console.log('🧹 Cleaning up bad data...');

  // Delete rows with suspicious keywords in area_name
  const badKeywords = [
    'growth', 'quarter', 'market', 'sales', 'average', 'price', 
    'year', 'month', 'total', 'change', 'benchmark', 'index',
    'continued', 'reported', 'system', 'board'
  ];

  // Also delete suspiciously long names (sentences)
  // TRREB Area names are usually short: "Brampton", "Toronto W01", "Whitchurch-Stouffville"
  
  let deletedCount = 0;

  // 1. Keyword Purge
  for (const word of badKeywords) {
    const { count } = await supabase
      .from('market_hpi')
      .delete({ count: 'exact' })
      .ilike('area_name', `%${word}%`);
    
    if (count && count > 0) {
      console.log(`   - Removed ${count} rows containing "${word}"`);
      deletedCount += count || 0;
    }
  }

  // 2. Length Purge (> 30 chars is suspicious for an area name)
  // Using a raw filter because supabase-js doesn't have a simple length filter method
  // We'll select, check, and delete by ID.
  const { data: longNames } = await supabase
    .from('market_hpi')
    .select('id, area_name')
    .gt('hpi_index', 1000) // Also HPI > 1000 is suspicious (usually < 500)
    .limit(1000);

  if (longNames && longNames.length > 0) {
    const ids = longNames.map(r => r.id);
    const { count } = await supabase
      .from('market_hpi')
      .delete({ count: 'exact' })
      .in('id', ids);
      
    console.log(`   - Removed ${count} rows with suspicious HPI values (>1000)`);
    deletedCount += count || 0;
  }

  console.log(`✅ Cleanup complete. Removed ~${deletedCount} bad rows.`);
}

cleanDatabase();
