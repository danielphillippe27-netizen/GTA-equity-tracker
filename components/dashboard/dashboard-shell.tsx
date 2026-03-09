'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChartColumn,
  CreditCard,
  Database,
  FileText,
  Home,
  LogOut,
  Settings,
  Upload,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import { useOptionalTenant } from '@/components/tenant/TenantProvider';
import { cn } from '@/lib/utils';

const navigationItems: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/add-new', label: 'Add New', icon: UserRoundPlus },
  { href: '/analytics', label: 'Analytics', icon: ChartColumn },
  { href: '/data', label: 'Data', icon: Database },
  { href: '/imports', label: 'Imports', icon: Upload },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { dashboard, error, loadingDashboard } = useDashboard();
  const tenant = useOptionalTenant();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  if (loading || loadingDashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent-blue" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-3xl border border-border bg-surface/85 p-8 text-center">
          <p className="text-base text-muted-foreground">Redirecting to login...</p>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="min-h-screen bg-background">
        <div className="fixed inset-0 bg-hero-gradient opacity-40 pointer-events-none" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <div className="w-full rounded-[2rem] border border-border bg-surface/90 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Dashboard Error
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">
              The Realtor dashboard did not load.
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {error || 'Something blocked the dashboard data request before the page could render.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-2xl bg-accent-blue px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Retry
              </button>
              <Link
                href="/login"
                className="rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent-blue/50"
              >
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isAgentWorkspace = dashboard.accountType === 'agent';
  const workspaceName =
    dashboard.workspace?.name ||
    dashboard.profile.name ||
    'Equity Tracker';
  const workspaceBrand = dashboard.workspace?.brand ?? tenant?.brand ?? null;
  const basePath = tenant?.basePath || (dashboard.workspace?.slug ? `/${dashboard.workspace.slug}` : '');

  return (
    <main className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-hero-gradient opacity-40 pointer-events-none" />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="flex min-h-24 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Link href={`${basePath || ''}/dashboard`} className="shrink-0">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Equity Tracker
              </p>
            </Link>

            <div className="hidden h-10 w-px bg-border/70 md:block" />

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Workspace
              </p>
              <div className="mt-1 flex items-center gap-3">
                {workspaceBrand?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={workspaceBrand.logoUrl}
                    alt={workspaceName}
                    className="h-9 w-9 rounded-full border border-border object-cover"
                  />
                ) : null}
                <h1 className="truncate text-lg font-semibold text-foreground">{workspaceName}</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Switch account
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>

        {isAgentWorkspace ? (
          <div className="border-t border-border/60 px-4 py-3 md:hidden">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const href = `${basePath}${item.href}`;
                const isActive = pathname === href;

                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
                      isActive
                        ? 'border-accent-blue/60 bg-accent-blue/15 text-foreground'
                        : 'border-border bg-surface/80 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </header>

      {isAgentWorkspace ? (
        <Sidebar
          basePath={basePath}
          pathname={pathname}
        />
      ) : null}

      <div
        className={cn(
          'relative z-10 min-h-screen pt-24',
          isAgentWorkspace && 'md:pl-60'
        )}
      >
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </div>
    </main>
  );
}

function Sidebar({
  basePath,
  pathname,
}: {
  basePath: string;
  pathname: string;
}) {
  return (
    <aside className="fixed bottom-0 left-0 top-24 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar/95 backdrop-blur md:flex md:flex-col">
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <div className="grid gap-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const href = `${basePath}${item.href}`;
            const isActive = pathname === href;

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
                    : 'text-sidebar-accent-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
