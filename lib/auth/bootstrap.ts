import type { User } from '@supabase/supabase-js';
import { createServerClient as createServiceRoleClient } from '@/lib/supabase/server';

export type AccountType = 'homeowner';

interface ProfileRecord {
  default_workspace_id?: string | null;
}

export function parseAccountType(value: string | null | undefined): AccountType | null {
  if (value === 'homeowner') {
    return value;
  }

  return null;
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
    .select('default_workspace_id')
    .eq('id', user.id)
    .maybeSingle();

  const metadataAccountType = parseAccountType(
    typeof user.user_metadata?.accountType === 'string' ? user.user_metadata.accountType : null
  );

  await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: normalizedEmail,
      name: profileName,
      property_data: propertyData,
      primary_estimate_id:
        (subscriber?.estimate_id as string | null | undefined) ??
        (typeof propertyData.estimateId === 'string' ? propertyData.estimateId : null),
      account_type: authIntent ?? metadataAccountType ?? 'homeowner',
      default_workspace_id:
        (existingProfile as ProfileRecord | null | undefined)?.default_workspace_id ?? null,
    },
    { onConflict: 'id' }
  );
}
