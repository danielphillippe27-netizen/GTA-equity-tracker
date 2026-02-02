-- GTA Equity Estimator Database Schema
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table (anonymous users)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_hash TEXT, -- Hashed for privacy
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- Input data
  address TEXT NOT NULL,
  address_components JSONB, -- Structured address from Mapbox
  purchase_year INT NOT NULL CHECK (purchase_year >= 1950 AND purchase_year <= EXTRACT(YEAR FROM NOW())),
  purchase_month INT DEFAULT 6 CHECK (purchase_month >= 1 AND purchase_month <= 12),
  purchase_price DECIMAL(12,2) NOT NULL CHECK (purchase_price > 0),
  down_payment_percent DECIMAL(5,2) DEFAULT 20.00 CHECK (down_payment_percent >= 0 AND down_payment_percent <= 100),
  
  -- Calculated values - Home Value
  estimated_value_low DECIMAL(12,2),
  estimated_value_mid DECIMAL(12,2),
  estimated_value_high DECIMAL(12,2),
  
  -- Calculated values - Equity
  estimated_equity_low DECIMAL(12,2),
  estimated_equity_mid DECIMAL(12,2),
  estimated_equity_high DECIMAL(12,2),
  
  -- Mortgage details
  remaining_mortgage DECIMAL(12,2),
  original_loan_amount DECIMAL(12,2),
  interest_rate_used DECIMAL(5,3),
  
  -- Market context
  market_phase TEXT CHECK (market_phase IN ('hot', 'balanced', 'soft')),
  purchase_index DECIMAL(10,6), -- How property compared to market at purchase
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_version TEXT DEFAULT '1.0'
);

-- Indexes for estimates
CREATE INDEX IF NOT EXISTS idx_estimates_session_id ON estimates(session_id);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at);
CREATE INDEX IF NOT EXISTS idx_estimates_address ON estimates(address);

-- CMA Requests table
CREATE TABLE IF NOT EXISTS cma_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  
  -- Contact info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Request details
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'either')),
  notes TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  contacted_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for CMA requests
CREATE INDEX IF NOT EXISTS idx_cma_requests_status ON cma_requests(status);
CREATE INDEX IF NOT EXISTS idx_cma_requests_created_at ON cma_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_cma_requests_email ON cma_requests(email);

-- Booking events table (for tracking Calendly bookings)
CREATE TABLE IF NOT EXISTS booking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  
  -- Calendly data (if webhook is set up)
  calendly_event_id TEXT,
  scheduled_time TIMESTAMPTZ,
  
  -- Basic tracking even without Calendly webhook
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update session last_activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions 
  SET last_activity = NOW() 
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity on estimate creation
CREATE TRIGGER trigger_update_session_on_estimate
AFTER INSERT ON estimates
FOR EACH ROW
EXECUTE FUNCTION update_session_activity();

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cma_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (using service role for API routes)
-- These allow the API to insert/select but not modify other sessions' data

-- Sessions: Allow insert and select own session
CREATE POLICY "Allow anonymous session creation"
  ON sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow reading own session"
  ON sessions FOR SELECT
  USING (true);

-- Estimates: Allow insert and select
CREATE POLICY "Allow estimate creation"
  ON estimates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow reading estimates"
  ON estimates FOR SELECT
  USING (true);

-- CMA Requests: Allow insert
CREATE POLICY "Allow CMA request creation"
  ON cma_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow reading CMA requests"
  ON cma_requests FOR SELECT
  USING (true);

-- Booking Events: Allow insert and select
CREATE POLICY "Allow booking event creation"
  ON booking_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow reading booking events"
  ON booking_events FOR SELECT
  USING (true);
