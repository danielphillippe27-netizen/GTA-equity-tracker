-- Platform workspaces, billing, and agent client management

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

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

CREATE TABLE IF NOT EXISTS agent_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'active', 'paused', 'archived')),
  tags JSONB DEFAULT '[]'::jsonb,
  property_data JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_clients_workspace_id
  ON agent_clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_clients_email
  ON agent_clients(email);

CREATE TABLE IF NOT EXISTS billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  customer_id TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'past_due', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, customer_id),
  UNIQUE (workspace_id)
);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  subscription_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'incomplete')),
  plan_code TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 1,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_workspace_id
  ON billing_subscriptions(workspace_id);

CREATE TABLE IF NOT EXISTS data_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  import_type TEXT NOT NULL DEFAULT 'agent-client-data',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  source_filename TEXT NOT NULL,
  storage_path TEXT,
  summary JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_import_jobs_workspace_id
  ON data_import_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_data_import_jobs_status
  ON data_import_jobs(status);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_memberships membership
    WHERE membership.workspace_id = target_workspace_id
      AND membership.user_id = auth.uid()
      AND membership.role = 'owner'
  );
$$;

DROP POLICY IF EXISTS "Workspace members can read workspaces" ON workspaces;
CREATE POLICY "Workspace members can read workspaces"
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = workspaces.id
        AND membership.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON workspaces;
CREATE POLICY "Workspace owners can update workspaces"
  ON workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = workspaces.id
        AND membership.user_id = auth.uid()
        AND membership.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Workspace owners can insert workspaces" ON workspaces;
CREATE POLICY "Workspace owners can insert workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can read own memberships" ON workspace_memberships;
CREATE POLICY "Users can read own memberships"
  ON workspace_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_workspace_owner(workspace_memberships.workspace_id)
  );

DROP POLICY IF EXISTS "Workspace owners can manage memberships" ON workspace_memberships;
CREATE POLICY "Workspace owners can manage memberships"
  ON workspace_memberships FOR ALL
  USING (public.is_workspace_owner(workspace_memberships.workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_memberships.workspace_id));

DROP POLICY IF EXISTS "Workspace members can read clients" ON agent_clients;
CREATE POLICY "Workspace members can read clients"
  ON agent_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = agent_clients.workspace_id
        AND membership.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can manage clients" ON agent_clients;
CREATE POLICY "Workspace members can manage clients"
  ON agent_clients FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = agent_clients.workspace_id
        AND membership.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = agent_clients.workspace_id
        AND membership.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can read billing customers" ON billing_customers;
CREATE POLICY "Workspace members can read billing customers"
  ON billing_customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = billing_customers.workspace_id
        AND membership.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace owners can manage billing customers" ON billing_customers;
CREATE POLICY "Workspace owners can manage billing customers"
  ON billing_customers FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = billing_customers.workspace_id
        AND membership.user_id = auth.uid()
        AND membership.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = billing_customers.workspace_id
        AND membership.user_id = auth.uid()
        AND membership.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Workspace members can read billing subscriptions" ON billing_subscriptions;
CREATE POLICY "Workspace members can read billing subscriptions"
  ON billing_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = billing_subscriptions.workspace_id
        AND membership.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace owners can manage billing subscriptions" ON billing_subscriptions;
CREATE POLICY "Workspace owners can manage billing subscriptions"
  ON billing_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = billing_subscriptions.workspace_id
        AND membership.user_id = auth.uid()
        AND membership.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = billing_subscriptions.workspace_id
        AND membership.user_id = auth.uid()
        AND membership.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Workspace members can read import jobs" ON data_import_jobs;
CREATE POLICY "Workspace members can read import jobs"
  ON data_import_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = data_import_jobs.workspace_id
        AND membership.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can create import jobs" ON data_import_jobs;
CREATE POLICY "Workspace members can create import jobs"
  ON data_import_jobs FOR INSERT
  WITH CHECK (
    uploaded_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = data_import_jobs.workspace_id
        AND membership.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can update import jobs" ON data_import_jobs;
CREATE POLICY "Workspace members can update import jobs"
  ON data_import_jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_memberships membership
      WHERE membership.workspace_id = data_import_jobs.workspace_id
        AND membership.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspaces_updated_at ON workspaces;
CREATE TRIGGER trigger_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trigger_agent_clients_updated_at ON agent_clients;
CREATE TRIGGER trigger_agent_clients_updated_at
BEFORE UPDATE ON agent_clients
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trigger_billing_customers_updated_at ON billing_customers;
CREATE TRIGGER trigger_billing_customers_updated_at
BEFORE UPDATE ON billing_customers
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trigger_billing_subscriptions_updated_at ON billing_subscriptions;
CREATE TRIGGER trigger_billing_subscriptions_updated_at
BEFORE UPDATE ON billing_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, property_data, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->'propertyData', '{}'::jsonb),
    COALESCE(NEW.raw_user_meta_data->>'accountType', 'homeowner')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
    property_data = COALESCE(EXCLUDED.property_data, profiles.property_data),
    account_type = COALESCE(NULLIF(EXCLUDED.account_type, ''), profiles.account_type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
