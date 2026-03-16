'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  DatabaseZap,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
  Users2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getPostAuthRedirectPath } from '@/lib/auth/client-routing';

type AuthMode = 'login' | 'create';
type StatusTone = 'neutral' | 'success' | 'error';

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M21.8 12.23c0-.68-.06-1.33-.17-1.95H12v3.69h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.38Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.47l-3.3-2.56c-.91.61-2.08.98-3.47.98-2.67 0-4.93-1.8-5.74-4.22H2.86v2.63A10.22 10.22 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.26 13.73A6.14 6.14 0 0 1 5.94 12c0-.6.11-1.18.32-1.73V7.64H2.86A10.22 10.22 0 0 0 1.8 12c0 1.65.39 3.21 1.06 4.36l3.4-2.63Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.05c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.08 3.04 14.76 2 12 2A10.22 10.22 0 0 0 2.86 7.64l3.4 2.63C7.07 7.85 9.33 6.05 12 6.05Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M15.22 3.5c.76-.92 1.28-2.18 1.14-3.45-1.09.08-2.42.73-3.2 1.65-.7.8-1.31 2.08-1.15 3.31 1.22.09 2.45-.62 3.2-1.51Z" />
      <path d="M19.18 12.36c-.02-2.56 2.09-3.79 2.18-3.84-1.19-1.73-3.03-1.97-3.68-2-1.57-.16-3.06.92-3.86.92-.81 0-2.05-.9-3.37-.88-1.73.03-3.33 1.01-4.22 2.57-1.81 3.13-.46 7.75 1.3 10.29.86 1.24 1.89 2.63 3.25 2.58 1.31-.05 1.81-.84 3.4-.84 1.59 0 2.04.84 3.43.81 1.42-.02 2.31-1.28 3.16-2.53.99-1.44 1.39-2.84 1.41-2.91-.03-.01-2.7-1.04-2.73-4.17Z" />
    </svg>
  );
}

const featureCards = [
  {
    icon: <Users2 className="h-5 w-5 text-accent-cyan" />,
    title: 'Client Dashboard',
    description: 'Give homeowners a clean login for their saved equity tracking and report history.',
  },
  {
    icon: <DatabaseZap className="h-5 w-5 text-accent-cyan" />,
    title: 'Live Market Context',
    description: 'Use recent market stats alongside your saved estimate data inside one account.',
  },
  {
    icon: <BadgeDollarSign className="h-5 w-5 text-accent-cyan" />,
    title: 'Supabase Auth',
    description: 'Account creation and login are handled directly through the Supabase auth flow.',
  },
];

function getStatusClasses(tone: StatusTone) {
  if (tone === 'error') {
    return 'border-red-400/30 bg-red-500/10 text-red-100';
  }

  if (tone === 'success') {
    return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
  }

  return 'border-border bg-background text-muted-foreground';
}

