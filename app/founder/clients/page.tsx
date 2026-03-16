'use client';

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import {
  DashboardCard,
  EmptyState,
  PageHeader,
} from '@/components/dashboard/dashboard-ui';

export default function FounderClientsPage() {
  const { dashboard } = useDashboard();

  if (!dashboard) {
    return null;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Clients"
        title="All clients"
        description="A founder-level view of the latest client records currently in the platform."
      />

      <DashboardCard
        title="Client management"
        description="Recent clients across the platform."
        icon={<Users className="h-5 w-5 text-accent-cyan" />}
      >
        <div className="grid gap-3">
          {(dashboard.clients ?? []).length ? (
            dashboard.clients?.map((client) => (
              <div
                key={client.id}
                className="rounded-2xl border border-border bg-background px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.email || 'No email on file'}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {(client.property_data?.region || 'GTA').toString()} /{' '}
                      {(client.property_data?.propertyType || 'Property').toString()}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {client.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No clients yet."
              description="Client records will appear here once they are added to the platform."
            />
          )}
        </div>
      </DashboardCard>
    </motion.div>
  );
}
