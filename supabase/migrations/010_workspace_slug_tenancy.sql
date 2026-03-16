-- Slug-based multi-tenant hardening for workspace-owned data.
-- Extends the existing workspace_memberships model instead of replacing it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE workspaces
SET name = COALESCE(NULLIF(name, ''), 'Workspace')
WHERE name IS NULL OR name = '';

UPDATE workspaces
SET slug = COALESCE(NULLIF(slug, ''), lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL OR slug = '';

WITH ranked_workspaces AS (
  SELECT
    id,
    slug,
    row_number() OVER (PARTITION BY slug ORDER BY created_at ASC, id ASC) AS slug_rank
  FROM workspaces
)
UPDATE workspaces
SET slug = CASE
  WHEN ranked_workspaces.slug_rank = 1 THEN ranked_workspaces.slug
  ELSE ranked_workspaces.slug || '-' || substring(workspaces.id::text, 1, 8)
END
FROM ranked_workspaces
WHERE ranked_workspaces.id = workspaces.id
  AND ranked_workspaces.slug IS NOT NULL
  AND ranked_workspaces.slug <> ''
  AND ranked_workspaces.slug_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug
  ON workspaces(slug);

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS brand JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'homeowner'
    CHECK (account_type IN ('homeowner', 'agent', 'owner')),
  ADD COLUMN IF NOT EXISTS default_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS workspace_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'agent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_id
  ON workspace_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace_id
  ON workspace_memberships(workspace_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'settings'
  ) THEN
    EXECUTE $sql$
      UPDATE workspaces
      SET brand = COALESCE(NULLIF(brand, '{}'::jsonb), settings, '{}'::jsonb)
      WHERE brand = '{}'::jsonb
    $sql$;
  ELSE
    UPDATE workspaces
    SET brand = COALESCE(NULLIF(brand, '{}'::jsonb), '{}'::jsonb)
    WHERE brand = '{}'::jsonb;
  END IF;
END $$;

DO $$
DECLARE
  workspace_members_kind "char";
BEGIN
  SELECT c.relkind
  INTO workspace_members_kind
  FROM pg_class c
  JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'workspace_members';

  IF workspace_members_kind IS NULL THEN
    EXECUTE $sql$
      CREATE VIEW workspace_members AS
      SELECT
        workspace_id,
        user_id,
        role,
        created_at
      FROM workspace_memberships
    $sql$;
  ELSIF workspace_members_kind = 'v' THEN
    EXECUTE $sql$
      CREATE OR REPLACE VIEW workspace_members AS
      SELECT
        workspace_id,
        user_id,
        role,
        created_at
      FROM workspace_memberships
    $sql$;
  END IF;
END $$;

DO $$
DECLARE
  target_email CONSTANT TEXT := 'daniel.phillippe27@gmail.com';
  target_user_id UUID := '259b3abd-de89-4b2e-9e12-249e084de897';
  phillippe_workspace_id UUID;
BEGIN
  IF target_user_id IS NULL THEN
    SELECT id
    INTO target_user_id
    FROM auth.users
    WHERE lower(email) = target_email
    LIMIT 1;
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target auth user % / % was not found.', target_email, '259b3abd-de89-4b2e-9e12-249e084de897';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'data_import_jobs'
  ) THEN
    SELECT workspace_id
    INTO phillippe_workspace_id
    FROM data_import_jobs
    GROUP BY workspace_id
    ORDER BY count(*) DESC, min(created_at) ASC
    LIMIT 1;
  END IF;

  IF phillippe_workspace_id IS NULL THEN
    SELECT id
    INTO phillippe_workspace_id
    FROM workspaces
    WHERE slug = 'phillippegroup'
    LIMIT 1;
  END IF;

  IF phillippe_workspace_id IS NULL THEN
    SELECT id
    INTO phillippe_workspace_id
    FROM workspaces
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF phillippe_workspace_id IS NULL THEN
    BEGIN
      INSERT INTO workspaces (slug, name, created_by, brand)
      VALUES (
        'phillippegroup',
        'Phillippe Group',
        target_user_id,
        jsonb_build_object(
          'logoUrl', null,
          'primaryColor', '#22d3ee',
          'accentColor', '#0f172a',
          'tagline', 'Track your specific home''s market performance using benchmark data.',
          'ctaText', 'See My Home Equity'
        )
      )
      RETURNING id INTO phillippe_workspace_id;
    EXCEPTION
      WHEN foreign_key_violation THEN
        INSERT INTO workspaces (slug, name, created_by, brand)
        VALUES (
          'phillippegroup',
          'Phillippe Group',
          NULL,
          jsonb_build_object(
            'logoUrl', null,
            'primaryColor', '#22d3ee',
            'accentColor', '#0f172a',
            'tagline', 'Track your specific home''s market performance using benchmark data.',
            'ctaText', 'See My Home Equity'
          )
        )
        RETURNING id INTO phillippe_workspace_id;
    END;
  ELSE
    BEGIN
      UPDATE workspaces
      SET
        name = 'Phillippe Group',
        slug = 'phillippegroup',
        created_by = target_user_id,
        brand = COALESCE(workspaces.brand, '{}'::jsonb) || jsonb_build_object(
          'logoUrl', null,
          'primaryColor', '#22d3ee',
          'accentColor', '#0f172a',
          'tagline', 'Track your specific home''s market performance using benchmark data.',
          'ctaText', 'See My Home Equity'
        )
      WHERE id = phillippe_workspace_id;
    EXCEPTION
      WHEN foreign_key_violation THEN
        UPDATE workspaces
        SET
          name = 'Phillippe Group',
          slug = 'phillippegroup',
          created_by = NULL,
          brand = COALESCE(workspaces.brand, '{}'::jsonb) || jsonb_build_object(
            'logoUrl', null,
            'primaryColor', '#22d3ee',
            'accentColor', '#0f172a',
            'tagline', 'Track your specific home''s market performance using benchmark data.',
            'ctaText', 'See My Home Equity'
          )
        WHERE id = phillippe_workspace_id;
    END;
  END IF;

  INSERT INTO profiles (id, email, name, property_data, account_type, default_workspace_id)
  VALUES (
    target_user_id,
    target_email,
    'Daniel Phillippe',
    '{}'::jsonb,
    'owner',
    phillippe_workspace_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(profiles.name, ''), EXCLUDED.name),
    account_type = 'owner',
    default_workspace_id = phillippe_workspace_id;

  BEGIN
    UPDATE workspaces
    SET created_by = target_user_id
    WHERE id = phillippe_workspace_id;
  EXCEPTION
    WHEN foreign_key_violation THEN
      UPDATE workspaces
      SET created_by = NULL
      WHERE id = phillippe_workspace_id;
  END;

  UPDATE data_import_jobs
  SET
    workspace_id = phillippe_workspace_id,
    uploaded_by_user_id = target_user_id
  WHERE workspace_id <> phillippe_workspace_id
     OR uploaded_by_user_id IS DISTINCT FROM target_user_id;

  UPDATE agent_clients
  SET
    workspace_id = phillippe_workspace_id,
    created_by_user_id = target_user_id
  WHERE workspace_id <> phillippe_workspace_id
     OR created_by_user_id IS DISTINCT FROM target_user_id;

  UPDATE billing_customers
  SET workspace_id = phillippe_workspace_id
  WHERE workspace_id <> phillippe_workspace_id;

  UPDATE billing_subscriptions
  SET workspace_id = phillippe_workspace_id
  WHERE workspace_id <> phillippe_workspace_id;

  UPDATE profiles
  SET default_workspace_id = NULL
  WHERE id <> target_user_id;

  DELETE FROM workspace_memberships
  WHERE workspace_id <> phillippe_workspace_id
     OR user_id <> target_user_id;

  INSERT INTO workspace_memberships (workspace_id, user_id, role)
  VALUES (phillippe_workspace_id, target_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE workspace_memberships
  SET role = 'owner'
  WHERE workspace_id = phillippe_workspace_id
    AND user_id = target_user_id;

  DELETE FROM workspaces
  WHERE id <> phillippe_workspace_id;
END $$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_memberships membership
    WHERE membership.workspace_id = target_workspace_id
      AND membership.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_memberships membership
    WHERE membership.workspace_id = target_workspace_id
      AND membership.user_id = auth.uid()
      AND membership.role = 'owner'
  );