export function AuthEntryPage({
  defaultMode = 'login',
  nextPath = '/phillippegroup',
}: {
  defaultMode?: AuthMode;
  nextPath?: string;
}) {
  const router = useRouter();
  const { signInWithEmailPassword, signInWithOAuth, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>('neutral');

  function updateMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStatus(null);
    setStatusTone('neutral');
  }

  async function routeToDashboard(accessToken: string) {
    const resolvedPath = await getPostAuthRedirectPath(accessToken, nextPath);
    router.push(resolvedPath);
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setStatusTone('neutral');

    const result = await signInWithEmailPassword(email, password, {
      accountType: 'homeowner',
      createAccount: mode === 'create',
      fullName,
    });

    if (result.error) {
      setSubmitting(false);
      setStatusTone('error');
      setStatus(
        result.error.message === 'Invalid login credentials'
          ? 'Account not found or password incorrect. If you are new, switch to Create account.'
          : result.error.message
      );
      return;
    }

    if (result.message) {
      setStatusTone('success');
      setStatus(result.message);
    }

    if (result.session?.access_token) {
      await routeToDashboard(result.session.access_token);
      return;
    }

    setSubmitting(false);
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setSubmitting(true);
    setStatus(null);
    setStatusTone('neutral');

    const { error } = await signInWithOAuth(provider, {
      accountType: 'homeowner',
      next: nextPath,
    });

    if (error) {
      setSubmitting(false);
      setStatusTone('error');
      setStatus(error.message);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setStatusTone('error');
      setStatus('Enter your email first, then reset your password.');
      return;
    }

    setSubmitting(true);
    setStatus(null);
    setStatusTone('neutral');

    const { error } = await sendPasswordReset(email, { accountType: 'homeowner' });
    setSubmitting(false);

    if (error) {
      setStatusTone('error');
      setStatus(error.message);
      return;
    }

    setStatusTone('success');
    setStatus('Password reset email sent. Use it to set your password, then sign in.');
  }

  const title = mode === 'create' ? 'Create Your Account' : 'Log In to Your Account';
  const primaryLabel = mode === 'create' ? 'Create Account' : 'Log In';

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,188,212,0.16),transparent_26%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.16),transparent_24%),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:auto,auto,72px_72px,72px_72px] opacity-70 pointer-events-none" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-10 sm:px-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-cyan" />
            EquityTracker.ca
          </div>

          <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
            Log in or create your
            <span className="block text-accent-cyan">Equity Tracker account</span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Account access is wired through Supabase authentication. Sign in to your client
            dashboard or create a new account to save your equity history and reports.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {featureCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-border bg-surface/70 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-cyan/10">
                  {card.icon}
                </div>
                <p className="text-base font-semibold text-foreground">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-10 lg:mt-0"
        >
          <div className="rounded-[2rem] border border-border bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(9,16,28,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-18 w-18 items-center justify-center rounded-[1.75rem] bg-accent-cyan/10">
                <Building2 className="h-8 w-8 text-accent-cyan" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  Client Access
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-foreground">{title}</h2>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background/70 p-1">
              <button
                type="button"
                onClick={() => updateMode('login')}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  mode === 'login'
                    ? 'bg-accent-blue text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => updateMode('create')}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  mode === 'create'
                    ? 'bg-accent-blue text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create Account
              </button>
            </div>

            <div className="mt-8 grid gap-3">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 py-4 text-sm font-medium text-foreground transition-colors hover:border-accent-blue/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleLogo />
                {mode === 'create' ? 'Create with Google' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('apple')}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 py-4 text-sm font-medium text-foreground transition-colors hover:border-accent-blue/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AppleLogo />
                {mode === 'create' ? 'Create with Apple' : 'Continue with Apple'}
              </button>
            </div>

            <div className="my-7 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              Or continue with email
              <div className="h-px flex-1 bg-border" />
            </div>

            <form className="grid gap-4" onSubmit={handleEmailSubmit}>
              {mode === 'create' ? (
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground" htmlFor="full-name">
                    Full name
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <input
                      id="full-name"
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                      placeholder="Jane Smith"
                      className="w-full bg-transparent py-4 text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground" htmlFor="email">
                  Email
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-transparent py-4 text-sm text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-muted-foreground" htmlFor="password">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    placeholder={mode === 'create' ? 'At least 8 characters' : 'Enter your password'}
                    className="w-full bg-transparent py-4 text-sm text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 px-4 py-3 text-xs uppercase tracking-[0.22em] text-accent-cyan">
                {mode === 'create'
                  ? 'New accounts are created in Supabase for client-facing dashboard access.'
                  : 'Existing accounts log straight into the Supabase-backed client dashboard.'}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-2xl bg-accent-blue px-4 py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </button>

              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={submitting}
                  className="rounded-2xl border border-border bg-background px-4 py-4 text-sm font-medium text-foreground transition-colors hover:border-accent-blue/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset Password
                </button>
              ) : null}
            </form>

            {status ? (
              <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${getStatusClasses(statusTone)}`}>
                {status}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <Link href="/estimate" className="text-accent-cyan transition-colors hover:text-accent-blue">
                Open estimate tool
              </Link>
              <span className="text-border">/</span>
              <Link href="/phillippegroup" className="text-accent-cyan transition-colors hover:text-accent-blue">
                View a public equity page
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
