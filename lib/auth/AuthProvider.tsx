'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import {
  supabase,
} from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithMagicLink: (
    email: string,
    options?: {
      name?: string;
      propertyData?: Record<string, unknown>;
      redirectTo?: string;
    }
  ) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const signInWithMagicLink = useCallback(
    async (
      email: string,
      options?: {
        name?: string;
        propertyData?: Record<string, unknown>;
        redirectTo?: string;
      }
    ) => {
      const redirectTo =
        options?.redirectTo ||
        `${window.location.origin}/auth/callback?next=/dashboard`;

      try {
        const response = await fetch('/api/auth/magic-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            redirectTo,
            name: options?.name || '',
            propertyData: options?.propertyData || {},
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;

          return {
            error: new Error(
              data?.error || 'Unable to send your sign-in link right now.'
            ),
          };
        }

        return { error: null };
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error
              : new Error('Unable to send your sign-in link right now.'),
        };
      }
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
        signInWithMagicLink,
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
