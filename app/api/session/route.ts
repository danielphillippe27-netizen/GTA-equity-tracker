import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metadata } = body;

    // Generate session ID
    const sessionId = uuidv4();

    // If Supabase is configured, store the session
    if (isSupabaseServerConfigured()) {
      const supabase = createServerClient();
      
      const { error } = await supabase.from('sessions').insert({
        metadata: metadata || {},
      });

      if (error) {
        console.error('Failed to create session in database:', error);
        // Continue anyway - we can still generate estimates without persistence
      }
    }

    return NextResponse.json({ sessionId }, { status: 201 });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({ session: { id: sessionId } });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}
