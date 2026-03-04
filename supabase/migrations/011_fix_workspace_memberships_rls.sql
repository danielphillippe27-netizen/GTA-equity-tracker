-- Fix recursive workspace_memberships RLS policies introduced by the initial
-- platform workspace migration. These policies cannot safely query the same
-- table from inside their own USING/WITH CHECK expressions.

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

ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own memberships" ON workspace_memberships;
CREATE POLICY "Users can read own memberships"
  ON workspace_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_workspace_owner(workspace_id)
  );

DROP POLICY IF EXISTS "Workspace owners can manage memberships" ON workspace_memberships;
CREATE POLICY "Workspace owners can manage memberships"
  ON workspace_memberships FOR ALL
  USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));
