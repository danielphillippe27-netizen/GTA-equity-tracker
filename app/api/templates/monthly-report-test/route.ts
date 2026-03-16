import { NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/request';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendTestMonthlyReport } from '@/lib/email/resend';
import { isFounderEmail } from '@/lib/founder-access';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { user } = await createRequestClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const founderAccess = isFounderEmail(user.email);

  const body = (await request.json().catch(() => null)) as
    | {
        workspaceId?: string;
        email?: string;
        name?: string;
      }
    | null;

  const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : 'Test';

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required.' }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: 'Failed to verify workspace membership.', detail: membershipError.message },
      { status: 500 }
    );
  }

  if (!membership && !founderAccess) {
    return NextResponse.json(
      { error: 'Only workspace owners can send test emails.' },
      { status: 403 }
    );
  }

  const sendResult = await sendTestMonthlyReport({
    to: email,
    workspaceId,
    name,
  });

  if (!sendResult.success) {
    return NextResponse.json(
      {
        error:
          sendResult.error instanceof Error
            ? sendResult.error.message
            : String(sendResult.error),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Test email sent to ${email}.`,
  });
}
