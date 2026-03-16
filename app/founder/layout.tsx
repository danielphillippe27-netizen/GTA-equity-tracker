import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { createServerClient as createSsrClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { DashboardProvider } from '@/components/dashboard/dashboard-provider';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { isFounderEmail } from '@/lib/founder-access';

export default async function FounderLayout({ children }: { children: ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const supabase = createSsrClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Ffounder%2Fdashboard');
  }

  if (!isFounderEmail(user.email)) {
    redirect('/dashboard');
  }

  return (
    <DashboardProvider endpoint="/api/founder/dashboard">
      <DashboardShell mode="founder" basePath="/founder">
        {children}
      </DashboardShell>
    </DashboardProvider>
  );
}
