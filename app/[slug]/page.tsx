import { notFound } from 'next/navigation';
import { HeroSection } from '@/components/landing';
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
