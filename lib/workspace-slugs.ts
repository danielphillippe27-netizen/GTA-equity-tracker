export const RESERVED_WORKSPACE_SLUGS = new Set([
  'api',
  'auth',
  'billing',
  'clients',
  'dashboard',
  'data',
  'estimate',
  'evaluation',
  'favicon.ico',
  'imports',
  'login',
  'results',
  'settings',
]);

const WORKSPACE_SLUG_MAX_LENGTH = 42;
const WORKSPACE_SLUG_MIN_LENGTH = 3;

export function normalizeWorkspaceSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, WORKSPACE_SLUG_MAX_LENGTH);
}

export function isReservedWorkspaceSlug(slug: string) {
  return RESERVED_WORKSPACE_SLUGS.has(slug.toLowerCase());
}

export function validateWorkspaceSlug(slug: string) {
  if (!slug) {
    return 'Enter a workspace URL.';
  }

  if (slug.length < WORKSPACE_SLUG_MIN_LENGTH) {
    return 'Workspace URL must be at least 3 characters.';
  }

  if (slug.length > WORKSPACE_SLUG_MAX_LENGTH) {
    return 'Workspace URL must be 42 characters or fewer.';
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'Use lowercase letters, numbers, and hyphens only.';
  }

  if (isReservedWorkspaceSlug(slug)) {
    return 'That URL is reserved by the app.';
  }

  return null;
}
