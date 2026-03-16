import { NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/request';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { bootstrapUserProfile } from '@/lib/auth/bootstrap';
import { getRecentMarketStats, type CurrentMarketStats } from '@/lib/estimation/hpi';

type StoredAccountType = 'homeowner' | 'agent' | 'owner';
type DashboardAccountType = 'homeowner';

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

export async function GET(_request: Request) {
  const { user } = await createRequestClient(_request);

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
    return NextResponse.json({ error: 'Profile not found after setup' }, { status: 404 });
  }

  const typedProfile = profile as DashboardProfile;
  const propertyData = typedProfile.property_data ?? {};
  const accountType: DashboardAccountType = 'homeowner';
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
