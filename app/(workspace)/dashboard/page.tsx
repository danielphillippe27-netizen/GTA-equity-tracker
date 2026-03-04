'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Copy,
  Database,
  Home,
  LineChart,
  Mail,
  Upload,
  Users,
} from 'lucide-react';
import { MarketPulse } from '@/components/report';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import {
  DashboardCard,
  DashboardMetric,
  PageHeader,
  formatDate,
} from '@/components/dashboard/dashboard-ui';
import { formatCurrency } from '@/lib/constants';

export default function DashboardPage() {
  const { dashboard } = useDashboard();
  const [copyLabel, setCopyLabel] = useState('Copy Link');

  if (!dashboard) {
    return null;
  }

  const propertyData = dashboard.profile.property_data ?? {};
  const marketStats = dashboard.homeowner?.marketStats ?? null;
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

  if (dashboard.accountType === 'homeowner') {
    return (
      <>
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome back, ${firstName}.`}
          description="Your personal equity tracking, monthly market stats, and report access live here."
        />

        <section className="grid gap-4 md:grid-cols-3">
          <DashboardMetric
            icon={<Home className="h-5 w-5 text-accent-cyan" />}
            label="Net Equity"
            value={formatCurrency(propertyData.netEquity || 0)}
          />
          <DashboardMetric
            icon={<LineChart className="h-5 w-5 text-accent-cyan" />}
            label="Estimated Current Value"
            value={formatCurrency(propertyData.estimatedCurrentValue || 0)}
          />
          <DashboardMetric
            icon={<Calendar className="h-5 w-5 text-accent-cyan" />}
            label="Purchase Year"
            value={propertyData.purchaseYear ? String(propertyData.purchaseYear) : 'Not set'}
          />
        </section>

        {propertyData.netEquity ? (
          <section className="mt-8">
            <MarketPulse
              averageSoldPrice={marketStats?.averageSoldPrice ?? null}
              averageDaysOnMarket={marketStats?.averageDaysOnMarket ?? null}
              monthsOfInventory={marketStats?.monthsOfInventory ?? null}
              reportMonth={marketStats?.reportMonth ?? null}
              scopeAreaName={marketStats?.scopeAreaName ?? null}
              isFallback={marketStats?.isFallback ?? false}
            />
          </section>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <DashboardCard
            title="Monthly tracking"
            description="Monthly equity emails remain wired to your report month and market snapshot."
            icon={<Calendar className="h-5 w-5 text-accent-cyan" />}
          >
            <p className="text-sm text-muted-foreground">
              Your homeowner dashboard stays focused on one property and the monthly update flow.
            </p>
          </DashboardCard>

          <DashboardCard
            title="Quick actions"
            description="Jump back to a fresh estimate or your latest report."
            icon={<LineChart className="h-5 w-5 text-accent-cyan" />}
          >
            <div className="grid gap-3">
              <Link
                href="/"
                className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent-blue/50"
              >
                Run a new estimate
              </Link>
              {propertyData.estimateId ? (
                <Link
                  href={`/results/${propertyData.estimateId}`}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent-blue/50"
                >
                  Open latest report
                </Link>
              ) : null}
            </div>
          </DashboardCard>
        </section>
      </>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}.`}
        description="Monitor your client base, keep market data current, and track outbound report emails from one workspace."
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
          title="Copy Agent Link"
          description="Your Equity Page"
          icon={<Copy className="h-5 w-5 text-accent-cyan" />}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Send this to clients the second they ask for their home equity page.
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
          description="Keep the important operating signals visible from the homepage."
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
