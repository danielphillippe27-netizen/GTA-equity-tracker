'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError, type Provider } from '@supabase/supabase-js';
import {
  supabase,
} from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmailPassword: (
    email: string,
    password: string,
    options?: {
      accountType?: 'homeowner' | 'agent' | 'owner';
      createAccount?: boolean;
      fullName?: string;
    }
  ) => Promise<{
    error: AuthError | Error | null;
    message: string | null;
    session: Session | null;
    user: User | null;
  }>;
  signInWithOAuth: (
    provider: Extract<Provider, 'google' | 'apple'>,
    options?: {
      accountType?: 'homeowner' | 'agent' | 'owner';
      next?: string;
    }
  ) => Promise<{ error: AuthError | Error | null }>;
  sendPasswordReset: (
    email: string,
    options?: {
      accountType?: 'homeowner' | 'agent' | 'owner';
    }
  ) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getAuthRedirectBaseUrl() {
  const currentOrigin =
    typeof window === 'undefined' ? null : window.location.origin;
  const currentHostname =
    typeof window === 'undefined' ? null : window.location.hostname;

  if (
    currentHostname === 'localhost' ||
    currentHostname === '127.0.0.1' ||
    currentHostname === '0.0.0.0'
  ) {
    return currentOrigin || 'http://localhost:3000';
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.startsWith('http')
      ? configuredBaseUrl
      : `https://${configuredBaseUrl}`;
  }

  return currentOrigin || 'http://localhost:3000';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmailPassword = useCallback(
    async (
      email: string,
      password: string,
      options?: {
        accountType?: 'homeowner' | 'agent' | 'owner';
        createAccount?: boolean;
        fullName?: string;
      }
    ) => {
      try {
        const accountType = options?.accountType || 'homeowner';
        const createAccount = options?.createAccount === true;
        const fullName = options?.fullName?.trim();
        const metadata =
          createAccount && fullName
            ? {
                accountType,
                name: fullName,
                full_name: fullName,
              }
            : {
                accountType,
              };

        const authResult = createAccount
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: metadata,
              },
            })
          : await supabase.auth.signInWithPassword({
              email,
              password,
            });

        if (authResult.error) {
          return {
            error: authResult.error,
            message: null,
            session: null,
            user: null,
          };
        }

        const activeUser = authResult.data.user;
        const activeSession = authResult.data.session;

        if (!activeUser) {
          return {
            error: new Error(
              createAccount
                ? 'Account created. Check your email to confirm your sign-in.'
                : 'Unable to sign in with email right now.'
            ),
            message: null,
            session: null,
            user: null,
          };
        }

        if (!activeSession && createAccount) {
          return {
            error: null,
            message: 'Account created. Check your email to confirm your sign-in.',
            session: null,
            user: activeUser,
          };
        }

        if (!activeSession?.access_token) {
          return {
            error: new Error('Unable to finish email sign-in right now.'),
            message: null,
            session: null,
            user: activeUser,
          };
        }

        const response = await fetch('/api/auth/bootstrap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeSession.access_token}`,
          },
          body: JSON.stringify({
            accountType,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          return {
            error: new Error(data?.error || 'Unable to finish account setup right now.'),
            message: null,
            session: activeSession,
            user: activeUser,
          };
        }

        return {
          error: null,
          message: createAccount ? 'Account ready. Redirecting to your dashboard...' : null,
          session: activeSession,
          user: activeUser,
        };
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error
              : new Error('Unable to sign in with email right now.'),
          message: null,
          session: null,
          user: null,
        };
      }
    },
    []
  );

  const signInWithOAuth = useCallback(
    async (
      provider: Extract<Provider, 'google' | 'apple'>,
      options?: {
        accountType?: 'homeowner' | 'agent' | 'owner';
        next?: string;
      }
    ) => {
      const intent = options?.accountType || 'homeowner';
      const next = options?.next || '/dashboard';
      const redirectBaseUrl = getAuthRedirectBaseUrl();
      const redirectTo = new URL('/auth/callback', redirectBaseUrl);
      redirectTo.searchParams.set('next', next);
      redirectTo.searchParams.set('intent', intent);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo.toString(),
        },
      });

      return { error };
    },
    []
  );

  const sendPasswordReset = useCallback(
    async (
      email: string,
      options?: {
        accountType?: 'homeowner' | 'agent' | 'owner';
      }
    ) => {
      const intent = options?.accountType || 'homeowner';
      const redirectBaseUrl = getAuthRedirectBaseUrl();
      const redirectTo = new URL('/auth/reset', redirectBaseUrl);
      redirectTo.searchParams.set('intent', intent);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo.toString(),
      });

      return { error };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithEmailPassword,
        signInWithOAuth,
        sendPasswordReset,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
