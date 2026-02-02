import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Construct connection string using the project ref from the URL and the password found in env
// URL: https://dnakivdnoejebtidsfjg.supabase.co
// Ref: dnakivdnoejebtidsfjg
const projectRef = 'dnakivdnoejebtidsfjg';
const dbPassword = 'MEGS1989MEGS';
const connectionString = `postgres://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false } // Supabase requires SSL
});

const createTableSQL = `
  CREATE TABLE IF NOT EXISTS market_hpi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_month TEXT NOT NULL,
    area_name TEXT NOT NULL,
    property_category TEXT NOT NULL,
    hpi_index NUMERIC,
    benchmark_price NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_hpi_entry UNIQUE (report_month, area_name, property_category)
  );

  ALTER TABLE market_hpi ENABLE ROW LEVEL SECURITY;
  
  -- Policies to ensure we can read/write
  DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access') THEN
      CREATE POLICY "Public read access" ON market_hpi FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role write access') THEN
      CREATE POLICY "Service role write access" ON market_hpi USING (true) WITH CHECK (true);
    END IF;
  END $$;
`;

async function run() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected. Creating table...');
    await client.query(createTableSQL);
    console.log('✅ Table market_hpi created successfully.');
  } catch (err) {
    console.error('❌ Error creating table:', err);
  } finally {
    await client.end();
  }
}

run();
