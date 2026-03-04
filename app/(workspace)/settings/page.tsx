'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import {
  AgentOnlyState,
  BillingRow,
  DashboardCard,
  PageHeader,
} from '@/components/dashboard/dashboard-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  normalizeWorkspaceSlug,
  validateWorkspaceSlug,
} from '@/lib/workspace-slugs';

export default function SettingsPage() {
  const { session } = useAuth();
  const { dashboard, refreshDashboard } = useDashboard();
  const [slugInput, setSlugInput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSlugInput(dashboard?.workspace?.slug || '');
  }, [dashboard?.workspace?.slug]);

  const normalizedSlug = useMemo(
    () => normalizeWorkspaceSlug(slugInput),
    [slugInput]
  );

  if (!dashboard) {
    return null;
  }

  if (dashboard.accountType !== 'agent') {
    return <AgentOnlyState />;
  }

  const workspace = dashboard.workspace;
  const publicUrl = normalizedSlug
    ? `https://equitytracker.ca/${normalizedSlug}`
    : 'https://equitytracker.ca/your-url';
  const validationError = normalizedSlug
    ? validateWorkspaceSlug(normalizedSlug)
    : 'Enter a workspace URL.';

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace?.id) {
      setError('No workspace is connected to this account.');
      return;
    }

    const slugError = validateWorkspaceSlug(normalizedSlug);
    if (slugError) {
      setError(slugError);
      setStatus(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          slug: normalizedSlug,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        publicUrl?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update workspace URL.');
      }

      setSlugInput(normalizedSlug);
      setStatus(`Workspace URL updated: ${payload.publicUrl || publicUrl}`);
      await refreshDashboard();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to update workspace URL.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Edit the public workspace URL that powers your agent landing page and the link shown on the dashboard."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Public workspace URL"
          description="This is the link clients will open when you send them to your equity page."
          icon={<Settings className="h-5 w-5 text-accent-cyan" />}
        >
          <form className="grid gap-4" onSubmit={handleSave}>
            <div className="grid gap-2">
              <Label htmlFor="workspace-slug">Workspace URL</Label>
              <div className="flex items-center rounded-2xl border border-border bg-background px-4 py-3">
                <span className="shrink-0 text-sm text-muted-foreground">
                  equitytracker.ca/
                </span>
                <Input
                  id="workspace-slug"
                  value={slugInput}
                  onChange={(event) => {
                    setSlugInput(event.target.value);
                    setError(null);
                    setStatus(null);
                  }}
                  placeholder="daniel33"
                  className="h-auto border-0 bg-transparent px-2 py-0 text-sm shadow-none focus-visible:ring-0"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Public page preview
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{publicUrl}</p>
            </div>

            {validationError && slugInput ? (
              <p className="text-sm text-red-300">{validationError}</p>
            ) : null}
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            {status ? <p className="text-sm text-emerald-300">{status}</p> : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={isSaving || Boolean(validationError)}
                className="rounded-2xl px-5"
              >
                {isSaving ? 'Saving...' : 'Save URL'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                asChild
              >
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open public page
                </a>
              </Button>
            </div>
          </form>
        </DashboardCard>

        <DashboardCard
          title="Workspace details"
          description="Current workspace identity and account metadata."
          icon={<Settings className="h-5 w-5 text-accent-cyan" />}
        >
          <div className="grid gap-3">
            <BillingRow label="Workspace" value={dashboard.workspace?.name || 'No workspace'} />
            <BillingRow label="Current slug" value={workspace?.slug || 'Not set'} />
            <BillingRow label="Account email" value={dashboard.profile.email || 'No email'} />
            <BillingRow label="Account type" value={dashboard.accountType} />
          </div>
        </DashboardCard>
      </div>
    </motion.div>
  );
}
