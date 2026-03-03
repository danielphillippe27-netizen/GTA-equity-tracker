-- ============================================================================
-- COMPLETE SCHEMA REFRESH FOR GTA EQUITY TRACKER
-- Run this in Supabase SQL Editor to set up all tables
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SESSIONS TABLE (Anonymous user tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- ============================================================================
-- 2. ESTIMATES TABLE (Equity calculation results)
-- ============================================================================
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  address_components JSONB,
  purchase_year INT NOT NULL CHECK (purchase_year >= 1950 AND purchase_year <= EXTRACT(YEAR FROM NOW())),
  purchase_month INT DEFAULT 6 CHECK (purchase_month >= 1 AND purchase_month <= 12),
  purchase_price DECIMAL(12,2) NOT NULL CHECK (purchase_price > 0),
  down_payment_percent DECIMAL(5,2) DEFAULT 20.00 CHECK (down_payment_percent >= 0 AND down_payment_percent <= 100),
  estimated_value_low DECIMAL(12,2),
  estimated_value_mid DECIMAL(12,2),
  estimated_value_high DECIMAL(12,2),
  estimated_equity_low DECIMAL(12,2),
  estimated_equity_mid DECIMAL(12,2),
  estimated_equity_high DECIMAL(12,2),
  remaining_mortgage DECIMAL(12,2),
  original_loan_amount DECIMAL(12,2),
  interest_rate_used DECIMAL(5,3),
  market_phase TEXT CHECK (market_phase IN ('hot', 'balanced', 'soft')),
  purchase_index DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_version TEXT DEFAULT '1.0'
);
CREATE INDEX IF NOT EXISTS idx_estimates_session_id ON estimates(session_id);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at);
CREATE INDEX IF NOT EXISTS idx_estimates_address ON estimates(address);

-- ============================================================================
-- 3. MARKET HPI TABLE (Home Price Index data)
-- ============================================================================
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

-- ============================================================================
-- 4. CMA REQUESTS TABLE (Comparative Market Analysis requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cma_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'either')),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cma_requests_status ON cma_requests(status);
CREATE INDEX IF NOT EXISTS idx_cma_requests_created_at ON cma_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_cma_requests_email ON cma_requests(email);

-- ============================================================================
-- 5. BOOKING EVENTS TABLE (Calendly booking tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  calendly_event_id TEXT,
  scheduled_time TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. SUBSCRIBERS TABLE (Email subscription for monthly reports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  property_data JSONB DEFAULT '{}'::jsonb,
  estimate_id UUID,
  profile_id UUID,
  monthly_reports BOOLEAN DEFAULT true,
  market_alerts BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  last_report_sent TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_monthly 
  ON subscribers(last_report_sent) 
  WHERE monthly_reports = true AND unsubscribed_at IS NULL;

-- ============================================================================
-- 7. PROFILES TABLE (Auth-linked user profiles for dashboard)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  property_data JSONB DEFAULT '{}'::jsonb,
  primary_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update session last_activity when new estimate is created
CREATE OR REPLACE FUNCTION update_session_activity_tracker()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions SET last_activity = NOW() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_on_estimate ON estimates;
CREATE TRIGGER trigger_update_session_on_estimate
AFTER INSERT ON estimates
FOR EACH ROW EXECUTE PROCEDURE update_session_activity_tracker();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get subscribers due for monthly report
CREATE OR REPLACE FUNCTION get_subscribers_due_for_report()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  property_data JSONB,
  estimate_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.email,
    s.name,
    s.property_data,
    s.estimate_id
  FROM subscribers s
  WHERE s.monthly_reports = true
    AND s.unsubscribed_at IS NULL
    AND (
      s.last_report_sent IS NULL 
      OR s.last_report_sent < NOW() - INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_hpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE cma_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Sessions policies
DROP POLICY IF EXISTS "Allow anonymous session creation" ON sessions;
CREATE POLICY "Allow anonymous session creation" ON sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow reading own session" ON sessions;
CREATE POLICY "Allow reading own session" ON sessions FOR SELECT USING (true);

-- Estimates policies
DROP POLICY IF EXISTS "Allow estimate creation" ON estimates;
CREATE POLICY "Allow estimate creation" ON estimates FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow reading estimates" ON estimates;
CREATE POLICY "Allow reading estimates" ON estimates FOR SELECT USING (true);

-- Market HPI policies
DROP POLICY IF EXISTS "Public read access" ON market_hpi;
CREATE POLICY "Public read access" ON market_hpi FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role write access" ON market_hpi;
CREATE POLICY "Service role write access" ON market_hpi USING (true) WITH CHECK (true);

-- CMA requests policies
DROP POLICY IF EXISTS "Allow CMA request creation" ON cma_requests;
CREATE POLICY "Allow CMA request creation" ON cma_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow reading CMA requests" ON cma_requests;
CREATE POLICY "Allow reading CMA requests" ON cma_requests FOR SELECT USING (true);

-- Booking events policies
DROP POLICY IF EXISTS "Allow booking event creation" ON booking_events;
CREATE POLICY "Allow booking event creation" ON booking_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow reading booking events" ON booking_events;
CREATE POLICY "Allow reading booking events" ON booking_events FOR SELECT USING (true);

-- Subscribers policies
DROP POLICY IF EXISTS "Allow public subscribe" ON subscribers;
CREATE POLICY "Allow public subscribe" ON subscribers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow read by email match" ON subscribers;
CREATE POLICY "Allow read by email match" ON subscribers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow unsubscribe update" ON subscribers;
CREATE POLICY "Allow unsubscribe update" ON subscribers FOR UPDATE USING (true);

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Allow profile creation on signup" ON profiles;
CREATE POLICY "Allow profile creation on signup" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- DONE! Schema is ready to use.
-- ============================================================================
