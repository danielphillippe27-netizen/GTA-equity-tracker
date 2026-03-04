import { NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/request';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { bootstrapUserProfile } from '@/lib/auth/bootstrap';
import { getRecentMarketStats, type CurrentMarketStats } from '@/lib/estimation/hpi';

type StoredAccountType = 'homeowner' | 'agent' | 'owner';
type DashboardAccountType = 'homeowner' | 'agent';

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

interface WorkspaceMembershipRecord {
  workspace_id: string;
  role: string;
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
    error.message?.includes("public.email_events") === true
  );
}

export async function GET(request: Request) {
  const { user } = await createRequestClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      await bootstrapUserProfile(user, null);
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
    return NextResponse.json(
      { error: 'Profile not found after setup' },
      { status: 404 }
    );
  }

  const typedProfile = profile as DashboardProfile;
  const propertyData = typedProfile.property_data ?? {};
  const requestedSlug = new URL(request.url).searchParams.get('slug');
  const accountType: DashboardAccountType =
    typedProfile.account_type === 'homeowner' ? 'homeowner' : 'agent';

  if (accountType === 'homeowner') {
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

    return NextResponse.json({
      accountType,
      profile: typedProfile,
      homeowner: {
        marketStats,
      },
    });
  }

  let workspaceId =
    typedProfile.default_workspace_id ?? null;

  let membership: WorkspaceMembershipRecord | null = null;

  if (requestedSlug) {
    const requestedWorkspace = await supabase
      .from('workspaces')
      .select('id, slug, name, brand, created_at')
      .eq('slug', requestedSlug)
      .maybeSingle();

    if (requestedWorkspace.error) {
      return NextResponse.json(
        { error: 'Failed to load workspace', detail: requestedWorkspace.error.message },
        { status: 500 }
      );
    }

    if (!requestedWorkspace.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    workspaceId = requestedWorkspace.data.id as string;
    const membershipResponse = await supabase
      .from('workspace_memberships')
      .select('workspace_id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    membership = membershipResponse.data as WorkspaceMembershipRecord | null;

    if (!membership && typedProfile.default_workspace_id !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const membershipResponse = await supabase
      .from('workspace_memberships')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    membership = membershipResponse.data as WorkspaceMembershipRecord | null;
    workspaceId =
      workspaceId ?? (membership?.workspace_id as string | null | undefined) ?? null;
  }

  if (!workspaceId) {
    return NextResponse.json({
      accountType,
      profile: typedProfile,
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
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('data_import_jobs')
      .select('id, source_filename, status, import_type, created_at, finished_at, summary', {
        count: 'exact',
      })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(8),
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

  if (!membership) {
    const membershipResponse = await supabase
      .from('workspace_memberships')
      .select('workspace_id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    membership = membershipResponse.data as WorkspaceMembershipRecord | null;
  }

  return NextResponse.json({
    accountType,
    profile: typedProfile,
    membership,
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
