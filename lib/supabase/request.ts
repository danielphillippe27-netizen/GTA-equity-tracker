import { cookies } from 'next/headers';
import { createServerClient as createSsrClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

export async function createRequestClient(request: Request): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const authorizationHeader = request.headers.get('authorization');
  const accessToken = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : null;

  if (accessToken) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      supabase,
      user,
    };
  }

  const cookieStore = await cookies();
  const supabase = createSsrClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
  };
}
