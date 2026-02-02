-- Market HPI (Home Price Index) Table
-- Stores historical HPI data by region and property type

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
CREATE POLICY "Public read access" ON market_hpi FOR SELECT USING (true);
CREATE POLICY "Service role write access" ON market_hpi USING (true) WITH CHECK (true);
