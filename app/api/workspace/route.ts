import { NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/request';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  normalizeWorkspaceSlug,
  validateWorkspaceSlug,
} from '@/lib/workspace-slugs';

export async function PATCH(request: Request) {
  const { user } = await createRequestClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const body = (await request.json().catch(() => null)) as
    | {
        workspaceId?: string;
        slug?: string;
      }
    | null;

  if (!body?.workspaceId || typeof body.slug !== 'string') {
    return NextResponse.json(
      { error: 'workspaceId and slug are required.' },
      { status: 400 }
    );
  }

  const slug = normalizeWorkspaceSlug(body.slug);
  const slugError = validateWorkspaceSlug(slug);

  if (slugError) {
    return NextResponse.json({ error: slugError }, { status: 400 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role')
    .eq('workspace_id', body.workspaceId)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: 'Failed to verify workspace membership.', detail: membershipError.message },
      { status: 500 }
    );
  }

  if (!membership) {
    return NextResponse.json(
      { error: 'Only workspace owners can edit the workspace URL.' },
      { status: 403 }
    );
  }

  const { data: existingWorkspace, error: existingWorkspaceError } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('id', body.workspaceId)
    .maybeSingle();

  if (existingWorkspaceError) {
    return NextResponse.json(
      { error: 'Failed to load workspace.', detail: existingWorkspaceError.message },
      { status: 500 }
    );
  }

  if (!existingWorkspace) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }

  if (existingWorkspace.slug === slug) {
    return NextResponse.json({
      workspace: existingWorkspace,
      publicUrl: `https://equitytracker.ca/${existingWorkspace.slug}`,
    });
  }

  const { data: updatedWorkspace, error: updateError } = await supabase
    .from('workspaces')
    .update({
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.workspaceId)
    .select('id, name, slug')
    .single();

  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json(
        { error: 'That workspace URL is already taken.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update workspace URL.', detail: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    workspace: updatedWorkspace,
    publicUrl: `https://equitytracker.ca/${updatedWorkspace.slug}`,
  });
}
