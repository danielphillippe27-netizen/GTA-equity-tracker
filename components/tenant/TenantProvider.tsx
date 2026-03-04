'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useParams } from 'next/navigation';
import type { WorkspaceBrand } from '@/lib/workspaces';

export interface TenantContextValue {
  workspaceId: string;
  slug: string;
  name: string;
  brand: WorkspaceBrand | null;
  basePath: string;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({
  children,
  tenant,
}: {
  children: ReactNode;
  tenant: {
    workspaceId: string;
    slug: string;
    name: string;
    brand: WorkspaceBrand | null;
  };
}) {
  const params = useParams();
  const routeSlug =
    typeof params?.slug === 'string' && params.slug.length > 0
      ? params.slug
      : tenant.slug;

  return (
    <TenantContext.Provider
      value={{
        workspaceId: tenant.workspaceId,
        slug: routeSlug,
        name: tenant.name,
        brand: tenant.brand,
        basePath: `/${routeSlug}`,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }

  return context;
}

export function useOptionalTenant() {
  return useContext(TenantContext);
}
