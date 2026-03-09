import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

interface PreferencesRequestBody {
  estimateId?: unknown;
  propertyData?: unknown;
}

function mergePropertyData(
  existing: Record<string, unknown> | null,
  incoming: Record<string, unknown>
) {
  const merged: Record<string, unknown> = {
    ...(existing ?? {}),
    ...incoming,
  };

  const existingMortgage =
    existing?.mortgageAssumptions &&
    typeof existing.mortgageAssumptions === 'object'
      ? (existing.mortgageAssumptions as Record<string, unknown>)
      : {};
  const incomingMortgage =
    incoming.mortgageAssumptions &&
    typeof incoming.mortgageAssumptions === 'object'
      ? (incoming.mortgageAssumptions as Record<string, unknown>)
      : {};

  if (Object.keys(existingMortgage).length > 0 || Object.keys(incomingMortgage).length > 0) {
    merged.mortgageAssumptions = {
      ...existingMortgage,
      ...incomingMortgage,
    };
  }

  return merged;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as PreferencesRequestBody | null;
    const estimateId =
      typeof body?.estimateId === 'string' ? body.estimateId.trim() : '';
    const propertyData =
      body?.propertyData && typeof body.propertyData === 'object'
        ? (body.propertyData as Record<string, unknown>)
        : null;

    if (!estimateId) {
      return NextResponse.json({ error: 'estimateId is required' }, { status: 400 });
    }

    if (!propertyData) {
      return NextResponse.json({ error: 'propertyData is required' }, { status: 400 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const supabase = createServerClient();

    const [subscriberLookup, clientLookup, profileLookup] = await Promise.all([
      supabase
        .from('subscribers')
        .select('id, property_data')
        .eq('estimate_id', estimateId),
      supabase
        .from('agent_clients')
        .select('id, property_data')
        .eq('estimate_id', estimateId),
      supabase
        .from('profiles')
        .select('id, property_data')
        .eq('primary_estimate_id', estimateId),
    ]);

    if (subscriberLookup.error) {
      return NextResponse.json(
        { error: subscriberLookup.error.message },
        { status: 500 }
      );
    }

    if (clientLookup.error) {
      return NextResponse.json(
        { error: clientLookup.error.message },
        { status: 500 }
      );
    }

    if (profileLookup.error) {
      return NextResponse.json(
        { error: profileLookup.error.message },
        { status: 500 }
      );
    }

    const subscribers = (subscriberLookup.data ?? []) as Array<{
      id: string;
      property_data: Record<string, unknown> | null;
    }>;
    const clients = (clientLookup.data ?? []) as Array<{
      id: string;
      property_data: Record<string, unknown> | null;
    }>;
    const profiles = (profileLookup.data ?? []) as Array<{
      id: string;
      property_data: Record<string, unknown> | null;
    }>;

    const updateResponses = await Promise.all([
      ...subscribers.map((subscriber) =>
        supabase
          .from('subscribers')
          .update({
            property_data: mergePropertyData(subscriber.property_data, propertyData),
          })
          .eq('id', subscriber.id)
      ),
      ...clients.map((client) =>
        supabase
          .from('agent_clients')
          .update({
            property_data: mergePropertyData(client.property_data, propertyData),
          })
          .eq('id', client.id)
      ),
      ...profiles.map((profile) =>
        supabase
          .from('profiles')
          .update({
            property_data: mergePropertyData(profile.property_data, propertyData),
          })
          .eq('id', profile.id)
      ),
    ]);

    const firstErrorResponse = updateResponses.find((response) => response.error);
    if (firstErrorResponse?.error) {
      return NextResponse.json(
        { error: firstErrorResponse.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: {
        subscribers: subscribers.length,
        agentClients: clients.length,
        profiles: profiles.length,
      },
    });
  } catch (error) {
    console.error('Estimate preferences update failed:', error);
    return NextResponse.json(
      { error: 'Failed to update estimate preferences' },
      { status: 500 }
    );
  }
}
