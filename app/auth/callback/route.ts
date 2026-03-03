import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const normalizedEmail = user.email.toLowerCase().trim();
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('name, property_data, estimate_id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        const propertyData =
          (subscriber?.property_data as Record<string, unknown> | null) ??
          ((user.user_metadata?.propertyData as Record<string, unknown> | undefined) ?? {});
        const profileName =
          subscriber?.name ||
          (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '') ||
          (typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : '');

        await supabase.from('profiles').upsert(
          {
            id: user.id,
            email: normalizedEmail,
            name: profileName,
            property_data: propertyData,
            primary_estimate_id:
              (subscriber?.estimate_id as string | null | undefined) ??
              (typeof propertyData.estimateId === 'string'
                ? propertyData.estimateId
                : null),
          },
          { onConflict: 'id' }
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
