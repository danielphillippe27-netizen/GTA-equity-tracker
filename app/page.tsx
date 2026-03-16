import { redirect } from 'next/navigation';
import { AuthEntryPage } from '@/components/auth/auth-entry-page';
import { getAuthenticatedDashboardPath } from '@/lib/auth/server-routing';

export default async function HomePage() {
  const dashboardPath = await getAuthenticatedDashboardPath();

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  return <AuthEntryPage defaultMode="create" />;
}
