import { cookies } from 'next/headers';
import { createServerClient as createSsrClient } from '@supabase/ssr';
import { notFound, redirect } from 'next/navigation';
import { HeroSection } from '@/components/landing';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getWorkspaceBySlug } from '@/lib/workspaces';

export default async function TenantLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);

  if (!workspace) {
    notFound();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
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

    if (user) {
      const serviceRoleClient = createServiceRoleClient();
      const [{ data: profile }, { data: membership }] = await Promise.all([
        serviceRoleClient
          .from('profiles')
          .select('account_type, default_workspace_id')
          .eq('id', user.id)
          .maybeSingle(),
        serviceRoleClient
          .from('workspace_memberships')
          .select('workspace_id')
          .eq('user_id', user.id)
          .eq('workspace_id', workspace.id)
          .maybeSingle(),
      ]);

      const isAgentAccount =
        profile?.account_type === 'agent' || profile?.account_type === 'owner';
      const belongsToWorkspace =
        Boolean(membership?.workspace_id) ||
        profile?.default_workspace_id === workspace.id;

      if (isAgentAccount && belongsToWorkspace) {
        redirect(`/${workspace.slug}/dashboard`);
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <HeroSection
        workspaceSlug={workspace.slug}
        workspaceName={workspace.name}
        brand={workspace.brand}
      />
    </main>
  );
}
