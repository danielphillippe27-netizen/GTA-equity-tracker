import type { User } from '@supabase/supabase-js';
import { createServerClient as createServiceRoleClient } from '@/lib/supabase/server';
import {
  isReservedWorkspaceSlug,
  normalizeWorkspaceSlug,
} from '@/lib/workspace-slugs';

export type AccountType = 'homeowner' | 'agent' | 'owner';

interface ProfileRecord {
  id: string;
  email: string | null;
  name: string | null;
  property_data: Record<string, unknown> | null;
  primary_estimate_id: string | null;
  account_type?: AccountType;
  default_workspace_id?: string | null;
}

export function parseAccountType(value: string | null | undefined): AccountType | null {
  if (value === 'homeowner' || value === 'agent' || value === 'owner') {
    return value;
  }

  return null;
}

async function createAvailableWorkspaceSlug(
  preferredValue: string,
  userId: string
) {
  const supabase = createServiceRoleClient();
  const normalizedPreferred = normalizeWorkspaceSlug(preferredValue);
  const fallbackToken = userId.slice(0, 8).toLowerCase();

  let baseSlug = normalizedPreferred || `workspace-${fallbackToken}`;
  if (isReservedWorkspaceSlug(baseSlug)) {
    baseSlug = normalizeWorkspaceSlug(`${baseSlug}-${fallbackToken}`) || `workspace-${fallbackToken}`;
  }

  let candidate = baseSlug;
  let attempt = 2;

  while (true) {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    const suffix = `-${attempt}`;
    const trimmedBase = baseSlug.slice(0, Math.max(1, 42 - suffix.length));
    candidate = `${trimmedBase}${suffix}`;
    attempt += 1;
  }
}

async function ensureWorkspaceForUser(
  userId: string,
  email: string,
  name: string,
  accountType: AccountType,
  currentWorkspaceId: string | null | undefined
) {
  if (accountType === 'homeowner') {
    return currentWorkspaceId ?? null;
  }

  const supabase = createServiceRoleClient();
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership?.workspace_id) {
    if (!currentWorkspaceId) {
      await supabase
        .from('profiles')
        .update({ default_workspace_id: membership.workspace_id })
        .eq('id', userId);
    }

    return membership.workspace_id;
  }

  const workspaceBaseName =
    name.trim() || email.split('@')[0] || `${accountType}-workspace`;
  const workspaceName =
    accountType === 'owner'
      ? `${workspaceBaseName} Platform`
      : `${workspaceBaseName} Advisory`;
  const preferredSlug = email.split('@')[0] || workspaceBaseName || accountType;
  const slug = await createAvailableWorkspaceSlug(preferredSlug, userId);

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      name: workspaceName,
      slug,
      created_by: userId,
    })
    .select('id')
    .single();

  if (workspaceError) {
    throw workspaceError;
  }

  const workspaceId = workspace.id as string;

  const { error: membershipError } = await supabase
    .from('workspace_memberships')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: 'owner',
    });

  if (membershipError) {
    throw membershipError;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ default_workspace_id: workspaceId })
    .eq('id', userId);

  if (profileError) {
    throw profileError;
  }

  return workspaceId;
}

export async function bootstrapUserProfile(user: User, authIntent?: AccountType | null) {
  if (!user.email) {
    return;
  }

  const supabase = createServiceRoleClient();
  const normalizedEmail = user.email.toLowerCase().trim();
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('name, property_data, estimate_id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  const propertyData =
    (subscriber?.property_data as Record<string, unknown> | null) ??
    ((user.user_metadata?.propertyData as Record<string, unknown> | undefined) ?? {});
  const profileName =
    subscriber?.name ||
    (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '') ||
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '');

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email, name, property_data, primary_estimate_id, account_type, default_workspace_id')
    .eq('id', user.id)
    .maybeSingle();

  const metadataAccountType = parseAccountType(
    typeof user.user_metadata?.accountType === 'string' ? user.user_metadata.accountType : null
  );

  const nextAccountType =
    authIntent ??
    metadataAccountType ??
    (existingProfile as ProfileRecord | null | undefined)?.account_type ??
    'homeowner';

  const profilePayload = {
    id: user.id,
    email: normalizedEmail,
    name: profileName,
    property_data: propertyData,
    primary_estimate_id:
      (subscriber?.estimate_id as string | null | undefined) ??
      (typeof propertyData.estimateId === 'string' ? propertyData.estimateId : null),
    account_type: nextAccountType,
    default_workspace_id:
      (existingProfile as ProfileRecord | null | undefined)?.default_workspace_id ?? null,
  };

  await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });

  await ensureWorkspaceForUser(
    user.id,
    normalizedEmail,
    profileName,
    nextAccountType,
    (existingProfile as ProfileRecord | null | undefined)?.default_workspace_id
  );
}
