import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { bootstrapUserProfile, parseAccountType } from '@/lib/auth/bootstrap';

export async function POST(request: Request) {
  const authorizationHeader = request.headers.get('authorization');
  const accessToken = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : null;

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {}
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { accountType?: string };
  const accountType = parseAccountType(body.accountType ?? null);

  await bootstrapUserProfile(user, accountType);

  return NextResponse.json({ success: true, accountType: accountType ?? 'homeowner' });
}
