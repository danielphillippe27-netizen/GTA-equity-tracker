'use client';

import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import {
  AgentOnlyState,
  BillingRow,
  DashboardCard,
  PageHeader,
  formatDate,
} from '@/components/dashboard/dashboard-ui';

export default function BillingPage() {
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
        eyebrow="Billing"
        title="Workspace billing"
        description="Workspace billing state is now modeled and kept separate from the operational dashboard."
      />

      <DashboardCard
        title="Billing"
        description="Workspace billing state is now modeled, ready for Stripe wiring."
        icon={<CreditCard className="h-5 w-5 text-accent-cyan" />}
      >
        <div className="grid gap-3">
          <BillingRow label="Workspace" value={dashboard.workspace?.name || 'No workspace'} />
          <BillingRow label="Status" value={dashboard.billing?.status || 'pending'} />
          <BillingRow label="Plan" value={dashboard.billing?.plan_code || 'Connect Stripe'} />
          <BillingRow
            label="Seats"
            value={dashboard.billing?.seats ? String(dashboard.billing.seats) : '1'}
          />
          <BillingRow
            label="Current period end"
            value={formatDate(dashboard.billing?.current_period_end)}
          />
        </div>
      </DashboardCard>
    </motion.div>
  );
}