$$;

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE cma_requests
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE market_hpi
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE market_watch_monthly
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE trreb_historic_annual
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

DO $$
DECLARE
  target_email CONSTANT TEXT := 'daniel.phillippe27@gmail.com';
  target_user_id UUID := '259b3abd-de89-4b2e-9e12-249e084de897';
  phillippe_workspace_id UUID;
BEGIN
  IF target_user_id IS NULL THEN
    SELECT id
    INTO target_user_id
    FROM auth.users
    WHERE lower(email) = target_email
    LIMIT 1;
  END IF;

  SELECT id
  INTO phillippe_workspace_id
  FROM workspaces
  WHERE slug = 'phillippegroup'
  LIMIT 1;

  UPDATE estimates
  SET workspace_id = phillippe_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE subscribers
  SET workspace_id = phillippe_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE subscribers
  SET profile_id = target_user_id
  WHERE lower(email) = target_email
    AND (profile_id IS NULL OR profile_id <> target_user_id);

  UPDATE cma_requests
  SET workspace_id = phillippe_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE market_hpi
  SET workspace_id = phillippe_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE market_watch_monthly
  SET workspace_id = phillippe_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE trreb_historic_annual
  SET workspace_id = phillippe_workspace_id
  WHERE workspace_id IS NULL;
END $$;

ALTER TABLE market_hpi
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE market_watch_monthly
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE trreb_historic_annual
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE trreb_historic_annual
  DROP CONSTRAINT IF EXISTS trreb_historic_annual_pkey;

