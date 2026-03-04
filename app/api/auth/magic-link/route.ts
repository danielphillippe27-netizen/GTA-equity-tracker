import { NextRequest, NextResponse } from 'next/server';

function getConfigError() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
  }

  try {
    const { protocol, hostname } = new URL(supabaseUrl);
    if (protocol !== 'https:') {
      return `Supabase URL must use https. Current value: ${supabaseUrl}`;
    }

    if (!hostname.endsWith('.supabase.co')) {
      return `Supabase URL must point to your project host. Current value: ${supabaseUrl}`;
    }
  } catch {
    return `Supabase URL is invalid: ${supabaseUrl}`;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const configError = getConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { email, redirectTo, name, propertyData, accountType } = body as {
      email?: string;
      redirectTo?: string;
      name?: string;
      propertyData?: Record<string, unknown>;
      accountType?: 'homeowner' | 'agent' | 'owner';
    };

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email is required.' },
        { status: 400 }
      );
    }

    if (!redirectTo) {
      return NextResponse.json(
        { error: 'A redirect URL is required.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        create_user: true,
        email_redirect_to: redirectTo,
        data: {
          name: name || '',
          propertyData: propertyData || {},
          accountType: accountType || 'homeowner',
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          error: text || 'Supabase rejected the magic link request.',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let targetHost = 'your Supabase project';

    if (supabaseUrl) {
      try {
        targetHost = new URL(supabaseUrl).hostname;
      } catch {
        targetHost = supabaseUrl;
      }
    }

    return NextResponse.json(
      {
        error: `Unable to reach ${targetHost}. Check NEXT_PUBLIC_SUPABASE_URL, DNS, and your Supabase project status.`,
      },
      { status: 502 }
    );
  }
}
