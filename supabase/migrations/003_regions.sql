-- Regions and Communities Table
-- Stores GTA regions and their communities based on TRREB Market Watch

CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name TEXT NOT NULL,
  community_name TEXT NOT NULL,
  community_code TEXT, -- For Toronto municipal codes (W01, C01, E01, etc.)
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_community UNIQUE (region_name, community_name)
);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_regions_region_name ON regions(region_name);
CREATE INDEX IF NOT EXISTS idx_regions_community_name ON regions(community_name);

-- Enable RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON regions FOR SELECT USING (true);

-- Insert communities by region (Durham first as requested)

-- 1. Durham Region
INSERT INTO regions (region_name, community_name, display_order) VALUES
('Durham Region', 'Ajax', 1),
('Durham Region', 'Brock', 2),
('Durham Region', 'Clarington', 3),
('Durham Region', 'Oshawa', 4),
('Durham Region', 'Pickering', 5),
('Durham Region', 'Scugog', 6),
('Durham Region', 'Uxbridge', 7),
('Durham Region', 'Whitby', 8);

-- 2. Halton Region
INSERT INTO regions (region_name, community_name, display_order) VALUES
('Halton Region', 'Burlington', 1),
('Halton Region', 'Halton Hills', 2),
('Halton Region', 'Milton', 3),
('Halton Region', 'Oakville', 4);

-- 3. Peel Region
INSERT INTO regions (region_name, community_name, display_order) VALUES
('Peel Region', 'Brampton', 1),
('Peel Region', 'Caledon', 2),
('Peel Region', 'Mississauga', 3);

-- 4. City of Toronto - West
INSERT INTO regions (region_name, community_name, community_code, display_order) VALUES
('Toronto West', 'Toronto W01', 'W01', 1),
('Toronto West', 'Toronto W02', 'W02', 2),
('Toronto West', 'Toronto W03', 'W03', 3),
('Toronto West', 'Toronto W04', 'W04', 4),
('Toronto West', 'Toronto W05', 'W05', 5),
('Toronto West', 'Toronto W06', 'W06', 6),
('Toronto West', 'Toronto W07', 'W07', 7),
('Toronto West', 'Toronto W08', 'W08', 8),
('Toronto West', 'Toronto W09', 'W09', 9),
('Toronto West', 'Toronto W10', 'W10', 10);

-- 4. City of Toronto - Central
INSERT INTO regions (region_name, community_name, community_code, display_order) VALUES
('Toronto Central', 'Toronto C01', 'C01', 1),
('Toronto Central', 'Toronto C02', 'C02', 2),
('Toronto Central', 'Toronto C03', 'C03', 3),
('Toronto Central', 'Toronto C04', 'C04', 4),
('Toronto Central', 'Toronto C06', 'C06', 5),
('Toronto Central', 'Toronto C07', 'C07', 6),
('Toronto Central', 'Toronto C08', 'C08', 7),
('Toronto Central', 'Toronto C09', 'C09', 8),
('Toronto Central', 'Toronto C10', 'C10', 9),
('Toronto Central', 'Toronto C11', 'C11', 10),
('Toronto Central', 'Toronto C12', 'C12', 11),
('Toronto Central', 'Toronto C13', 'C13', 12),
('Toronto Central', 'Toronto C14', 'C14', 13),
('Toronto Central', 'Toronto C15', 'C15', 14);

-- 4. City of Toronto - East
INSERT INTO regions (region_name, community_name, community_code, display_order) VALUES
('Toronto East', 'Toronto E01', 'E01', 1),
('Toronto East', 'Toronto E02', 'E02', 2),
('Toronto East', 'Toronto E03', 'E03', 3),
('Toronto East', 'Toronto E04', 'E04', 4),
('Toronto East', 'Toronto E05', 'E05', 5),
('Toronto East', 'Toronto E06', 'E06', 6),
('Toronto East', 'Toronto E07', 'E07', 7),
('Toronto East', 'Toronto E08', 'E08', 8),
('Toronto East', 'Toronto E09', 'E09', 9),
('Toronto East', 'Toronto E10', 'E10', 10),
('Toronto East', 'Toronto E11', 'E11', 11);

-- 5. York Region
INSERT INTO regions (region_name, community_name, display_order) VALUES
('York Region', 'Aurora', 1),
('York Region', 'East Gwillimbury', 2),
('York Region', 'Georgina', 3),
('York Region', 'King', 4),
('York Region', 'Markham', 5),
('York Region', 'Newmarket', 6),
('York Region', 'Richmond Hill', 7),
('York Region', 'Vaughan', 8),
('York Region', 'Whitchurch-Stouffville', 9);

-- 6. Dufferin County
INSERT INTO regions (region_name, community_name, display_order) VALUES
('Dufferin County', 'Orangeville', 1);

-- 7. Simcoe County
INSERT INTO regions (region_name, community_name, display_order) VALUES
('Simcoe County', 'Adjala-Tosorontio', 1),
('Simcoe County', 'Bradford West Gwillimbury', 2),
('Simcoe County', 'Essa', 3),
('Simcoe County', 'Innisfil', 4),
('Simcoe County', 'New Tecumseth', 5);
