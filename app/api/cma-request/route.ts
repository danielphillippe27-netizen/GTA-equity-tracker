import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { sendCmaRequestNotification } from '@/lib/email/resend';
import { v4 as uuidv4 } from 'uuid';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      estimateId,
      sessionId,
      name,
      email,
      phone,
      preferredContactMethod,
      notes,
    } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    // Generate request ID
    const requestId = uuidv4();
    let workspaceId: string | null = null;

    // Store in database if Supabase is configured
    if (isSupabaseServerConfigured()) {
      const supabase = createServerClient();

      if (estimateId) {
        const { data: estimate } = await supabase
          .from('estimates')
          .select('workspace_id')
          .eq('id', estimateId)
          .maybeSingle();

        workspaceId = (estimate?.workspace_id as string | undefined) ?? null;
      }

      const insertPayload = {
        id: requestId,
        workspace_id: workspaceId,
        estimate_id: estimateId || null,
        session_id: sessionId || null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        preferred_contact_method: preferredContactMethod || 'email',
        notes: notes?.trim() || null,
        status: 'pending',
      };

      let { error } = await supabase.from('cma_requests').insert(insertPayload);

      if (error?.code === '23503' && estimateId) {
        console.warn(
          'CMA request estimate_id is not present in legacy estimates table, retrying without foreign key:',
          estimateId
        );

        const retryResult = await supabase.from('cma_requests').insert({
          ...insertPayload,
          estimate_id: null,
        });

        error = retryResult.error;
      }

      if (error) {
        console.error('Failed to store CMA request:', error);
        return NextResponse.json(
          { error: 'Failed to submit request. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // Log the request if no database
      console.log('CMA Request (no database):', {
        requestId,
        name,
        email,
        phone,
        estimateId,
      });
    }

    const notificationResult = await sendCmaRequestNotification({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      estimateId: estimateId || null,
      preferredContactMethod: preferredContactMethod || 'email',
      notes: notes?.trim() || null,
      workspaceId,
    });

    if (!notificationResult.success) {
      console.warn('CMA request notification not sent:', notificationResult.error);
    }

    return NextResponse.json({
      success: true,
      notificationSent: notificationResult.success,
      requestId,
      message: notificationResult.success
        ? 'Your request has been submitted. We will be in touch soon.'
        : 'Your request was saved, but the team notification email could not be delivered.',
    });
  } catch (error) {
    console.error('CMA request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit request. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('cma_requests')
      .select('id, status, created_at')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      requestId: data.id,
      status: data.status,
      submittedAt: data.created_at,
    });
  } catch (error) {
    console.error('CMA request retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve request status' },
      { status: 500 }
    );
  }
}
