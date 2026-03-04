import { NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/request';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runTrrebImport, stageTrrebImportFiles, type UploadedImportFile } from '@/lib/imports/trreb';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  const { user } = await createRequestClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const formData = await request.formData();
  const uploads = formData.getAll('files').filter((value): value is File => value instanceof File);
  const metadata = formData.getAll('metadata').map((value) => String(value));

  if (!uploads.length) {
    return NextResponse.json({ error: 'At least one file is required.' }, { status: 400 });
  }

  const uploadPayload: UploadedImportFile[] = uploads.map((file, index) => {
    let relativePath = '';
    try {
      const parsed = JSON.parse(metadata[index] || '{}') as { relativePath?: string };
      relativePath = parsed.relativePath || '';
    } catch {
      relativePath = '';
    }

    return { file, relativePath };
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, default_workspace_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.account_type === 'homeowner') {
    return NextResponse.json(
      { error: 'Only agent accounts can run data imports.' },
      { status: 403 }
    );
  }

  const requestedSlug = new URL(request.url).searchParams.get('slug');
  let workspaceId = profile.default_workspace_id as string | null;

  if (requestedSlug) {
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', requestedSlug)
      .maybeSingle();

    if (workspaceError) {
      return NextResponse.json(
        { error: 'Failed to resolve workspace.', detail: workspaceError.message },
        { status: 500 }
      );
    }

    workspaceId = (workspace?.id as string | undefined) ?? null;
  }

  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace found for this account.' }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership && profile.default_workspace_id !== workspaceId) {
    return NextResponse.json(
      { error: 'Only workspace members can run data imports.' },
      { status: 403 }
    );
  }

  const { data: job, error: createError } = await supabase
    .from('data_import_jobs')
    .insert({
      workspace_id: workspaceId,
      uploaded_by_user_id: user.id,
      import_type: 'data-upload',
      status: 'queued',
      source_filename: `Data upload (${uploads.length} file${uploads.length === 1 ? '' : 's'})`,
      summary: {
        stagedFrom: 'dashboard-upload',
        uploadedFileCount: uploads.length,
        processor: 'dashboard-upload',
      },
    })
    .select('id')
    .single();

  if (createError || !job) {
    return NextResponse.json(
      { error: 'Failed to create import job.', detail: createError?.message },
      { status: 500 }
    );
  }

  const jobId = job.id as string;

  try {
    const staged = await stageTrrebImportFiles(workspaceId, jobId, uploadPayload);

    const baseSummary = {
      stagedFrom: 'dashboard-upload',
      uploadedFileCount: uploads.length,
      processor: staged.canRunTrrebImport ? 'scripts/import_trreb_market_data.py' : 'manual-review',
      hpiCount: staged.hpiCount,
      marketWatchCount: staged.marketWatchCount,
      historicFile: staged.historicFile,
      rawFileCount: staged.rawFileCount,
      autoProcessed: staged.canRunTrrebImport,
      files: staged.files.map((file) => ({
        name: file.name,
        category: file.category,
      })),
    };

    await supabase
      .from('data_import_jobs')
      .update({
        import_type: staged.canRunTrrebImport ? 'trreb-market-data' : 'data-upload',
        status: staged.canRunTrrebImport ? 'processing' : 'completed',
        started_at: new Date().toISOString(),
        finished_at: staged.canRunTrrebImport ? null : new Date().toISOString(),
        storage_path: staged.stagedRoot,
        summary: baseSummary,
      })
      .eq('id', jobId);

    if (!staged.canRunTrrebImport) {
      return NextResponse.json({
        jobId,
        status: 'completed',
        summary: baseSummary,
      });
    }

    const result = await runTrrebImport(staged);

    await supabase
      .from('data_import_jobs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        summary: {
          ...baseSummary,
          importSummary: result.parsedSummary,
          outputTail: result.output.slice(-4000),
        },
      })
      .eq('id', jobId);

    return NextResponse.json({
      jobId,
      status: 'completed',
      summary: result.parsedSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown import failure';

    await supabase
      .from('data_import_jobs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: message,
      })
      .eq('id', jobId);

    return NextResponse.json(
      {
        error: message,
        jobId,
      },
      { status: 500 }
    );
  }
}
