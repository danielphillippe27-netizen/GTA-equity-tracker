'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  FileEdit,
  ImageIcon,
  LayoutTemplate,
  Mail,
  Monitor,
  MousePointerClick,
  Smartphone,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import { AgentOnlyState, DashboardCard } from '@/components/dashboard/dashboard-ui';
import { cn } from '@/lib/utils';

type EditorSectionId = 'branding' | 'intro' | 'cta' | 'footerLogos' | 'footer';
type PreviewViewport = 'desktop' | 'mobile';
type UploadTarget = 'topLogo' | 'bottomLeft' | 'bottomCenter' | 'bottomRight';

const SECTION_LABELS: Record<EditorSectionId, string> = {
  branding: 'Brand header',
  intro: 'Intro block',
  cta: 'Top CTA button',
  footerLogos: 'Bottom logos',
  footer: 'Footer note',
};

export default function TemplatesPage() {
  const { session } = useAuth();
  const { dashboard, refreshDashboard } = useDashboard();
  const [selectedSection, setSelectedSection] = useState<EditorSectionId>('branding');
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [templateBrandName, setTemplateBrandName] = useState('');
  const [templateLogoUrl, setTemplateLogoUrl] = useState('');
  const [templateIntroText, setTemplateIntroText] = useState('');
  const [templateCtaText, setTemplateCtaText] = useState('');
  const [templateFooterNote, setTemplateFooterNote] = useState('');
  const [templateBottomLogoLeftUrl, setTemplateBottomLogoLeftUrl] = useState('');
  const [templateBottomLogoUrl, setTemplateBottomLogoUrl] = useState('');
  const [templateBottomLogoRightUrl, setTemplateBottomLogoRightUrl] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<UploadTarget | null>(null);
  const topLogoInputRef = useRef<HTMLInputElement | null>(null);
  const bottomLeftInputRef = useRef<HTMLInputElement | null>(null);
  const bottomCenterInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRightInputRef = useRef<HTMLInputElement | null>(null);

  const workspace = dashboard?.workspace;
  const workspaceBrand = workspace?.brand ?? null;
  const monthlyTemplate = workspace?.settings?.monthlyReportTemplate ?? null;
  const previewBrandName = templateBrandName.trim() || workspace?.name || 'Your brand';
  const previewIntroText =
    templateIntroText.trim() ||
    'Here is your latest monthly home wealth snapshot, built from current GTA benchmark and market activity data.';
  const previewCtaText = templateCtaText.trim() || 'Request Precise Home Evaluation';
  const previewFooterNote =
    templateFooterNote.trim() || 'Updated monthly using TRREB benchmark and Market Watch data.';
  const footerLogoUrls = [
    templateBottomLogoLeftUrl.trim(),
    templateBottomLogoUrl.trim(),
    templateBottomLogoRightUrl.trim(),
  ].filter(Boolean);

  const sections: Array<{
    id: EditorSectionId;
    label: string;
    description: string;
    preview: string;
    icon: ReactNode;
  }> = [
    {
      id: 'branding',
      label: SECTION_LABELS.branding,
      description: 'Top logo and team name',
      preview: previewBrandName,
      icon: <ImageIcon className="h-4 w-4" />,
    },
    {
      id: 'intro',
      label: SECTION_LABELS.intro,
      description: 'Opening copy under the value',
      preview: previewIntroText,
      icon: <Type className="h-4 w-4" />,
    },
    {
      id: 'cta',
      label: SECTION_LABELS.cta,
      description: 'Top action button',
      preview: previewCtaText,
      icon: <MousePointerClick className="h-4 w-4" />,
    },
    {
      id: 'footerLogos',
      label: SECTION_LABELS.footerLogos,
      description: 'Bottom logo row',
      preview: footerLogoUrls.length ? `${footerLogoUrls.length} logos configured` : 'No logos added',
      icon: <LayoutTemplate className="h-4 w-4" />,
    },
    {
      id: 'footer',
      label: SECTION_LABELS.footer,
      description: 'Small note above unsubscribe',
      preview: previewFooterNote,
      icon: <Type className="h-4 w-4" />,
    },
  ];

  useEffect(() => {
    setTemplateBrandName(monthlyTemplate?.brandName || workspace?.name || '');
    setTemplateLogoUrl(workspaceBrand?.logoUrl || '');
    setTemplateIntroText(monthlyTemplate?.introText || '');
    setTemplateCtaText(monthlyTemplate?.ctaText || '');
    setTemplateFooterNote(monthlyTemplate?.footerNote || '');
    setTemplateBottomLogoLeftUrl(monthlyTemplate?.bottomLogoLeftUrl || '');
    setTemplateBottomLogoUrl(monthlyTemplate?.bottomLogoUrl || '');
    setTemplateBottomLogoRightUrl(monthlyTemplate?.bottomLogoRightUrl || '');
    setTestEmail(dashboard?.profile.email || '');
  }, [
    dashboard?.profile.email,
    monthlyTemplate?.bottomLogoLeftUrl,
    monthlyTemplate?.bottomLogoRightUrl,
    monthlyTemplate?.bottomLogoUrl,
    monthlyTemplate?.brandName,
    monthlyTemplate?.ctaText,
    monthlyTemplate?.footerNote,
    monthlyTemplate?.introText,
    workspace?.name,
    workspaceBrand?.logoUrl,
  ]);

  if (!dashboard) {
    return null;
  }

  if (dashboard.accountType !== 'agent') {
    return <AgentOnlyState />;
  }

  function resetMessages() {
    setTemplateError(null);
    setTemplateStatus(null);
    setTestError(null);
    setTestStatus(null);
  }

  async function persistTemplate() {
    if (!workspace?.id) {
      throw new Error('No workspace is connected to this account.');
    }

    const response = await fetch('/api/workspace', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        workspaceId: workspace.id,
        brand: {
          logoUrl: templateLogoUrl,
        },
        settings: {
          monthlyReportTemplate: {
            brandName: templateBrandName,
            introText: templateIntroText,
            ctaText: templateCtaText,
            footerNote: templateFooterNote,
            bottomLogoLeftUrl: templateBottomLogoLeftUrl,
            bottomLogoUrl: templateBottomLogoUrl,
            bottomLogoRightUrl: templateBottomLogoRightUrl,
          },
        },
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to update monthly template.');
    }
  }

  async function handleSaveTemplate() {
    setIsSavingTemplate(true);
    resetMessages();

    try {
      await persistTemplate();
      setTemplateStatus('Monthly update template saved.');
      await refreshDashboard();
    } catch (saveError) {
      setTemplateError(
        saveError instanceof Error ? saveError.message : 'Failed to update monthly template.'
      );
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function handleSendTestEmail() {
    if (!workspace?.id) {
      setTestError('No workspace is connected to this account.');
      setTestStatus(null);
      return;
    }

    setIsSendingTest(true);
    setTestError(null);
    setTestStatus(null);

    try {
      await persistTemplate();
      await refreshDashboard();

      const response = await fetch('/api/templates/monthly-report-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          email: testEmail,
          name: dashboard?.profile.name || 'Test',
        }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send test email.');
      }

      setTestStatus(payload.message || `Test email sent to ${testEmail}.`);
    } catch (sendError) {
      setTestError(sendError instanceof Error ? sendError.message : 'Failed to send test email.');
    } finally {
      setIsSendingTest(false);
    }
  }

  async function handleAssetUpload(target: UploadTarget, file: File) {
    if (!workspace?.id) {
      setTemplateError('No workspace is connected to this account.');
      return;
    }

    setUploadingTarget(target);
    resetMessages();

    try {
      const formData = new FormData();
      formData.set('workspaceId', workspace.id);
      formData.set('file', file);

      const response = await fetch('/api/templates/assets', {
        method: 'POST',
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: formData,
      });

      const payload = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Failed to upload image.');
      }

      if (target === 'topLogo') {
        setTemplateLogoUrl(payload.url);
      } else if (target === 'bottomLeft') {
        setTemplateBottomLogoLeftUrl(payload.url);
      } else if (target === 'bottomCenter') {
        setTemplateBottomLogoUrl(payload.url);
      } else {
        setTemplateBottomLogoRightUrl(payload.url);
      }

      setTemplateStatus('Image uploaded. Save template to keep it.');
    } catch (uploadError) {
      setTemplateError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image.');
    } finally {
      setUploadingTarget(null);
    }
  }

  function renderSectionEditor() {
    if (selectedSection === 'branding') {
      return (
        <div className="grid gap-4">
          <EditorField
            id="template-brand-name"
            label="Brand name"
            value={templateBrandName}
            onChange={(value) => {
              setTemplateBrandName(value);
              resetMessages();
            }}
            placeholder="Phillippe Group"
          />
          <ImageAssetField
            label="Top logo"
            value={templateLogoUrl}
            inputRef={topLogoInputRef}
            isUploading={uploadingTarget === 'topLogo'}
            onUpload={(file) => handleAssetUpload('topLogo', file)}
            onClear={() => {
              setTemplateLogoUrl('');
              resetMessages();
            }}
            hint="This is the logo shown at the top of the email."
          />
        </div>
      );
    }

    if (selectedSection === 'intro') {
      return (
        <EditorTextarea
          id="template-intro-text"
          label="Intro message"
          value={templateIntroText}
          onChange={(value) => {
            setTemplateIntroText(value);
            resetMessages();
          }}
          placeholder="Add the opening message that sits above the market stats."
          minHeight="min-h-40"
        />
      );
    }

    if (selectedSection === 'cta') {
      return (
        <EditorField
          id="template-cta-text"
          label="Top button label"
          value={templateCtaText}
          onChange={(value) => {
            setTemplateCtaText(value);
            resetMessages();
          }}
          placeholder="Request Precise Home Evaluation"
        />
      );
    }

    if (selectedSection === 'footerLogos') {
      return (
        <div className="grid gap-4">
          <ImageAssetField
            label="Bottom left logo"
            value={templateBottomLogoLeftUrl}
            inputRef={bottomLeftInputRef}
            isUploading={uploadingTarget === 'bottomLeft'}
            onUpload={(file) => handleAssetUpload('bottomLeft', file)}
            onClear={() => {
              setTemplateBottomLogoLeftUrl('');
              resetMessages();
            }}
          />
          <ImageAssetField
            label="Bottom center logo"
            value={templateBottomLogoUrl}
            inputRef={bottomCenterInputRef}
            isUploading={uploadingTarget === 'bottomCenter'}
            onUpload={(file) => handleAssetUpload('bottomCenter', file)}
            onClear={() => {
              setTemplateBottomLogoUrl('');
              resetMessages();
            }}
          />
          <ImageAssetField
            label="Bottom right logo"
            value={templateBottomLogoRightUrl}
            inputRef={bottomRightInputRef}
            isUploading={uploadingTarget === 'bottomRight'}
            onUpload={(file) => handleAssetUpload('bottomRight', file)}
            onClear={() => {
              setTemplateBottomLogoRightUrl('');
              resetMessages();
            }}
            hint="These logos render in one row above the footer note."
          />
        </div>
      );
    }

    return (
      <EditorTextarea
        id="template-footer-note"
        label="Footer note"
        value={templateFooterNote}
        onChange={(value) => {
          setTemplateFooterNote(value);
          resetMessages();
        }}
        placeholder="Updated monthly using TRREB benchmark and Market Watch data."
        minHeight="min-h-32"
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Templates</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
            Monthly email editor
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Edit the monthly email, upload the bottom logo row, send yourself a test, and open a mock email preview when needed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent-blue/50"
        >
          <Eye className="h-4 w-4" />
          Preview
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.62fr_0.38fr]">
        <DashboardCard
          title="Editor"
          description="Choose a section, edit it, and save the template."
          icon={<FileEdit className="h-5 w-5 text-accent-cyan" />}
        >
          <div className="grid gap-6">
            <div className="grid gap-3 md:grid-cols-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSection(section.id)}
                  className={cn(
                    'rounded-2xl border px-4 py-4 text-left transition-colors',
                    selectedSection === section.id
                      ? 'border-accent-blue/60 bg-accent-blue/10'
                      : 'border-border bg-background hover:border-accent-blue/40'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-cyan/10 text-accent-cyan">
                      {section.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{section.label}</p>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <p className="mt-3 truncate text-sm text-muted-foreground">{section.preview}</p>
                </button>
              ))}
            </div>

            <div className="rounded-[1.75rem] border border-border bg-background/80 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Editing</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                {SECTION_LABELS[selectedSection]}
              </h2>
              <div className="mt-5">{renderSectionEditor()}</div>
            </div>

            {templateError ? <p className="text-sm text-red-300">{templateError}</p> : null}
            {templateStatus ? <p className="text-sm text-emerald-300">{templateStatus}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate}
                className="inline-flex items-center justify-center rounded-2xl bg-accent-blue px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingTemplate ? 'Saving...' : 'Save template'}
              </button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Push Test Email"
          description="Send the current template to yourself before the next monthly run."
          icon={<Mail className="h-5 w-5 text-accent-cyan" />}
        >
          <div className="grid gap-4">
            <EditorField
              id="test-email"
              label="Test email address"
              value={testEmail}
              onChange={(value) => {
                setTestEmail(value);
                setTestError(null);
                setTestStatus(null);
              }}
              placeholder="you@example.com"
            />

            <div className="rounded-[1.5rem] border border-border bg-background/80 p-4">
              <p className="text-sm leading-7 text-muted-foreground">
                The test send uses the current editor values plus mock market and equity numbers, so you can review the actual email rendering in your inbox.
              </p>
            </div>

            {testError ? <p className="text-sm text-red-300">{testError}</p> : null}
            {testStatus ? <p className="text-sm text-emerald-300">{testStatus}</p> : null}

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="inline-flex items-center justify-center rounded-2xl bg-accent-blue px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendingTest ? 'Sending...' : 'Send test email'}
            </button>
          </div>
        </DashboardCard>
      </div>

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-5xl rounded-[2rem] border border-border bg-background shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Preview</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">Mock monthly email</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('desktop')}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                      previewViewport === 'desktop'
                        ? 'border-accent-blue/60 bg-accent-blue/10 text-foreground'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('mobile')}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                      previewViewport === 'mobile'
                        ? 'border-accent-blue/60 bg-accent-blue/10 text-foreground'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(false)}
                    className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[80vh] overflow-y-auto p-6">
                <div
                  className={cn(
                    'mx-auto rounded-[2rem] bg-[#0B0F14] p-5 transition-all',
                    previewViewport === 'desktop' ? 'max-w-[720px]' : 'max-w-[390px]'
                  )}
                >
                  <MockEmailCard
                    topLogoUrl={templateLogoUrl}
                    brandName={previewBrandName}
                    introText={previewIntroText}
                    ctaText={previewCtaText}
                    footerNote={previewFooterNote}
                    footerLogoUrls={footerLogoUrls}
                    compact={previewViewport === 'mobile'}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

