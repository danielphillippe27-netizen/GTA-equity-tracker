'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ImportCategory = 'hpi' | 'market-watch' | 'historic' | 'ignored';

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatFileSize(bytes: number | undefined) {
  if (!bytes || bytes <= 0) {
    return 'Unknown size';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function classifyQueuedTrrebFile(file: File): ImportCategory {
  const source = file.name.toLowerCase();

  if (!source.endsWith('.pdf')) {
    return 'ignored';
  }

  if (source.includes('historic')) {
    return 'historic';
  }

  if (
    source.includes('market watch') ||
    source.includes('market_watch') ||
    /^mw\d/.test(source)
  ) {
    return 'market-watch';
  }

  if (
    source.includes('hpi') ||
    source.includes('benchmark summary') ||
    source.includes('trreb_mls_hpi')
  ) {
    return 'hpi';
  }

  return 'ignored';
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
        {description}
      </p>
    </div>
  );
}

export function DashboardMetric({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-3xl border border-border bg-surface/85 p-5', className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-cyan/10">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function DashboardCard({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-3xl border border-border bg-surface/85 p-6', className)}>
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-cyan/10">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function BillingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-2 leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function AgentOnlyState() {
  return (
    <DashboardCard
      title="Agent workspace required"
      description="This section is available inside the Realtor workspace shell."
      icon={<div className="h-5 w-5 rounded-full bg-accent-cyan" />}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Your homeowner account keeps the simplified dashboard experience. Switch
        into an agent account to access clients, imports, billing, and workspace
        settings.
      </p>
    </DashboardCard>
  );
}
