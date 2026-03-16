'use client';

export interface AuthDashboardPayload {
  accountType?: 'homeowner';
}

export function getDashboardPath() {
  return '/phillippegroup';
}

export async function getPostAuthRedirectPath(
  accessToken: string,
  fallback: string = '/phillippegroup'
) {
  if (fallback !== '/phillippegroup') {
    return fallback;
  }

  try {
    const response = await fetch('/api/dashboard', {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return fallback;
    }

    await response.json() as AuthDashboardPayload;
    return getDashboardPath();
  } catch {
    return fallback;
  }
}
