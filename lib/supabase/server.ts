import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side client - can use service role for elevated permissions
// Note: We use a generic client here since the actual schema types are defined
// in the Database but Supabase CLI would generate more accurate types.
// For now, we use 'any' to allow flexible table operations.
export function createServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
      'Missing Supabase server environment variables. Using anon key fallback.'
    );
    // Fall back to anon key if service key not available
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      anonKey || 'placeholder-key'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Helper to check if Supabase server is configured
export function isSupabaseServerConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
