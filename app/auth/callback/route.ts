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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      // Link subscriber to profile if they signed up before (by email)
      const userEmail = data.user.email;
      if (userEmail) {
        // Update any existing subscriber with this email to link to the profile
        await supabase
          .from('subscribers')
          .update({ profile_id: data.user.id })
          .eq('email', userEmail.toLowerCase())
          .is('profile_id', null);
          
        // Also ensure profile exists (for OAuth users)
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: userEmail,
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
