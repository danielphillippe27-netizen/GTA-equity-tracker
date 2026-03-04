'use client';

import { motion } from 'framer-motion';
import { BarChart3, CreditCard, Upload, Users } from 'lucide-react';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import {
  AgentOnlyState,
  DashboardCard,
  DashboardMetric,
  PageHeader,
} from '@/components/dashboard/dashboard-ui';

export default function AnalyticsPage() {
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
        eyebrow="Analytics"
        title="Workspace analytics"
        description="A lightweight analytics view for the current state of the workspace while deeper reporting gets wired in."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <DashboardMetric
          icon={<Users className="h-5 w-5 text-accent-cyan" />}
          label="Clients"
          value={String(dashboard.clientCount || 0)}
        />
        <DashboardMetric
          icon={<Upload className="h-5 w-5 text-accent-cyan" />}
          label="Imports tracked"
          value={String(dashboard.importCount || 0)}
        />
        <DashboardMetric
          icon={<CreditCard className="h-5 w-5 text-accent-cyan" />}
          label="Workspace seats"
          value={String(dashboard.billing?.seats || 1)}
        />
      </section>

      <section className="mt-6">
        <DashboardCard
          title="Next analytics layer"
          description="This keeps the route live now without pretending there is more data than the platform currently stores."
          icon={<BarChart3 className="h-5 w-5 text-accent-cyan" />}
        >
          <p className="text-sm leading-6 text-muted-foreground">
            Client engagement, funnel conversion, and usage analytics are not
            yet modeled in the database. This page currently surfaces the
            operational metrics already available in the workspace payload.
          </p>
        </DashboardCard>
      </section>
    </motion.div>
  );
}
