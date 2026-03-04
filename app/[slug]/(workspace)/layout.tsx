import type { ReactNode } from 'react';
import { DashboardProvider } from '@/components/dashboard/dashboard-provider';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function TenantWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
