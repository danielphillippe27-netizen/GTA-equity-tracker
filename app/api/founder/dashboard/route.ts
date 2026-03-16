import { NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/request';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { bootstrapUserProfile } from '@/lib/auth/bootstrap';
import { getRecentMarketStats, type CurrentMarketStats } from '@/lib/estimation/hpi';
import { isFounderEmail } from '@/lib/founder-access';

type StoredAccountType = 'homeowner' | 'agent' | 'owner';

interface DashboardProfile {
  id: string;
  email: string | null;
  name: string | null;
  account_type: StoredAccountType;
  default_workspace_id: string | null;
  property_data: {
    estimateId?: string;
    purchasePrice?: number;
    purchaseYear?: number;
    purchaseMonth?: number;
    estimatedCurrentValue?: number;
    netEquity?: number;
    region?: string;
    propertyType?: string;
  } | null;
  primary_estimate_id: string | null;
}

interface EmailStats {
  sentCount: number;
  lastSentAt: string | null;
}

const EMPTY_EMAIL_STATS: EmailStats = {
  sentCount: 0,
  lastSentAt: null,
};

function isMissingEmailEventsTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.message?.includes('public.email_events') === true
  );
}

async function resolveFounderWorkspaceId(
  supabase: ReturnType<typeof createServiceRoleClient>,
  requestedSlug: string | null,
  profile: DashboardProfile
) {
  if (requestedSlug) {
    const requestedWorkspace = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', requestedSlug)
      .maybeSingle();

    if (requestedWorkspace.error) {
      throw requestedWorkspace.error;
    }

    if (requestedWorkspace.data?.id) {
      return requestedWorkspace.data.id as string;
    }
  }

  if (profile.default_workspace_id) {
    return profile.default_workspace_id;
  }

  const firstWorkspace = await supabase
    .from('workspaces')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstWorkspace.error) {
    throw firstWorkspace.error;
  }

  return (firstWorkspace.data?.id as string | undefined) ?? null;
}

export async function GET(request: Request) {
  const { user } = await createRequestClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFounderEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServiceRoleClient();

  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, email, name, account_type, default_workspace_id, property_data, primary_estimate_id'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: 'Failed to load profile', detail: profileError.message },
      { status: 500 }
    );
  }

  if (!profile) {
    try {
      await bootstrapUserProfile(user, 'homeowner');
      const retry = await supabase
        .from('profiles')
        .select(
          'id, email, name, account_type, default_workspace_id, property_data, primary_estimate_id'
        )
        .eq('id', user.id)
        .maybeSingle();

      profile = retry.data;
      profileError = retry.error;
    } catch (bootstrapError) {
      return NextResponse.json(
        {
          error: 'Profile setup failed',
          detail:
            bootstrapError instanceof Error
              ? bootstrapError.message
              : 'Unknown bootstrap error',
        },
        { status: 500 }
      );
    }
  }

  if (profileError) {
    return NextResponse.json(
      { error: 'Failed to load profile', detail: profileError.message },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found after setup' }, { status: 404 });
  }

  const typedProfile = profile as DashboardProfile;
  const propertyData = typedProfile.property_data ?? {};
  let marketStats: CurrentMarketStats | null = null;

  if (propertyData.region && propertyData.propertyType) {
    const stats = await getRecentMarketStats(
      propertyData.region,
      propertyData.propertyType,
      1,
      { workspaceId: typedProfile.default_workspace_id }
    );
    marketStats = stats[0] ?? null;
  }

  let workspaceId: string | null = null;
  try {
    workspaceId = await resolveFounderWorkspaceId(
      supabase,
      new URL(request.url).searchParams.get('slug'),
      typedProfile
    );
  } catch (workspaceError) {
    return NextResponse.json(
      {
        error: 'Failed to resolve workspace',
        detail: workspaceError instanceof Error ? workspaceError.message : 'Unknown workspace error',
      },
      { status: 500 }
    );
  }

  if (!workspaceId) {
    return NextResponse.json({
      accountType: 'agent',
      profile: typedProfile,
      homeowner: {
        marketStats,
      },
      workspace: null,
      billing: null,
      emailStats: EMPTY_EMAIL_STATS,
      clients: [],
      clientCount: 0,
      importJobs: [],
      importCount: 0,
    });
  }

  const [
    workspaceResponse,
    billingResponse,
    clientsResponse,
    importsResponse,
    emailCountResponse,
    latestEmailResponse,
  ] = await Promise.all([
    supabase
      .from('workspaces')
      .select('id, name, slug, brand, settings, created_at')
      .eq('id', workspaceId)
      .maybeSingle(),
    supabase
      .from('billing_subscriptions')
      .select(
        'id, status, plan_code, seats, current_period_start, current_period_end, cancel_at_period_end'
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agent_clients')
      .select('id, name, email, status, created_at, property_data', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('data_import_jobs')
      .select('id, source_filename, status, import_type, created_at, finished_at, summary', {
        count: 'exact',
      })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('email_events')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'sent')
      .in('email_type', ['welcome', 'monthly_report']),
    supabase
      .from('email_events')
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'sent')
      .in('email_type', ['welcome', 'monthly_report'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (workspaceResponse.error) {
    return NextResponse.json(
      { error: 'Failed to load workspace', detail: workspaceResponse.error.message },
      { status: 500 }
    );
  }

  if (billingResponse.error) {
    return NextResponse.json(
      { error: 'Failed to load billing', detail: billingResponse.error.message },
      { status: 500 }
    );
  }

  if (clientsResponse.error) {
    return NextResponse.json(
      { error: 'Failed to load clients', detail: clientsResponse.error.message },
      { status: 500 }
    );
  }

  if (importsResponse.error) {
    return NextResponse.json(
      { error: 'Failed to load import jobs', detail: importsResponse.error.message },
      { status: 500 }
    );
  }

  const emailTrackingMissing =
    isMissingEmailEventsTable(emailCountResponse.error) ||
    isMissingEmailEventsTable(latestEmailResponse.error);

  if (emailCountResponse.error && !emailTrackingMissing) {
    return NextResponse.json(
      { error: 'Failed to load email stats', detail: emailCountResponse.error.message },
      { status: 500 }
    );
  }

  if (latestEmailResponse.error && !emailTrackingMissing) {
    return NextResponse.json(
      { error: 'Failed to load email stats', detail: latestEmailResponse.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    accountType: 'agent',
    profile: typedProfile,
    homeowner: {
      marketStats,
    },
    workspace: workspaceResponse.data,
    billing: billingResponse.data,
    emailStats: emailTrackingMissing
      ? EMPTY_EMAIL_STATS
      : {
          sentCount: emailCountResponse.count ?? 0,
          lastSentAt: (latestEmailResponse.data?.created_at as string | null | undefined) ?? null,
        },
    clients: clientsResponse.data ?? [],
    clientCount: clientsResponse.count ?? 0,
    importJobs: importsResponse.data ?? [],
    importCount: importsResponse.count ?? 0,
  });
}
