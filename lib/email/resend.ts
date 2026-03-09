import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase/server';
import type {
  MonthlyReportTemplateSettings,
  WorkspaceBrand,
  WorkspaceSettings,
} from '@/lib/workspaces';

function readEnv(name: string): string | null {
  const value = process.env[name];
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const FROM_EMAIL = readEnv('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
const RESEND_FALLBACK_FROM_EMAIL = 'onboarding@resend.dev';

function getResendClient() {
  const apiKey = readEnv('RESEND_API_KEY');
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function shouldRetryWithFallbackSender(error: unknown): boolean {
  if (FROM_EMAIL === RESEND_FALLBACK_FROM_EMAIL || !error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { statusCode?: number; message?: string };
  return (
    maybeError.statusCode === 403 &&
    typeof maybeError.message === 'string' &&
    maybeError.message.toLowerCase().includes('domain is not verified')
  );
}

async function sendWithSenderFallback(
  resend: Resend,
  payload: Parameters<Resend['emails']['send']>[0]
) {
  const initialResult = await resend.emails.send(payload);
  if (!initialResult.error || !shouldRetryWithFallbackSender(initialResult.error)) {
    return initialResult;
  }

  if (!payload.from) {
    return initialResult;
  }

  console.warn('[Resend] Retrying with fallback sender because custom domain is not verified.');
  const retryFrom = payload.from.replace(FROM_EMAIL, RESEND_FALLBACK_FROM_EMAIL);
  return resend.emails.send({
    ...payload,
    from: retryFrom,
  });
}

function getAppBaseUrl(): string {
  const configuredBaseUrl =
    readEnv('NEXT_PUBLIC_APP_URL') ||
    readEnv('APP_URL') ||
    readEnv('NEXT_PUBLIC_SITE_URL') ||
    readEnv('VERCEL_PROJECT_PRODUCTION_URL');

  if (configuredBaseUrl) {
    return configuredBaseUrl.startsWith('http')
      ? configuredBaseUrl
      : `https://${configuredBaseUrl}`;
  }

  const vercelUrl = readEnv('VERCEL_URL');
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return 'http://localhost:3000';
}

function buildUnsubscribeUrl(subscriberId?: string, email?: string): string {
  const url = new URL('/api/subscribe', getAppBaseUrl());
  if (subscriberId) {
    url.searchParams.set('id', subscriberId);
  } else if (email) {
    url.searchParams.set('email', email);
  }
  return url.toString();
}

function buildPreciseEvaluationUrl(
  name: string,
  email: string,
  region: string,
  propertyType: string,
  subscriberId: string,
  estimateId?: string | null,
  brandName: string = 'The Phillippe Group'
): string {
  const recipient =
    readEnv('CMA_REQUEST_NOTIFY_EMAIL') ||
    readEnv('RESEND_FROM_EMAIL') ||
    'info@equitytracker.ca';
  const subject = `Precise home evaluation request from ${titleCaseName(name)}`;
  const lines = [
    `Hi ${brandName},`,
    '',
    `I would like a precise home evaluation for my ${propertyType.toLowerCase()} property in ${region}.`,
    '',
    `My email: ${email}`,
    estimateId ? `Estimate ID: ${estimateId}` : null,
    `Subscriber ID: ${subscriberId}`,
    '',
    'Please reach out to me with next steps.',
  ].filter(Boolean);

  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(lines.join('\n'))}`;
}

function getCmaRequestNotificationRecipient(): string | null {
  return (
    readEnv('CMA_REQUEST_NOTIFY_EMAIL') ||
    readEnv('RESEND_FROM_EMAIL') ||
    null
  );
}

interface SendWelcomeEmailParams {
  to: string;
  name: string;
  estimatedValue: number;
  equityGained: number;
  region: string;
  propertyType: string;
  subscriberId?: string;
  workspaceId?: string | null;
}

interface SendMonthlyReportParams {
  to: string;
  name: string;
  subscriberId: string;
  workspaceId?: string | null;
  estimateId?: string | null;
  estimatedValue: number;
  previousValue: number;
  equityGained: number;
  netEquity: number;
  region: string;
  propertyType: string;
  marketChange: number;
  reportMonth?: string | null;
  previousReportMonth?: string | null;
  benchmarkPrice?: number | null;
  benchmarkPriceChange?: number | null;
  averageSoldPrice?: number | null;
  averageSoldPriceChange?: number | null;
  sales?: number | null;
  newListings?: number | null;
  activeListings?: number | null;
  averageDaysOnMarket?: number | null;
  monthsOfInventory?: number | null;
  scopeAreaName?: string | null;
  dataSource?: string | null;
  isFallback?: boolean;
}

interface SendCmaRequestNotificationParams {
  name: string;
  email: string;
  address?: string | null;
  phone?: string | null;
  estimateId?: string | null;
  preferredContactMethod?: string | null;
  notes?: string | null;
  workspaceId?: string | null;
}

interface EmailEventMetadata {
  [key: string]: unknown;
}

interface RecordEmailEventParams {
  workspaceId?: string | null;
  subscriberId?: string | null;
  emailType: 'welcome' | 'monthly_report' | 'cma_request_notification';
  status: 'sent' | 'failed';
  recipientEmail: string;
  resendMessageId?: string | null;
  metadata?: EmailEventMetadata;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatHtmlText(value: string): string {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

function formatMonth(period?: string | null): string | null {
  if (!period) {
    return null;
  }

  const match = period.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1, 12))
    : new Date(period);
  if (Number.isNaN(date.getTime())) {
    return period;
  }

  return date.toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
  });
}

function titleCaseName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'There';
  }

  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildDashboardUrl(estimateId?: string | null): string {
  const baseUrl = getAppBaseUrl();
  const targetPath = estimateId ? `/results/${estimateId}` : '/dashboard';
  return new URL(targetPath, baseUrl).toString();
}

function resolveAssetUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return new URL(path, getAppBaseUrl()).toString();
  }
}

async function loadMonthlyReportBranding(workspaceId?: string | null) {
  if (!workspaceId) {
    return null;
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('workspaces')
      .select('name, brand, settings')
      .eq('id', workspaceId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.warn('[Resend] Failed to load workspace branding:', error.message);
      }
      return null;
    }

    const brand = (data.brand ?? null) as WorkspaceBrand | null;
    const settings = (data.settings ?? null) as WorkspaceSettings | null;
    const template = settings?.monthlyReportTemplate as MonthlyReportTemplateSettings | undefined;

    return {
      workspaceName: typeof data.name === 'string' ? data.name.trim() : '',
      logoUrl: resolveAssetUrl(brand?.logoUrl),
      brandName: template?.brandName?.trim() || null,
      introText: template?.introText?.trim() || null,
      ctaText: template?.ctaText?.trim() || null,
      footerNote: template?.footerNote?.trim() || null,
      bottomLogoLeftUrl: resolveAssetUrl(template?.bottomLogoLeftUrl),
      bottomLogoUrl: resolveAssetUrl(template?.bottomLogoUrl),
      bottomLogoRightUrl: resolveAssetUrl(template?.bottomLogoRightUrl),
    };
  } catch (error) {
    console.warn('[Resend] Failed to load workspace branding:', error);
    return null;
  }
}

function renderBottomLogoRow(logoUrls: Array<string | null | undefined>) {
  const safeLogoUrls = logoUrls.filter((value): value is string => Boolean(value));

  if (!safeLogoUrls.length) {
    return '';
  }

  const logoCells = safeLogoUrls
    .map(
      (logoUrl) => `
        <td align="center" style="padding: 0 10px 0 10px;">
          <img src="${escapeHtml(logoUrl)}" alt="Partner logo" style="display: block; max-width: 110px; max-height: 42px;" />
        </td>
      `
    )
    .join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 18px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0">
            <tr>${logoCells}</tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

interface MonthlyReportEmailContentParams {
  to: string;
  name: string;
  subscriberId?: string;
  workspaceId?: string | null;
  estimateId?: string | null;
  estimatedValue: number;
  previousValue: number;
  equityGained: number;
  netEquity: number;
  region: string;
  propertyType: string;
  reportMonth?: string | null;
  previousReportMonth?: string | null;
  averageSoldPrice?: number | null;
  averageDaysOnMarket?: number | null;
  monthsOfInventory?: number | null;
  scopeAreaName?: string | null;
  isFallback?: boolean;
  subjectPrefix?: string;
}

async function buildMonthlyReportEmailContent({
  to,
  name,
  subscriberId,
  workspaceId,
  estimateId,
  estimatedValue,
  previousValue,
  equityGained,
  netEquity,
  region,
  propertyType,
  reportMonth,
  previousReportMonth,
  averageSoldPrice,
  averageDaysOnMarket,
  monthsOfInventory,
  scopeAreaName,
  isFallback,
  subjectPrefix,
}: MonthlyReportEmailContentParams) {
  const firstName = titleCaseName(name.split(' ')[0] || 'there');
  const unsubscribeUrl = buildUnsubscribeUrl(subscriberId, to);
  const safePreviousValue = previousValue > 0 ? previousValue : estimatedValue;
  const valueChange = estimatedValue - safePreviousValue;
  const valueChangePercent = safePreviousValue > 0 ? (valueChange / safePreviousValue) * 100 : 0;
  const isUp = valueChange >= 0;
  const reportLabel = formatMonth(reportMonth);
  const previousReportLabel = formatMonth(previousReportMonth);
  const localityLabel = scopeAreaName || region;
  const marketStatsHeading = `${localityLabel} Market Stats`;
  const branding = await loadMonthlyReportBranding(workspaceId);
  const brandName = branding?.brandName || branding?.workspaceName || 'The Phillippe Group';
  const logoUrl = branding?.logoUrl || null;
  const introText =
    branding?.introText ||
    'Here is your latest monthly home wealth snapshot, built from current GTA benchmark and market activity data.';
  const topCtaText = branding?.ctaText || 'Request Precise Home Evaluation';
  const footerNote =
    branding?.footerNote || 'Updated monthly using TRREB benchmark and Market Watch data.';
  const safeBrandName = escapeHtml(brandName);
  const safeIntroText = formatHtmlText(introText);
  const safeTopCtaText = escapeHtml(topCtaText);
  const safeFooterNote = formatHtmlText(footerNote);
  const safeLogoUrl = logoUrl ? escapeHtml(logoUrl) : null;
  const dashboardUrl = await buildDashboardLoginUrl(to, estimateId);
  const preciseEvaluationUrl = buildPreciseEvaluationUrl(
    name,
    to,
    region,
    propertyType,
    subscriberId || 'template-preview',
    estimateId,
    brandName
  );
  const thisMonthAmount = `${isUp ? '+' : '-'}${formatCurrency(Math.abs(valueChange))}`;
  const thisMonthPercent = `(${formatPercent(valueChangePercent)} vs last report)`;
  const bottomLogoRow = renderBottomLogoRow([
    branding?.bottomLogoLeftUrl,
    branding?.bottomLogoUrl,
    branding?.bottomLogoRightUrl,
  ]);

  return {
    subject: `${subjectPrefix || ''}${firstName}, your home is now worth ${formatCurrency(estimatedValue)}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0F14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="720" cellpadding="0" cellspacing="0" style="max-width: 720px;">
          <tr>
            <td style="padding-bottom: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle; padding-right: 16px;">
                    ${safeLogoUrl ? `<img src="${safeLogoUrl}" alt="${safeBrandName} logo" style="display: block; max-width: 180px; max-height: 56px; margin: 0 0 14px;" />` : ''}
                    <p style="margin: 0 0 4px; color: #8A94A6; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;">Brought to you by:</p>
                    <h1 style="margin: 0; color: #F5F7FA; font-size: 24px; font-weight: 600;">${safeBrandName}</h1>
                  </td>
                  <td align="right" style="vertical-align: middle; width: 280px;">
                    <a href="${preciseEvaluationUrl}" style="display: inline-block; background-color: transparent; color: #F5F7FA; text-decoration: none; font-size: 14px; font-weight: 600; border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; padding: 13px 18px; text-align: center; white-space: nowrap;">
                      ${safeTopCtaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #11161C; border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; padding: 40px 44px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);">
              <p style="margin: 0 0 10px; color: #8A94A6; font-size: 13px; text-transform: uppercase; letter-spacing: 0.14em;">${reportLabel || 'Monthly wealth snapshot'}</p>
              <h2 style="margin: 0 0 10px; color: #F5F7FA; font-size: 34px; line-height: 1.15; font-weight: 700;">
                ${firstName}, your home is now worth
              </h2>
              <p style="margin: 0 0 10px; color: #F5F7FA; font-size: 56px; line-height: 1; font-weight: 700; letter-spacing: -0.03em;">
                ${formatCurrency(estimatedValue)}
              </p>
              <p style="margin: 0 0 24px; color: #8A94A6; font-size: 14px;">
                ${thisMonthPercent}${previousReportLabel ? `, since ${previousReportLabel}` : ''}
              </p>
              <p style="margin: 0 0 24px; color: #C8D1DC; font-size: 15px; line-height: 1.7;">
                ${safeIntroText}
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
                <tr>
                  ${renderMetricCard('Current Value', formatCurrency(estimatedValue), '#F5F7FA', 28)}
                  ${renderMetricCard('Net Equity', formatCurrency(netEquity), '#F5F7FA', 28)}
                </tr>
                <tr>
                  ${renderMetricCard('Since Purchase', formatCurrency(equityGained), '#2ED3B7')}
                  ${renderMetricCard('This Month', thisMonthAmount, isUp ? '#2ED3B7' : '#FF8B90')}
                </tr>
              </table>

              <div style="margin: 0 0 28px; padding: 22px; border-radius: 20px; background-color: #0D1318; border: 1px solid rgba(255,255,255,0.05);">
                <p style="margin: 0 0 10px; color: #F5F7FA; font-size: 18px; font-weight: 600;">${marketStatsHeading}</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 0 0 12px; color: #8A94A6; font-size: 14px;">Average sold price</td>
                    <td style="padding: 0 0 12px; color: #ffffff; font-size: 13px; text-align: right;">
                      ${averageSoldPrice !== null && averageSoldPrice !== undefined ? formatCurrency(averageSoldPrice) : 'Not available'}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 12px; color: #8A94A6; font-size: 14px;">Days on market</td>
                    <td style="padding: 0 0 12px; color: #ffffff; font-size: 13px; text-align: right;">
                      ${averageDaysOnMarket !== null && averageDaysOnMarket !== undefined ? `${averageDaysOnMarket.toFixed(0)} days` : 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 12px; color: #8A94A6; font-size: 14px;">Inventory</td>
                    <td style="padding: 0 0 12px; color: #ffffff; font-size: 13px; text-align: right;">
                      ${monthsOfInventory !== null && monthsOfInventory !== undefined ? `${monthsOfInventory.toFixed(1)} months` : 'N/A'}
                    </td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center;">
                <a href="${dashboardUrl}" style="display: block; width: 100%; box-sizing: border-box; background-color: #4DA3FF; color: #0B0F14; text-decoration: none; font-weight: 700; font-size: 18px; padding: 18px 26px; border-radius: 999px; text-align: center;">
                  View Full Wealth Dashboard
                </a>
              </div>

              <p style="margin: 22px 0 0; color: #8A94A6; font-size: 12px; line-height: 1.6; text-align: center;">
                ${localityLabel}.${isFallback ? ' Market metrics use the next broader TRREB area where local monthly stats were unavailable.' : ''}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 28px; text-align: center;">
              ${bottomLogoRow}
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                ${safeFooterNote}
              </p>
              <p style="margin: 10px 0 0; color: #64748b; font-size: 12px;">
                <a href="${unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

async function buildDashboardLoginUrl(
  email: string,
  estimateId?: string | null
): Promise<string> {
  const appBaseUrl = getAppBaseUrl();
  const redirectTo = new URL('/auth/callback', appBaseUrl);
  redirectTo.searchParams.set('next', '/dashboard');

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: redirectTo.toString(),
      },
    });

    if (error) {
      console.error('[Resend] Failed to generate dashboard magic link:', error);
      return buildDashboardUrl(estimateId);
    }

    const actionLink = data.properties?.action_link;
    if (actionLink) {
      const url = new URL(actionLink);
      url.searchParams.set('redirect_to', redirectTo.toString());
      return url.toString();
    }

    const hashedToken = data.properties?.hashed_token;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (hashedToken && supabaseUrl) {
      const verifyUrl = new URL('/auth/v1/verify', supabaseUrl);
      verifyUrl.searchParams.set('token', hashedToken);
      verifyUrl.searchParams.set('type', 'magiclink');
      verifyUrl.searchParams.set('redirect_to', redirectTo.toString());
      return verifyUrl.toString();
    }
  } catch (error) {
    console.error('[Resend] Dashboard magic link exception:', error);
  }

  return buildDashboardUrl(estimateId);
}

async function resolveEmailEventWorkspaceId(
  workspaceId?: string | null,
  subscriberId?: string | null
): Promise<string | null> {
  if (workspaceId) {
    return workspaceId;
  }

  if (!subscriberId) {
    return null;
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('subscribers')
      .select('workspace_id')
      .eq('id', subscriberId)
      .maybeSingle();

    if (error) {
      console.warn('[Resend] Failed to resolve workspace for email event:', error.message);
      return null;
    }

    return (data?.workspace_id as string | null | undefined) ?? null;
  } catch (error) {
    console.warn('[Resend] Failed to resolve workspace for email event:', error);
    return null;
  }
}

async function recordEmailEvent({
  workspaceId,
  subscriberId,
  emailType,
  status,
  recipientEmail,
  resendMessageId,
  metadata,
}: RecordEmailEventParams) {
  const resolvedWorkspaceId = await resolveEmailEventWorkspaceId(workspaceId, subscriberId);

  if (!resolvedWorkspaceId) {
    return;
  }

  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('email_events').insert({
      workspace_id: resolvedWorkspaceId,
      subscriber_id: subscriberId ?? null,
      email_type: emailType,
      status,
      recipient_email: recipientEmail,
      resend_message_id: resendMessageId ?? null,
      metadata: metadata ?? {},
    });

    if (error) {
      if (error.code === '42P01') {
        return;
      }

      console.warn('[Resend] Failed to record email event:', error.message);
    }
  } catch (error) {
    console.warn('[Resend] Failed to record email event:', error);
  }
}

function renderMetricCard(
  label: string,
  value: string,
  accent?: string,
  valueSize: number = 24
): string {
  return `
    <td style="padding: 12px; width: 50%;">
      <div style="background-color: #11161C; border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 18px; min-height: 96px;">
        <p style="margin: 0 0 10px; color: #8A94A6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em;">${label}</p>
        <p style="margin: 0; color: ${accent || '#F5F7FA'}; font-size: ${valueSize}px; font-weight: 700; line-height: 1.15;">${value}</p>
      </div>
    </td>
  `;
}

export async function sendWelcomeEmail({
  to,
  name,
  estimatedValue,
  equityGained,
  region,
  propertyType,
  subscriberId,
  workspaceId,
}: SendWelcomeEmailParams) {
  const firstName = name.split(' ')[0] || 'there';
  const resend = getResendClient();

  if (!resend) {
    console.warn('[Resend] Skipping welcome email because RESEND_API_KEY is not configured.');
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  const unsubscribeUrl = buildUnsubscribeUrl(subscriberId, to);

  try {
    const { data, error } = await sendWithSenderFallback(resend, {
      from: `GTA Equity Tracker <${FROM_EMAIL}>`,
      to: [to],
      subject: `Welcome to GTA Equity Tracker - Your ${region} ${propertyType} Report`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to GTA Equity Tracker</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0F14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td style="padding-bottom: 30px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">GTA Equity Tracker</h1>
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 16px; padding: 40px;">
              <h2 style="margin: 0 0 10px; color: #ffffff; font-size: 28px;">Hey ${firstName}!</h2>
              <p style="margin: 0 0 30px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                You're now tracking your equity position for your <strong style="color: #ffffff;">${region} ${propertyType}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  ${renderMetricCard('Estimated Value', formatCurrency(estimatedValue))}
                  ${renderMetricCard('Equity Gained', `+${formatCurrency(equityGained)}`, '#22c55e')}
                </tr>
              </table>
              <p style="margin: 0 0 20px; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                <strong style="color: #ffffff;">What happens next?</strong><br>
                We'll send a fresh equity update each time a new monthly TRREB data release is loaded.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                Stay wealthy,<br>
                <strong style="color: #ffffff;">GTA Equity Tracker</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">You're receiving this because you signed up at GTA Equity Tracker.</p>
              <p style="margin: 10px 0 0; color: #64748b; font-size: 12px;">
                <a href="${unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[Resend] Welcome email error:', error);
      await recordEmailEvent({
        workspaceId,
        subscriberId,
        emailType: 'welcome',
        status: 'failed',
        recipientEmail: to,
        metadata: {
          region,
          propertyType,
          reason:
            error instanceof Error
              ? error.message
              : typeof error === 'object' && error && 'message' in error
                ? String(error.message)
                : String(error),
        },
      });
      return { success: false, error };
    }

    console.log('[Resend] Welcome email sent:', data);
    await recordEmailEvent({
      workspaceId,
      subscriberId,
      emailType: 'welcome',
      status: 'sent',
      recipientEmail: to,
      resendMessageId: data?.id ?? null,
      metadata: {
        region,
        propertyType,
      },
    });
    return { success: true, data };
  } catch (error) {
    console.error('[Resend] Welcome email exception:', error);
    await recordEmailEvent({
      workspaceId,
      subscriberId,
      emailType: 'welcome',
      status: 'failed',
      recipientEmail: to,
      metadata: {
        region,
        propertyType,
        reason: error instanceof Error ? error.message : String(error),
      },
    });
    return { success: false, error };
  }
}

export async function sendMonthlyReport({
  to,
  name,
  subscriberId,
  workspaceId,
  estimateId,
  estimatedValue,
  previousValue,
  equityGained,
  netEquity,
  region,
  propertyType,
  reportMonth,
  previousReportMonth,
  averageSoldPrice,
  averageDaysOnMarket,
  monthsOfInventory,
  scopeAreaName,
  isFallback,
}: SendMonthlyReportParams) {
  const resend = getResendClient();

  if (!resend) {
    console.warn('[Resend] Skipping monthly report because RESEND_API_KEY is not configured.');
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }
  const content = await buildMonthlyReportEmailContent({
    to,
    name,
    subscriberId,
    workspaceId,
    estimateId,
    estimatedValue,
    previousValue,
    equityGained,
    netEquity,
    region,
    propertyType,
    reportMonth,
    previousReportMonth,
    averageSoldPrice,
    averageDaysOnMarket,
    monthsOfInventory,
    scopeAreaName,
    isFallback,
  });

  try {
    const { data, error } = await sendWithSenderFallback(resend, {
      from: `GTA Equity Tracker <${FROM_EMAIL}>`,
      to: [to],
      subject: content.subject,
      html: content.html,
    });

    if (error) {
      console.error('[Resend] Monthly report error:', error);
      await recordEmailEvent({
        workspaceId,
        subscriberId,
        emailType: 'monthly_report',
        status: 'failed',
        recipientEmail: to,
        metadata: {
          estimateId,
          reportMonth,
          region,
          propertyType,
          reason:
            error instanceof Error
              ? error.message
              : typeof error === 'object' && error && 'message' in error
                ? String(error.message)
                : String(error),
        },
      });
      return { success: false, error };
    }

    console.log('[Resend] Monthly report sent:', data);
    await recordEmailEvent({
      workspaceId,
      subscriberId,
      emailType: 'monthly_report',
      status: 'sent',
      recipientEmail: to,
      resendMessageId: data?.id ?? null,
      metadata: {
        estimateId,
        reportMonth,
        region,
        propertyType,
      },
    });
    return { success: true, data };
  } catch (error) {
    console.error('[Resend] Monthly report exception:', error);
    await recordEmailEvent({
      workspaceId,
      subscriberId,
      emailType: 'monthly_report',
      status: 'failed',
      recipientEmail: to,
      metadata: {
        estimateId,
        reportMonth,
        region,
        propertyType,
        reason: error instanceof Error ? error.message : String(error),
      },
    });
    return { success: false, error };
  }
}

export async function sendTestMonthlyReport({
  to,
  workspaceId,
  name = 'Test',
}: {
  to: string;
  workspaceId?: string | null;
  name?: string;
}) {
  const resend = getResendClient();

  if (!resend) {
    console.warn('[Resend] Skipping test monthly report because RESEND_API_KEY is not configured.');
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  const content = await buildMonthlyReportEmailContent({
    to,
    name,
    workspaceId,
    estimatedValue: 1494948,
    previousValue: 1511911,
    equityGained: 1244948,
    netEquity: 1494948,
    region: 'Clarington',
    propertyType: 'Detached',
    reportMonth: '2026-01-01',
    previousReportMonth: '2025-12-01',
    averageSoldPrice: 820132,
    averageDaysOnMarket: 53,
    monthsOfInventory: 4.3,
    scopeAreaName: 'Clarington',
    isFallback: false,
    subjectPrefix: '[Test] ',
  });

  try {
    const { data, error } = await sendWithSenderFallback(resend, {
      from: `GTA Equity Tracker <${FROM_EMAIL}>`,
      to: [to],
      subject: content.subject,
      html: content.html,
    });

    if (error) {
      console.error('[Resend] Test monthly report error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Resend] Test monthly report exception:', error);
    return { success: false, error };
  }
}

export async function sendCmaRequestNotification({
  name,
  email,
  address,
  phone,
  estimateId,
  preferredContactMethod,
  notes,
  workspaceId,
}: SendCmaRequestNotificationParams) {
  const resend = getResendClient();
  const recipient = getCmaRequestNotificationRecipient();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeAddress = escapeHtml(address || 'Not provided');
  const safePhone = escapeHtml(phone || 'Not provided');
  const safePreferredContact = escapeHtml(preferredContactMethod || 'email');
  const safeEstimateId = escapeHtml(estimateId || 'Not provided');
  const safeNotes = escapeHtml(notes || 'None');

  if (!resend || !recipient) {
    return { success: false, error: 'Notification email is not configured' };
  }

  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Address: ${address || 'Not provided'}`,
    `Phone: ${phone || 'Not provided'}`,
    `Preferred contact: ${preferredContactMethod || 'email'}`,
    `Estimate ID: ${estimateId || 'Not provided'}`,
    `Notes: ${notes || 'None'}`,
  ];

  try {
    const { data, error } = await sendWithSenderFallback(resend, {
      from: `The Phillippe Group <${FROM_EMAIL}>`,
      to: [recipient],
      subject: `New precise home evaluation request from ${name}`,
      text: lines.join('\n'),
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 24px; background-color: #0B0F14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F5F7FA;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #11161C; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 28px;">
    <p style="margin: 0 0 8px; color: #8A94A6; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em;">The Phillippe Group</p>
    <h1 style="margin: 0 0 20px; font-size: 28px; line-height: 1.2;">New precise home evaluation request</h1>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding: 0 0 12px; color: #8A94A6; font-size: 14px;">Name</td>
        <td style="padding: 0 0 12px; color: #F5F7FA; font-size: 14px; text-align: right;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 12px; color: #8A94A6; font-size: 14px;">Email</td>
        <td style="padding: 0 0 12px; color: #F5F7FA; font-size: 14px; text-align: right;">${safeEmail}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 12px; color: #8A94A6; font-size: 14px;">Address</td>
        <td style="padding: 0 0 12px; color: #F5F7FA; font-size: 14px; text-align: right;">${safeAddress}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 12px; color: #8A94A6; font-size: 14px;">Phone</td>
        <td style="padding: 0 0 12px; color: #F5F7FA; font-size: 14px; text-align: right;">${safePhone}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 12px; color: #8A94A6; font-size: 14px;">Preferred contact</td>
        <td style="padding: 0 0 12px; color: #F5F7FA; font-size: 14px; text-align: right;">${safePreferredContact}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 12px; color: #8A94A6; font-size: 14px;">Estimate ID</td>
        <td style="padding: 0 0 12px; color: #F5F7FA; font-size: 14px; text-align: right;">${safeEstimateId}</td>
      </tr>
    </table>
    <div style="margin-top: 18px; padding: 16px; border-radius: 16px; background-color: #0D1318; border: 1px solid rgba(255,255,255,0.05);">
      <p style="margin: 0 0 8px; color: #8A94A6; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em;">Notes</p>
      <p style="margin: 0; color: #F5F7FA; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeNotes}</p>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[Resend] CMA request notification error:', error);
      await recordEmailEvent({
        workspaceId,
        emailType: 'cma_request_notification',
        status: 'failed',
        recipientEmail: recipient,
        metadata: {
          estimateId,
          requestEmail: email,
          reason:
            error instanceof Error
              ? error.message
              : typeof error === 'object' && error && 'message' in error
                ? String(error.message)
                : String(error),
        },
      });
      return { success: false, error };
    }

    await recordEmailEvent({
      workspaceId,
      emailType: 'cma_request_notification',
      status: 'sent',
      recipientEmail: recipient,
      resendMessageId: data?.id ?? null,
      metadata: {
        estimateId,
        requestEmail: email,
        address,
      },
    });
    return { success: true, data };
  } catch (error) {
    console.error('[Resend] CMA request notification exception:', error);
    await recordEmailEvent({
      workspaceId,
      emailType: 'cma_request_notification',
      status: 'failed',
      recipientEmail: recipient,
      metadata: {
        estimateId,
        requestEmail: email,
        address,
        reason: error instanceof Error ? error.message : String(error),
      },
    });
    return { success: false, error };
  }
}
