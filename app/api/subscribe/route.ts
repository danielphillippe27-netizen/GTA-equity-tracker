import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/resend';

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
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error reactivating subscriber:', updateError);
          return NextResponse.json(
            { error: 'Failed to reactivate subscription' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.',
          subscriberId: existing.id,
        });
      }

      // Already subscribed
      return NextResponse.json({
        success: true,
        message: 'You\'re already subscribed!',
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

    // Send welcome email (don't block on failure)
    if (propertyData) {
      sendWelcomeEmail({
        to: email.toLowerCase().trim(),
        name: name || 'Homeowner',
        estimatedValue: propertyData.estimatedCurrentValue || 0,
        equityGained: propertyData.netEquity || 0,
        region: propertyData.region || 'GTA',
        propertyType: propertyData.propertyType || 'Property',
      }).catch((err) => {
        console.error('Welcome email failed (non-blocking):', err);
      });
    }

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

// Unsubscribe endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const id = searchParams.get('id');

    if (!email && !id) {
      return NextResponse.json(
        { error: 'Email or subscriber ID required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'You\'ve been unsubscribed. Sorry to see you go!',
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
