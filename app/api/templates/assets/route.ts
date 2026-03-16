import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/request';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isFounderEmail } from '@/lib/founder-access';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

function sanitizeFilename(filename: string) {
  const extension = path.extname(filename).toLowerCase() || '.png';
  const base = path.basename(filename, extension).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return `${base || 'logo'}-${randomUUID().slice(0, 8)}${extension}`;
}

export async function POST(request: Request) {
  const { user } = await createRequestClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const founderAccess = isFounderEmail(user.email);

  const formData = await request.formData();
  const workspaceId = String(formData.get('workspaceId') || '').trim();
  const upload = formData.get('file');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required.' }, { status: 400 });
  }

  if (!(upload instanceof File)) {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(upload.type)) {
    return NextResponse.json(
      { error: 'Only PNG, JPG, WEBP, and SVG files are supported.' },
      { status: 400 }
    );
  }

  if (upload.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File size must be 5 MB or smaller.' },
      { status: 400 }
    );
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
      { error: 'Only workspace owners can upload template assets.' },
      { status: 403 }
    );
  }

  const filename = sanitizeFilename(upload.name);
  const relativeDir = path.join('template-assets', workspaceId);
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir);

  await mkdir(absoluteDir, { recursive: true });

  const bytes = await upload.arrayBuffer();
  await writeFile(path.join(absoluteDir, filename), Buffer.from(bytes));

  return NextResponse.json({
    success: true,
    url: `/${relativeDir}/${filename}`,
  });
}
