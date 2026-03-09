import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/resend';

interface SubscribeRequestBody {
  email?: unknown;
  name?: unknown;
  propertyData?: unknown;
  estimateId?: unknown;
  workspaceId?: unknown;
  workspaceSlug?: unknown;
}

function getClientDisplayName(name: string | null | undefined, email: string) {
  const trimmedName = name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  return email;
}

async function sendWelcomeEmailIfPossible({
  email,
  name,
  propertyData,
  subscriberId,
  workspaceId,
}: {
  email: string;
  name?: string | null;
  propertyData?: Record<string, unknown> | null;
  subscriberId: string;
  workspaceId?: string | null;
}) {
  if (!propertyData) {
    return;
  }

  sendWelcomeEmail({
    to: email.toLowerCase().trim(),
    name: name || 'Homeowner',
    estimatedValue: Number(propertyData.estimatedCurrentValue) || 0,
    equityGained: Number(propertyData.netEquity) || 0,
    region: String(propertyData.region || 'GTA'),
    propertyType: String(propertyData.propertyType || 'Property'),
    subscriberId,
    workspaceId,
  }).catch((err) => {
    console.error('Welcome email failed (non-blocking):', err);
  });
}

async function resolveWorkspaceContext({
  supabase,
  estimateId,
  workspaceId,
  workspaceSlug,
}: {
  supabase: ReturnType<typeof createServerClient>;
  estimateId?: string | null;
  workspaceId?: string | null;
  workspaceSlug?: string | null;
}) {
  let resolvedWorkspaceId = workspaceId ?? null;
  let resolvedEstimateId: string | null = null;

  if (estimateId) {
    const { data: estimate, error } = await supabase
      .from('estimates')
      .select('id, workspace_id')
      .eq('id', estimateId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (estimate?.id) {
      resolvedEstimateId = estimate.id as string;
      resolvedWorkspaceId =
        (estimate.workspace_id as string | undefined | null) ?? resolvedWorkspaceId;
    }
  }

  if (!resolvedWorkspaceId && workspaceSlug) {
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', workspaceSlug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    resolvedWorkspaceId = (workspace?.id as string | undefined) ?? null;
  }

  return {
    workspaceId: resolvedWorkspaceId,
    estimateId: resolvedEstimateId,
  };
}

async function syncAgentClientFromSubscriber({
  subscriberId,
  workspaceId,
  email,
  name,
  propertyData,
  estimateId,
}: {
  subscriberId: string;
  workspaceId?: string | null;
  email: string;
  name?: string | null;
  propertyData?: Record<string, unknown> | null;
  estimateId?: string | null;
}) {
  if (!workspaceId) {
    return;
  }

  const supabase = createServerClient();
  const normalizedEmail = email.toLowerCase().trim();
  const clientPayload = {
    workspace_id: workspaceId,
    subscriber_id: subscriberId,
    estimate_id: estimateId ?? null,
    email: normalizedEmail,
    name: getClientDisplayName(name, normalizedEmail),
    property_data: propertyData || {},
  };

  const existingBySubscriberResponse = await supabase
    .from('agent_clients')
    .select('id')
    .eq('subscriber_id', subscriberId)
    .limit(1)
    .maybeSingle();

  if (existingBySubscriberResponse.error) {
    throw new Error(existingBySubscriberResponse.error.message);
  }

  if (existingBySubscriberResponse.data?.id) {
    const { error: updateError } = await supabase
      .from('agent_clients')
      .update(clientPayload)
      .eq('id', existingBySubscriberResponse.data.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return;
  }

  const existingByEmailResponse = await supabase
    .from('agent_clients')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingByEmailResponse.error) {
    throw new Error(existingByEmailResponse.error.message);
  }

  if (existingByEmailResponse.data?.id) {
    const { error: updateError } = await supabase
      .from('agent_clients')
      .update(clientPayload)
      .eq('id', existingByEmailResponse.data.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return;
  }

  const { error: insertError } = await supabase.from('agent_clients').insert({
    ...clientPayload,
    status: 'lead',
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function unsubscribeSubscriber(id?: string | null, email?: string | null) {
  if (!email && !id) {
    return {
      success: false,
      status: 400,
      payload: { error: 'Email or subscriber ID required' },
    };
  }

  const supabase = createServerClient();
  const query = supabase
    .from('subscribers')
    .update({
      unsubscribed_at: new Date().toISOString(),
      monthly_reports: false,
      market_alerts: false,
    });

  if (id) {
    query.eq('id', id);
  } else if (email) {
    query.eq('email', email.toLowerCase().trim());
  }

  const { error } = await query;

  if (error) {
    console.error('Error unsubscribing:', error);
    return {
      success: false,
      status: 500,
      payload: { error: 'Failed to unsubscribe' },
    };
  }

  return {
    success: true,
    status: 200,
    payload: {
      success: true,
      message: 'You have been unsubscribed from monthly market updates.',
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscribeRequestBody;
    const normalizedEmail =
      typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const normalizedName = typeof body.name === 'string' ? body.name.trim() : null;
    const normalizedEstimateId =
      typeof body.estimateId === 'string' && body.estimateId.trim().length > 0
        ? body.estimateId.trim()
        : null;
    const normalizedWorkspaceId =
      typeof body.workspaceId === 'string' && body.workspaceId.trim().length > 0
        ? body.workspaceId.trim()
        : null;
    const normalizedWorkspaceSlug =
      typeof body.workspaceSlug === 'string' && body.workspaceSlug.trim().length > 0
        ? body.workspaceSlug.trim()
        : null;
    const propertyData =
      body.propertyData && typeof body.propertyData === 'object'
        ? (body.propertyData as Record<string, unknown>)
        : {};

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const context = await resolveWorkspaceContext({
      supabase,
      estimateId: normalizedEstimateId,
      workspaceId: normalizedWorkspaceId,
      workspaceSlug: normalizedWorkspaceSlug,
    });
    let workspaceId = context.workspaceId;
    const resolvedEstimateId = context.estimateId;

    // Check if email already exists
    let existingQuery = supabase
      .from('subscribers')
      .select('id, unsubscribed_at, workspace_id')
      .eq('email', normalizedEmail)
      .limit(1);

    if (workspaceId) {
      existingQuery = existingQuery.eq('workspace_id', workspaceId);
    }

    const { data: existing, error: existingError } = await existingQuery.maybeSingle();
    if (existingError) {
      console.error('Error checking existing subscriber:', existingError);
      return NextResponse.json(
        { error: 'Failed to check existing subscription' },
        { status: 500 }
      );
    }

    if (!workspaceId) {
      workspaceId = (existing?.workspace_id as string | null | undefined) ?? null;
    }

    if (!workspaceId) {
      console.warn('[Subscribe] Missing workspace context. CRM sync may be skipped.', {
        email: normalizedEmail,
        estimateId: normalizedEstimateId,
        workspaceSlug: normalizedWorkspaceSlug,
      });
    }

    if (existing) {
      // Reactivate if previously unsubscribed
      if (existing.unsubscribed_at) {
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({
            unsubscribed_at: null,
            monthly_reports: true,
            workspace_id: workspaceId,
            property_data: propertyData,
            estimate_id: resolvedEstimateId,
            name: normalizedName,
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error reactivating subscriber:', updateError);
          return NextResponse.json(
            { error: 'Failed to reactivate subscription' },
            { status: 500 }
          );
        }

        await syncAgentClientFromSubscriber({
          subscriberId: existing.id,
          workspaceId,
          email: normalizedEmail,
          name: normalizedName,
          propertyData,
          estimateId: resolvedEstimateId,
        });

        await sendWelcomeEmailIfPossible({
          email: normalizedEmail,
          name: normalizedName,
          propertyData,
          subscriberId: existing.id,
          workspaceId,
        });

        return NextResponse.json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.',
          subscriberId: existing.id,
        });
      }

      const { error: refreshError } = await supabase
        .from('subscribers')
        .update({
          workspace_id: workspaceId,
          name: normalizedName,
          property_data: propertyData,
          estimate_id: resolvedEstimateId,
        })
        .eq('id', existing.id);

      if (refreshError) {
        console.error('Error refreshing subscriber:', refreshError);
        return NextResponse.json(
          { error: 'Failed to refresh subscription details' },
          { status: 500 }
        );
      }

      await syncAgentClientFromSubscriber({
        subscriberId: existing.id,
        workspaceId,
        email: normalizedEmail,
        name: normalizedName,
        propertyData,
        estimateId: resolvedEstimateId,
      });

      return NextResponse.json({
        success: true,
        message: 'You\'re already subscribed. We refreshed your details.',
        subscriberId: existing.id,
      });
    }

    // Create new subscriber
    const { data: subscriber, error: insertError } = await supabase
      .from('subscribers')
      .insert({
        email: normalizedEmail,
        name: normalizedName,
        workspace_id: workspaceId,
        property_data: propertyData,
        estimate_id: resolvedEstimateId,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating subscriber:', insertError);
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 }
      );
    }

    await syncAgentClientFromSubscriber({
      subscriberId: subscriber.id,
      workspaceId,
      email: normalizedEmail,
      name: normalizedName,
      propertyData,
      estimateId: resolvedEstimateId,
    });

    await sendWelcomeEmailIfPossible({
      email: normalizedEmail,
      name: normalizedName,
      propertyData,
      subscriberId: subscriber.id,
      workspaceId,
    });

    return NextResponse.json({
      success: true,
      message: 'You\'re subscribed! Check your inbox for your confirmation email.',
      subscriberId: subscriber.id,
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const id = searchParams.get('id');
    const result = await unsubscribeSubscriber(id, email);

    if (!result.success) {
      return new NextResponse(
        `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0B0F14; color: #ffffff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px;">
    <div style="max-width: 480px; text-align: center;">
      <h1 style="margin-bottom: 12px;">Unable to unsubscribe</h1>
      <p style="color: #94a3b8;">${result.payload.error}</p>
    </div>
  </body>
</html>`,
        {
          status: result.status,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    return new NextResponse(
      `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0B0F14; color: #ffffff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px;">
    <div style="max-width: 480px; text-align: center;">
      <h1 style="margin-bottom: 12px;">You have been unsubscribed</h1>
      <p style="color: #94a3b8;">You will no longer receive monthly GTA market updates.</p>
    </div>
  </body>
</html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (error) {
    console.error('Unsubscribe GET error:', error);
    return new NextResponse('Failed to unsubscribe', { status: 500 });
  }
}

// Unsubscribe endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const id = searchParams.get('id');
    const result = await unsubscribeSubscriber(id, email);
    return NextResponse.json(result.payload, { status: result.status });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