function EditorField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-foreground" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-accent-blue/60"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EditorTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  minHeight,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeight: string;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-foreground" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          minHeight,
          'rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 text-foreground outline-none transition-colors focus:border-accent-blue/60'
        )}
      />
    </div>
  );
}

function ImageAssetField({
  label,
  value,
  inputRef,
  isUploading,
  onUpload,
  onClear,
  hint,
}: {
  label: string;
  value: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onClear: () => void;
  hint?: string;
}) {
  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onUpload(file);
          }
          event.target.value = '';
        }}
      />

      <div className="rounded-[1.5rem] border border-border bg-background/80 p-4">
        {value ? (
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="max-h-12 max-w-[140px] object-contain" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-muted-foreground">{value}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No image uploaded yet.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent-blue/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Upload image'}
        </button>
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MockEmailCard({
  topLogoUrl,
  brandName,
  introText,
  ctaText,
  footerNote,
  footerLogoUrls,
  compact,
}: {
  topLogoUrl: string;
  brandName: string;
  introText: string;
  ctaText: string;
  footerNote: string;
  footerLogoUrls: string[];
  compact: boolean;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/8 bg-[#11161C] p-6 text-white">
      {topLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={topLogoUrl}
          alt={brandName}
          className="mb-4 max-h-14 max-w-[180px] object-contain"
        />
      ) : null}
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#8A94A6]">Brought to you by:</p>
      <p className={cn('mt-1 font-semibold', compact ? 'text-2xl' : 'text-3xl')}>{brandName}</p>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#0D1318] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8A94A6]">January 2026</p>
        <p className={cn('mt-3 font-semibold tracking-[-0.03em]', compact ? 'text-3xl' : 'text-4xl')}>
          Test, your home is now worth
        </p>
        <p className={cn('mt-2 font-semibold tracking-[-0.04em]', compact ? 'text-4xl' : 'text-5xl')}>
          $1,494,948
        </p>
        <p className="mt-3 text-sm text-[#8A94A6]">(-1.1% vs last report), since December 2025</p>
        <p className="mt-5 whitespace-pre-line text-sm leading-7 text-[#C8D1DC]">{introText}</p>

        <div className="mt-5 inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">
          {ctaText}
        </div>

        <div className={cn('mt-6 grid gap-3', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
          <MetricCard label="Current Value" value="$1,494,948" />
          <MetricCard label="Net Equity" value="$1,494,948" />
          <MetricCard label="Since Purchase" value="$1,244,948" accent="text-[#2ED3B7]" />
          <MetricCard label="This Month" value="-$16,963" accent="text-[#FF8B90]" />
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-white/3 p-4">
          <p className="text-lg font-semibold">Clarington Market Stats</p>
          <div className="mt-3 grid gap-2 text-sm text-[#C8D1DC]">
            <div className="flex items-center justify-between">
              <span>Average sold price</span>
              <span>$820,132</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Days on market</span>
              <span>53 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Inventory</span>
              <span>4.3 months</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-full bg-[#1F6AAE] px-5 py-4 text-center text-sm font-semibold text-white">
          View Full Wealth Dashboard
        </div>
      </div>

      {footerLogoUrls.length ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {footerLogoUrls.map((logoUrl) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={logoUrl}
              src={logoUrl}
              alt="Footer logo"
              className="max-h-10 max-w-[110px] object-contain"
            />
          ))}
        </div>
      ) : null}

      <p className="mt-6 whitespace-pre-line text-center text-xs leading-6 text-[#64748B]">
        {footerNote}
      </p>
      <p className="mt-3 text-center text-xs text-[#94A3B8] underline">Unsubscribe</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/8 bg-white/3 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A94A6]">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold text-white', accent)}>{value}</p>
    </div>
  );
}