ALTER TABLE trreb_historic_annual
  ADD CONSTRAINT trreb_historic_annual_pkey PRIMARY KEY (id);

DROP INDEX IF EXISTS idx_market_hpi_area_property_period;
DROP INDEX IF EXISTS idx_market_watch_monthly_area_property_period;

ALTER TABLE market_hpi
  DROP CONSTRAINT IF EXISTS market_hpi_unique;

ALTER TABLE market_watch_monthly
  DROP CONSTRAINT IF EXISTS market_watch_monthly_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_hpi_workspace_period_area_property
  ON market_hpi(workspace_id, period, area_id, property_type_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_watch_workspace_period_area_property
  ON market_watch_monthly(workspace_id, period, area_id, property_type_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_historic_workspace_year
  ON trreb_historic_annual(workspace_id, report_year);

CREATE INDEX IF NOT EXISTS idx_estimates_workspace_id
  ON estimates(workspace_id);

CREATE INDEX IF NOT EXISTS idx_subscribers_workspace_id
  ON subscribers(workspace_id);

CREATE INDEX IF NOT EXISTS idx_cma_requests_workspace_id
  ON cma_requests(workspace_id);

CREATE INDEX IF NOT EXISTS idx_market_hpi_workspace_period_desc
  ON market_hpi(workspace_id, period DESC);

CREATE INDEX IF NOT EXISTS idx_market_watch_workspace_period_desc
  ON market_watch_monthly(workspace_id, period DESC);

DROP INDEX IF EXISTS idx_subscribers_email;

ALTER TABLE subscribers
  DROP CONSTRAINT IF EXISTS unique_active_email;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_workspace_email
  ON subscribers(workspace_id, lower(email));

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agent_clients(id) ON DELETE SET NULL,
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Equity Report',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (public_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_workspace_id
  ON reports(workspace_id);

CREATE OR REPLACE FUNCTION public.get_published_report(report_public_id UUID)
RETURNS TABLE (
  public_id UUID,
  title TEXT,
  snapshot JSONB,
  published_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    reports.public_id,
    reports.title,
    reports.snapshot,
    reports.published_at
  FROM reports
  WHERE reports.public_id = report_public_id
    AND reports.published = true;
$$;

ALTER TABLE market_hpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_watch_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE trreb_historic_annual ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON market_hpi;
DROP POLICY IF EXISTS "Service role write access" ON market_hpi;
DROP POLICY IF EXISTS "Public read access" ON market_watch_monthly;
DROP POLICY IF EXISTS "Service role write access" ON market_watch_monthly;
DROP POLICY IF EXISTS "Public read access" ON trreb_historic_annual;
DROP POLICY IF EXISTS "Service role write access" ON trreb_historic_annual;

DROP POLICY IF EXISTS "Workspace members can read workspace market_hpi" ON market_hpi;
CREATE POLICY "Workspace members can read workspace market_hpi"
  ON market_hpi FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can manage workspace market_hpi" ON market_hpi;
CREATE POLICY "Workspace members can manage workspace market_hpi"
  ON market_hpi FOR ALL
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can read workspace market_watch_monthly" ON market_watch_monthly;
CREATE POLICY "Workspace members can read workspace market_watch_monthly"
  ON market_watch_monthly FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can manage workspace market_watch_monthly" ON market_watch_monthly;
CREATE POLICY "Workspace members can manage workspace market_watch_monthly"
  ON market_watch_monthly FOR ALL
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can read workspace trreb_historic_annual" ON trreb_historic_annual;
CREATE POLICY "Workspace members can read workspace trreb_historic_annual"
  ON trreb_historic_annual FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can manage workspace trreb_historic_annual" ON trreb_historic_annual;
CREATE POLICY "Workspace members can manage workspace trreb_historic_annual"
  ON trreb_historic_annual FOR ALL
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can read reports" ON reports;
CREATE POLICY "Workspace members can read reports"
  ON reports FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can manage reports" ON reports;
CREATE POLICY "Workspace members can manage reports"
  ON reports FOR ALL
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Tighten direct table access for public-facing records.
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cma_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow reading estimates" ON estimates;
DROP POLICY IF EXISTS "Allow estimate creation" ON estimates;
DROP POLICY IF EXISTS "Allow public subscribe" ON subscribers;
DROP POLICY IF EXISTS "Allow read by email match" ON subscribers;
DROP POLICY IF EXISTS "Allow unsubscribe update" ON subscribers;
DROP POLICY IF EXISTS "Allow CMA request creation" ON cma_requests;
DROP POLICY IF EXISTS "Allow reading CMA requests" ON cma_requests;

DROP POLICY IF EXISTS "Workspace members can read estimates" ON estimates;
CREATE POLICY "Workspace members can read estimates"
  ON estimates FOR SELECT
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can read subscribers" ON subscribers;
CREATE POLICY "Workspace members can read subscribers"
  ON subscribers FOR SELECT
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can read cma_requests" ON cma_requests;
CREATE POLICY "Workspace members can read cma_requests"
  ON cma_requests FOR SELECT
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
