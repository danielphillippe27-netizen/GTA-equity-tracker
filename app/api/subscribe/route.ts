import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/resend';

async function sendWelcomeEmailIfPossible({
  email,
  name,
  propertyData,
  subscriberId,
}: {
  email: string;
  name?: string | null;
  propertyData?: Record<string, unknown> | null;
  subscriberId: string;
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
  }).catch((err) => {
    console.error('Welcome email failed (non-blocking):', err);
  });
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
    const body = await request.json();
    const { email, name, propertyData, estimateId } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, unsubscribed_at')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      // Reactivate if previously unsubscribed
      if (existing.unsubscribed_at) {
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({
            unsubscribed_at: null,
            monthly_reports: true,
            property_data: propertyData || {},
            estimate_id: estimateId,
            name: name || null,
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error reactivating subscriber:', updateError);
          return NextResponse.json(
            { error: 'Failed to reactivate subscription' },
            { status: 500 }
          );
        }

        await sendWelcomeEmailIfPossible({
          email,
          name,
          propertyData,
          subscriberId: existing.id,
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
          name: name || null,
          property_data: propertyData || {},
          estimate_id: estimateId,
        })
        .eq('id', existing.id);

      if (refreshError) {
        console.error('Error refreshing subscriber:', refreshError);
        return NextResponse.json(
          { error: 'Failed to refresh subscription details' },
          { status: 500 }
        );
      }

      await sendWelcomeEmailIfPossible({
        email,
        name,
        propertyData,
        subscriberId: existing.id,
      });

      return NextResponse.json({
        success: true,
        message: 'You\'re already subscribed. We refreshed your details and sent your latest welcome email.',
        subscriberId: existing.id,
      });
    }

    // Create new subscriber
    const { data: subscriber, error: insertError } = await supabase
      .from('subscribers')
      .insert({
        email: email.toLowerCase().trim(),
        name: name || null,
        property_data: propertyData || {},
        estimate_id: estimateId,
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

    await sendWelcomeEmailIfPossible({
      email,
      name,
      propertyData,
      subscriberId: subscriber.id,
    });

    return NextResponse.json({
      success: true,
      message: 'You\'re subscribed! Check your inbox for your first equity report.',
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
