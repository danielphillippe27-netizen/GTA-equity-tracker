import { redirect } from 'next/navigation';
import { AuthEntryPage } from '@/components/auth/auth-entry-page';
import { getAuthenticatedDashboardPath } from '@/lib/auth/server-routing';

function normalizeNextPath(value: string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/phillippegroup';
  }

  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const dashboardPath = await getAuthenticatedDashboardPath();
  const params = await searchParams;

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  return <AuthEntryPage defaultMode="login" nextPath={normalizeNextPath(params.next)} />;
}
