import { createServerClient } from '@/lib/supabase/server';
import {
  isReservedWorkspaceSlug,
} from '@/lib/workspace-slugs';

export interface WorkspaceBrand {
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  tagline?: string | null;
  ctaText?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface WorkspaceRecord {
  id: string;
  slug: string;
  name: string;
  brand: WorkspaceBrand | null;
  created_at?: string | null;
}

export function buildWorkspacePath(slug: string, path: string = '') {
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `/${slug}${normalizedPath}`;
}

export async function getWorkspaceBySlug(slug: string): Promise<WorkspaceRecord | null> {
  if (!slug || isReservedWorkspaceSlug(slug)) {
    return null;
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, slug, name, brand, created_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as WorkspaceRecord;
}
