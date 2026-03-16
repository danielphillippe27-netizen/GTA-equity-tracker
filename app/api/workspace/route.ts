import { NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/request';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isFounderEmail } from '@/lib/founder-access';
import {
  normalizeWorkspaceSlug,
  validateWorkspaceSlug,
} from '@/lib/workspace-slugs';
import type {
  MonthlyReportTemplateSettings,
  WorkspaceBrand,
  WorkspaceSettings,
} from '@/lib/workspaces';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function sanitizeBrand(input: unknown): WorkspaceBrand | null {
  if (!isRecord(input)) {
    return null;
  }

  return {
    logoUrl: normalizeOptionalText(input.logoUrl, 1000),
  };
}

function sanitizeSettings(input: unknown): WorkspaceSettings | null {
  if (!isRecord(input)) {
    return null;
  }

  const templateInput = isRecord(input.monthlyReportTemplate)
    ? input.monthlyReportTemplate
    : null;

  const monthlyReportTemplate: MonthlyReportTemplateSettings | null = templateInput
      ? {
          brandName: normalizeOptionalText(templateInput.brandName, 120),
          introText: normalizeOptionalText(templateInput.introText, 600),
          ctaText: normalizeOptionalText(templateInput.ctaText, 80),
          footerNote: normalizeOptionalText(templateInput.footerNote, 300),
          bottomLogoLeftUrl: normalizeOptionalText(templateInput.bottomLogoLeftUrl, 1000),
          bottomLogoUrl: normalizeOptionalText(templateInput.bottomLogoUrl, 1000),
          bottomLogoRightUrl: normalizeOptionalText(templateInput.bottomLogoRightUrl, 1000),
        }
      : null;

  return {
    monthlyReportTemplate,
  };
}

export async function PATCH(request: Request) {
  const { user } = await createRequestClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const founderAccess = isFounderEmail(user.email);

  const supabase = createServiceRoleClient();

  const body = (await request.json().catch(() => null)) as
    | {
        workspaceId?: string;
        slug?: string;
        brand?: WorkspaceBrand | null;
        settings?: WorkspaceSettings | null;
      }
    | null;

  if (!body?.workspaceId) {
    return NextResponse.json(
      { error: 'workspaceId is required.' },
      { status: 400 }
    );
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

  if (!membership && !founderAccess) {
    return NextResponse.json(
      { error: 'Only workspace owners can edit workspace settings.' },
      { status: 403 }
    );
  }

  const { data: existingWorkspace, error: existingWorkspaceError } = await supabase
    .from('workspaces')
    .select('id, name, slug, brand, settings')
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

  const updatePayload: {
    slug?: string;
    brand?: WorkspaceBrand;
    settings?: WorkspaceSettings;
    updated_at?: string;
  } = {};

  if (typeof body.slug === 'string') {
    const slug = normalizeWorkspaceSlug(body.slug);
    const slugError = validateWorkspaceSlug(slug);

    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    if (existingWorkspace.slug !== slug) {
      updatePayload.slug = slug;
    }
  }

  if (body.brand !== undefined) {
    updatePayload.brand = {
      ...(isRecord(existingWorkspace.brand) ? (existingWorkspace.brand as WorkspaceBrand) : {}),
      ...(sanitizeBrand(body.brand) ?? {}),
    };
  }

  if (body.settings !== undefined) {
    const existingSettings = isRecord(existingWorkspace.settings)
      ? (existingWorkspace.settings as WorkspaceSettings)
      : {};
    const nextSettings = sanitizeSettings(body.settings) ?? {};
    updatePayload.settings = {
      ...existingSettings,
      ...nextSettings,
      monthlyReportTemplate: {
        ...(isRecord(existingSettings.monthlyReportTemplate)
          ? (existingSettings.monthlyReportTemplate as MonthlyReportTemplateSettings)
          : {}),
        ...(isRecord(nextSettings.monthlyReportTemplate)
          ? (nextSettings.monthlyReportTemplate as MonthlyReportTemplateSettings)
          : {}),
      },
    };
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({
      workspace: existingWorkspace,
      publicUrl: `https://equitytracker.ca/${existingWorkspace.slug}`,
    });
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data: updatedWorkspace, error: updateError } = await supabase
    .from('workspaces')
    .update(updatePayload)
    .eq('id', body.workspaceId)
    .select('id, name, slug, brand, settings')
    .single();

  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json(
        { error: 'That workspace URL is already taken.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update workspace settings.', detail: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    workspace: updatedWorkspace,
    publicUrl: `https://equitytracker.ca/${updatedWorkspace.slug}`,
  });
}
