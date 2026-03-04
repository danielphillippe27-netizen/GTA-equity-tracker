import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// Browser client - uses anon key, safe for client-side
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Database features will not work.'
  );
}

// Note: We use a generic client here. For production, run `supabase gen types`
// to generate accurate types from your actual database schema.
export const supabase: SupabaseClient = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClientConfigError(): string | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
  }

  try {
    const { hostname, protocol } = new URL(supabaseUrl);

    if (protocol !== 'https:') {
      return `Supabase URL must use https. Current value: ${supabaseUrl}`;
    }

    if (!hostname.endsWith('.supabase.co')) {
      return `Supabase URL must point to your project host. Current value: ${supabaseUrl}`;
    }
  } catch {
    return `Supabase URL is invalid: ${supabaseUrl}`;
  }

  return null;
}
