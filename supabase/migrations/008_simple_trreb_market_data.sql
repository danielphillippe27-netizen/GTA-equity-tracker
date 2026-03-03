-- Replace the mixed legacy market_hpi dataset with strict archive-backed tables.
-- market_hpi becomes HPI-only and keyed by taxonomy IDs.
-- market_watch_monthly stores normalized monthly market-pulse metrics.
-- trreb_historic_annual stores the small TRREB-wide annual series.

DROP POLICY IF EXISTS "Public read access" ON market_hpi;
DROP POLICY IF EXISTS "Service role write access" ON market_hpi;

DROP TABLE IF EXISTS market_watch_monthly;
DROP TABLE IF EXISTS trreb_market_watch_summary_monthly;
DROP TABLE IF EXISTS trreb_market_watch_home_type_monthly;

DROP TABLE IF EXISTS market_hpi;

CREATE TABLE market_hpi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period DATE NOT NULL,
  area_id TEXT NOT NULL REFERENCES trreb_area_taxonomy(id),
  property_type_id TEXT NOT NULL REFERENCES trreb_property_type_taxonomy(id),
  hpi_index NUMERIC NOT NULL,
  benchmark_price NUMERIC NOT NULL,
  source_doc_id TEXT,
  source_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT market_hpi_unique UNIQUE (period, area_id, property_type_id)
);

CREATE INDEX idx_market_hpi_period
  ON market_hpi(period DESC);

CREATE INDEX idx_market_hpi_area_property_period
  ON market_hpi(area_id, property_type_id, period DESC);

CREATE TABLE market_watch_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period DATE NOT NULL,
  area_id TEXT NOT NULL REFERENCES trreb_area_taxonomy(id),
  property_type_id TEXT NOT NULL REFERENCES trreb_property_type_taxonomy(id),
  sales INTEGER,
  new_listings INTEGER,
  active_listings INTEGER,
  avg_sold_price NUMERIC,
  dom NUMERIC,
  snlr NUMERIC,
  moi NUMERIC,
  source_doc_id TEXT,
  source_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT market_watch_monthly_unique UNIQUE (period, area_id, property_type_id)
);

CREATE INDEX idx_market_watch_monthly_period
  ON market_watch_monthly(period DESC);

CREATE INDEX idx_market_watch_monthly_area_property_period
  ON market_watch_monthly(area_id, property_type_id, period DESC);

CREATE TABLE IF NOT EXISTS trreb_historic_annual (
  report_year INTEGER PRIMARY KEY,
  sales INTEGER NOT NULL,
  avg_price NUMERIC NOT NULL,
  source_doc_id TEXT,
  source_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE market_hpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_watch_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE trreb_historic_annual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON market_hpi
  FOR SELECT
  USING (true);

CREATE POLICY "Service role write access"
  ON market_hpi
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access"
  ON market_watch_monthly
  FOR SELECT
  USING (true);

CREATE POLICY "Service role write access"
  ON market_watch_monthly
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access" ON trreb_historic_annual;
CREATE POLICY "Public read access"
  ON trreb_historic_annual
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role write access" ON trreb_historic_annual;
CREATE POLICY "Service role write access"
  ON trreb_historic_annual
  USING (true)
  WITH CHECK (true);
