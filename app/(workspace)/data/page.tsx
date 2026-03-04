'use client';

import { motion } from 'framer-motion';
import { Database } from 'lucide-react';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import {
  AgentOnlyState,
  DashboardCard,
  EmptyState,
  PageHeader,
  formatDate,
} from '@/components/dashboard/dashboard-ui';

export default function DataPage() {
  const { dashboard } = useDashboard();

  if (!dashboard) {
    return null;
  }

  if (dashboard.accountType !== 'agent') {
    return <AgentOnlyState />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Data"
        title="Data operations"
        description="Visibility into what has been staged for processing and when the workspace was last refreshed."
      />

      <DashboardCard
        title="Recent import jobs"
        description="Visibility into what has been staged for processing."
        icon={<Database className="h-5 w-5 text-accent-cyan" />}
      >
        <div className="grid gap-3">
          {(dashboard.importJobs ?? []).length ? (
            dashboard.importJobs?.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-border bg-background px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{job.source_filename}</p>
                    <p className="text-sm text-muted-foreground">{job.import_type}</p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {job.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Created {formatDate(job.created_at)}
                </p>
                {job.summary?.importSummary ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {job.summary.importSummary.market_hpi_rows ?? 0} HPI rows /{' '}
                    {job.summary.importSummary.market_watch_monthly_rows ?? 0}{' '}
                    Market Watch rows /{' '}
                    {job.summary.importSummary.historic_annual_rows ?? 0} Historic rows
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyState
              title="No staged import jobs yet."
              description="Upload TRREB files from Imports and they will appear here once staged."
            />
          )}
        </div>
      </DashboardCard>
    </motion.div>
  );
}
