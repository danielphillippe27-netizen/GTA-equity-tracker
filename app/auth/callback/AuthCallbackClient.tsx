'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPostAuthRedirectPath } from '@/lib/auth/client-routing';
import { supabase } from '@/lib/supabase/client';

type AccountIntent = 'homeowner' | 'agent' | 'owner';

function buildErrorPath(message: string) {
  return `/auth/auth-code-error?message=${encodeURIComponent(message)}`;
}

export function AuthCallbackClient({
  next,
  intent,
  errorMessage,
}: {
  next: string;
  intent: AccountIntent | null;
  errorMessage: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let hasFinished = false;

    async function finalize(accessToken: string) {
      if (cancelled || hasFinished) {
        return;
      }

      hasFinished = true;

      const bootstrapResponse = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          accountType: intent,
        }),
      });

      if (!bootstrapResponse.ok) {
        const payload = (await bootstrapResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        router.replace(buildErrorPath(payload?.error || 'Unable to finish account setup.'));
        return;
      }

      if (next === '/dashboard') {
        const dashboardPath = await getPostAuthRedirectPath(accessToken, next);

        if (!cancelled) {
          router.replace(dashboardPath);
          return;
        }
      }

      if (!cancelled) {
        router.replace(next);
      }
    }

    async function completeSignIn() {
      if (errorMessage) {
        router.replace(buildErrorPath(errorMessage));
        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        router.replace(buildErrorPath(error.message));
        return;
      }

      if (session?.access_token) {
        await finalize(session.access_token);
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (nextSession?.access_token) {
          subscription.unsubscribe();
          await finalize(nextSession.access_token);
        }
      });

      window.setTimeout(() => {
        subscription.unsubscribe();

        if (!hasFinished && !cancelled) {
          router.replace(buildErrorPath('Unable to restore your sign-in session.'));
        }
      }, 4000);
    }

    void completeSignIn();

    return () => {
      cancelled = true;
    };
  }, [errorMessage, intent, next, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent-blue" />
        <p className="text-muted-foreground">Completing sign-in...</p>
      </div>
    </main>
  );
}
