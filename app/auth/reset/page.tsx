'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError('Password updated, but your session could not be restored. Please sign in again.');
      setSubmitting(false);
      return;
    }

    const accountType = searchParams.get('intent') === 'agent' ? 'agent' : 'homeowner';
    const bootstrapResponse = await fetch('/api/auth/bootstrap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ accountType }),
    });

    if (!bootstrapResponse.ok) {
      setError('Password updated, but account setup failed. Please sign in again.');
      setSubmitting(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-border bg-surface/85 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-cyan" />
          Realtor Password Setup
        </div>

        <h1 className="mt-6 text-3xl font-semibold text-foreground">Set your password</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Create a password for your Realtor dashboard so future logins can go straight in.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-muted-foreground" htmlFor="password">
            New password
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-transparent py-4 text-sm text-foreground outline-none"
              />
            </div>
          </label>

          <label className="grid gap-2 text-sm text-muted-foreground" htmlFor="confirm-password">
            Confirm password
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat password"
                className="w-full bg-transparent py-4 text-sm text-foreground outline-none"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-accent-blue px-4 py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving password...' : 'Save Password'}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="mt-8 text-sm text-muted-foreground">
          <Link href="/login" className="text-accent-cyan transition-colors hover:text-accent-blue">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}

function ResetPasswordFallback() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-border bg-surface/85 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
        <p className="text-sm text-muted-foreground">Loading password reset…</p>
      </div>
    </main>
  );
}
