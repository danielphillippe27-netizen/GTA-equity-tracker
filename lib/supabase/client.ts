import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Browser client - uses anon key, safe for client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Database features will not work.'
  );
}

// Note: We use a generic client here. For production, run `supabase gen types`
// to generate accurate types from your actual database schema.
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true, // Enable session persistence for auth
      autoRefreshToken: true,
    },
  }
);

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
