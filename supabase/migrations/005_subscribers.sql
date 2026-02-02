-- Subscribers Migration
-- Simple email collection for monthly equity reports (no auth required)
-- Profiles table kept separate for future upgrade path (HELOCs, 2nd mortgages, etc.)

-- Subscribers table - simple email collection (entry point)
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  
  -- Property data from the estimate form
  property_data JSONB DEFAULT '{}'::jsonb,
  
  -- Link to their estimate result
  estimate_id UUID,
  
  -- Optional link to profile (for users who upgrade to track HELOCs, 2nd mortgages, etc.)
  -- No FK constraint - profiles may not exist yet, we link by email when needed
  profile_id UUID,
  
  -- Email preferences
  monthly_reports BOOLEAN DEFAULT true,
  market_alerts BOOLEAN DEFAULT true,
  
  -- Tracking
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  last_report_sent TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Ensure unique email per active subscriber
  CONSTRAINT unique_active_email UNIQUE (email) 
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);

-- Index for finding subscribers due for reports
CREATE INDEX IF NOT EXISTS idx_subscribers_monthly 
  ON subscribers(last_report_sent) 
  WHERE monthly_reports = true AND unsubscribed_at IS NULL;

-- Enable RLS (but allow public inserts for signup)
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (insert)
CREATE POLICY "Allow public subscribe"
  ON subscribers FOR INSERT
  WITH CHECK (true);

-- Allow reading own subscription by email (for unsubscribe flow)
CREATE POLICY "Allow read by email match"
  ON subscribers FOR SELECT
  USING (true);  -- We'll handle email verification in app logic

-- Allow update for unsubscribe
CREATE POLICY "Allow unsubscribe update"
  ON subscribers FOR UPDATE
  USING (true);  -- We'll verify email in app logic

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
