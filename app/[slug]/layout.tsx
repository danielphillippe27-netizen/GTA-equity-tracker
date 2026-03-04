import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { TenantProvider } from '@/components/tenant/TenantProvider';
import { getWorkspaceBySlug } from '@/lib/workspaces';

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);

  if (!workspace) {
    notFound();
  }

  return (
    <TenantProvider
      tenant={{
        workspaceId: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        brand: workspace.brand,
      }}
    >
      {children}
    </TenantProvider>
  );
}
