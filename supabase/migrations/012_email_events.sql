CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.subscribers(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  resend_message_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_events_type_check
    CHECK (email_type IN ('welcome', 'monthly_report', 'cma_request_notification')),
  CONSTRAINT email_events_status_check
    CHECK (status IN ('sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_email_events_workspace_created_at
  ON public.email_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_workspace_status
  ON public.email_events (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_subscriber_created_at
  ON public.email_events (subscriber_id, created_at DESC);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view email events" ON public.email_events;
CREATE POLICY "Workspace members can view email events"
  ON public.email_events
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_memberships wm
      WHERE wm.workspace_id = email_events.workspace_id
        AND wm.user_id = auth.uid()
    )
  );
