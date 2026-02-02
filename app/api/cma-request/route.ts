import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
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

    // Store in database if Supabase is configured
    if (isSupabaseServerConfigured()) {
      const supabase = createServerClient();
      
      const { error } = await supabase.from('cma_requests').insert({
        id: requestId,
        estimate_id: estimateId || null,
        session_id: sessionId || null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        preferred_contact_method: preferredContactMethod || 'email',
        notes: notes?.trim() || null,
        status: 'pending',
      });

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

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Your request has been submitted. We will be in touch soon.',
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
