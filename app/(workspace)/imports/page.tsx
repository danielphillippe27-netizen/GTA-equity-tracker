'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import { useOptionalTenant } from '@/components/tenant/TenantProvider';
import {
  AgentOnlyState,
  DashboardCard,
  EmptyState,
  PageHeader,
  classifyQueuedTrrebFile,
  formatFileSize,
} from '@/components/dashboard/dashboard-ui';

export default function ImportsPage() {
  const { session } = useAuth();
  const { dashboard, refreshDashboard } = useDashboard();
  const tenant = useOptionalTenant();
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [stagingImports, setStagingImports] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const queuedImportSummary = useMemo(() => {
    return queuedFiles.reduce(
      (summary, file) => {
        const category = classifyQueuedTrrebFile(file);
        summary.files.push({
          file,
          category,
        });

        if (category === 'hpi') {
          summary.hpiCount += 1;
        } else if (category === 'market-watch') {
          summary.marketWatchCount += 1;
        } else if (category === 'historic') {
          summary.historicCount += 1;
        } else {
          summary.ignoredCount += 1;
        }

        return summary;
      },
      {
        files: [] as Array<{
          file: File;
          category: ReturnType<typeof classifyQueuedTrrebFile>;
        }>,
        hpiCount: 0,
        marketWatchCount: 0,
        historicCount: 0,
        ignoredCount: 0,
      }
    );
  }, [queuedFiles]);

  if (!dashboard) {
    return null;
  }

  if (dashboard.accountType !== 'agent') {
    return <AgentOnlyState />;
  }

  async function stageImports() {
    if (!queuedFiles.length) {
      return;
    }

    setStagingImports(true);
    setUploadError(null);

    try {
      const searchParams = new URLSearchParams();
      if (tenant?.slug) {
        searchParams.set('slug', tenant.slug);
      }

      const response = await fetch(
        `/api/imports${searchParams.size ? `?${searchParams.toString()}` : ''}`,
        {
        method: 'POST',
        headers: session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : undefined,
        body: (() => {
          const formData = new FormData();
          queuedFiles.forEach((file) => {
            formData.append('files', file);
            formData.append(
              'metadata',
              JSON.stringify({
                relativePath:
                  'webkitRelativePath' in file
                    ? (file as File & { webkitRelativePath?: string }).webkitRelativePath || ''
                    : '',
              })
            );
          });
          return formData;
        })(),
        }
      );

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to queue imports.');
      }

      setQueuedFiles([]);
      await refreshDashboard();
    } catch (stageError) {
      setUploadError(
        stageError instanceof Error ? stageError.message : 'Failed to queue imports.'
      );
    } finally {
      setStagingImports(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Imports"
        title="Data import pipeline"
        description="Upload PDFs, spreadsheets, CSVs, and other data files. Complete TRREB HPI, Market Watch, and Historic sets run the existing Python importer automatically."
      />

      {uploadError ? (
        <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-200">
          {uploadError}
        </div>
      ) : null}

      <DashboardCard
        title="Upload files"
        description="Any upload will be accepted. TRREB bundles auto-run; everything else is staged for review."
        icon={<Upload className="h-5 w-5 text-accent-cyan" />}
      >
        <label
          className="block rounded-2xl border border-dashed border-accent-blue/40 bg-background px-4 py-8 text-center transition-colors hover:border-accent-blue"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setUploadError(null);
            setQueuedFiles((current) => [...current, ...Array.from(event.dataTransfer.files)]);
          }}
        >
          <p className="text-sm font-medium text-foreground">Drop PDFs here</p>
          <p className="mt-1 text-xs text-muted-foreground">or click to choose files</p>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              setUploadError(null);
              setQueuedFiles((current) => [
                ...current,
                ...Array.from(event.target.files ?? []),
              ]);
            }}
          />
        </label>

        {queuedFiles.length ? (
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {queuedImportSummary.hpiCount} HPI / {queuedImportSummary.marketWatchCount}{' '}
              Market Watch / {queuedImportSummary.historicCount} Historic
              {queuedImportSummary.ignoredCount
                ? ` / ${queuedImportSummary.ignoredCount} other`
                : ''}
            </div>

            {queuedImportSummary.files.slice(0, 4).map(({ file, category }) => (
              <div
                key={`${file.name}-${file.lastModified}`}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              >
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-muted-foreground">
                  {formatFileSize(file.size)} /{' '}
                  {category === 'ignored'
                    ? 'Other data'
                    : category === 'market-watch'
                      ? 'Market Watch'
                      : category.toUpperCase()}
                </p>
              </div>
            ))}

            {queuedFiles.length > 4 ? (
              <p className="text-xs text-muted-foreground">
                +{queuedFiles.length - 4} more file{queuedFiles.length - 4 === 1 ? '' : 's'}
              </p>
            ) : null}

            <button
              type="button"
              onClick={stageImports}
              disabled={stagingImports}
              className="rounded-2xl bg-accent-blue px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {stagingImports ? 'Uploading data...' : 'Upload Data'}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="No files queued."
              description="Add a TRREB bundle or any other source file to stage a new import job."
            />
          </div>
        )}
      </DashboardCard>
    </motion.div>
  );
}
