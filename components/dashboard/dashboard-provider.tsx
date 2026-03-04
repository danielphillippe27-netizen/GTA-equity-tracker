'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOptionalTenant } from '@/components/tenant/TenantProvider';

export type AccountType = 'homeowner' | 'agent';

export interface DashboardPayload {
  accountType: AccountType;
  profile: {
    id: string;
    email: string | null;
    name: string | null;
    property_data?: {
      estimateId?: string;
      purchasePrice?: number;
      purchaseYear?: number;
      estimatedCurrentValue?: number;
      netEquity?: number;
    } | null;
  };
  homeowner?: {
    marketStats?: {
      averageSoldPrice?: number | null;
      averageDaysOnMarket?: number | null;
      monthsOfInventory?: number | null;
      reportMonth?: string | null;
      scopeAreaName?: string | null;
      isFallback?: boolean;
    } | null;
  };
  workspace?: {
    id: string;
    name: string;
    slug: string;
    brand?: {
      logoUrl?: string | null;
      primaryColor?: string | null;
      accentColor?: string | null;
      tagline?: string | null;
      ctaText?: string | null;
      contactPhone?: string | null;
      contactEmail?: string | null;
    } | null;
  } | null;
  billing?: {
    status: string;
    plan_code: string;
    seats: number;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  emailStats?: {
    sentCount: number;
    lastSentAt: string | null;
  } | null;
  clients?: Array<{
    id: string;
    name: string;
    email: string | null;
    status: string;
    created_at: string;
    property_data?: {
      region?: string;
      propertyType?: string;
    } | null;
  }>;
  clientCount?: number;
  importJobs?: Array<{
    id: string;
    source_filename: string;
    status: string;
    import_type: string;
    created_at: string;
    finished_at: string | null;
    summary?: {
      size?: number;
      hpiCount?: number;
      marketWatchCount?: number;
      importSummary?: {
        market_hpi_rows?: number;
        market_watch_monthly_rows?: number;
        historic_annual_rows?: number;
      } | null;
    } | null;
  }>;
  importCount?: number;
}

interface DashboardErrorResponse {
  error?: string;
  detail?: string;
}

interface DashboardContextValue {
  dashboard: DashboardPayload | null;
  error: string | null;
  loadingDashboard: boolean;
  refreshDashboard: () => Promise<DashboardPayload | null>;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

async function fetchDashboard(accessToken: string, slug?: string) {
  const searchParams = new URLSearchParams();
  if (slug) {
    searchParams.set('slug', slug);
  }

  const response = await fetch(
    `/api/dashboard${searchParams.size ? `?${searchParams.toString()}` : ''}`,
    {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    }
  );

  const payload = (await response.json()) as DashboardPayload & DashboardErrorResponse;

  if (!response.ok) {
    throw new Error(
      payload.detail
        ? `${payload.error || 'Unable to load dashboard.'}: ${payload.detail}`
        : payload.error || 'Unable to load dashboard.'
    );
  }

  return payload;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, session, loading } = useAuth();
  const tenant = useOptionalTenant();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, router, user]);

  const refreshDashboard = useCallback(async () => {
    if (!session?.access_token) {
      setLoadingDashboard(false);
      return null;
    }

    setLoadingDashboard(true);
    setError(null);

    try {
      const payload = await fetchDashboard(session.access_token, tenant?.slug);
      setDashboard(payload);
      return payload;
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Unable to load dashboard.'
      );
      return null;
    } finally {
      setLoadingDashboard(false);
    }
  }, [session?.access_token, tenant?.slug]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user || !session?.access_token) {
      setLoadingDashboard(false);
      return;
    }

    void refreshDashboard();
  }, [loading, refreshDashboard, session?.access_token, user]);

  return (
    <DashboardContext.Provider
      value={{
        dashboard,
        error,
        loadingDashboard,
        refreshDashboard,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }

  return context;
}
