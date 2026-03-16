'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Database, Home, Mail, Upload, Users } from 'lucide-react';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import {
  DashboardCard,
  DashboardMetric,
  PageHeader,
  formatDate,
} from '@/components/dashboard/dashboard-ui';

export default function FounderDashboardPage() {
  const { dashboard } = useDashboard();
  const [copyLabel, setCopyLabel] = useState('Copy Link');

  if (!dashboard) {
    return null;
  }

  const firstName = dashboard.profile.name?.split(' ')[0] || 'there';
  const latestImportDate =
    dashboard.importJobs?.[0]?.finished_at ||
    dashboard.importJobs?.[0]?.created_at ||
    null;
  const sharePath = dashboard.workspace?.slug || 'phillippegroup';
  const shareUrl = `equitytracker.ca/${sharePath}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`https://${shareUrl}`);
      setCopyLabel('Copied');
      window.setTimeout(() => setCopyLabel('Copy Link'), 2000);
    } catch {
      setCopyLabel('Copy failed');
      window.setTimeout(() => setCopyLabel('Copy Link'), 2000);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Founder"
        title={`Welcome back, ${firstName}.`}
        description="Monitor the core workspace, client list, and outbound email assets from one private founder dashboard."
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <DashboardMetric
          icon={<Users className="h-5 w-5 text-accent-cyan" />}
          label="Clients"
          value={String(dashboard.clientCount || 0)}
        />
        <DashboardMetric
          icon={<Database className="h-5 w-5 text-accent-cyan" />}
          label="Most Recent Data"
          value={formatDate(latestImportDate)}
        />
        <DashboardMetric
          icon={<Mail className="h-5 w-5 text-accent-cyan" />}
          label="Emails Sent"
          value={String(dashboard.emailStats?.sentCount || 0)}
        />
        <DashboardMetric
          icon={<Upload className="h-5 w-5 text-accent-cyan" />}
          label="Staged Imports"
          value={String(dashboard.importCount || 0)}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Public Equity Page"
          description="The primary public workspace URL."
          icon={<Copy className="h-5 w-5 text-accent-cyan" />}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Use this link when you need to verify the live client-facing page.
          </p>
          <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-4">
            <p className="text-xl font-semibold text-foreground sm:text-2xl">{shareUrl}</p>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-accent-blue px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copyLabel}
          </button>
        </DashboardCard>

        <DashboardCard
          title="Workspace snapshot"
          description="Current workspace context for clients and templates."
          icon={<Home className="h-5 w-5 text-accent-cyan" />}
        >
          <div className="grid gap-3">
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">Workspace</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {dashboard.workspace?.name || 'No workspace'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">Last client email</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {dashboard.emailStats?.lastSentAt
                  ? formatDate(dashboard.emailStats.lastSentAt)
                  : 'No sends yet'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">Recent imports</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {dashboard.importJobs?.length || 0} visible jobs
              </p>
            </div>
          </div>
        </DashboardCard>
      </section>
    </motion.div>
  );
}
