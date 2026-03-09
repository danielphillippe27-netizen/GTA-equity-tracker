import { calculateEquityBridge } from '@/lib/calculation/bridge-calculator';
import {
  calculateMortgagePosition,
  calculateNetEquity,
} from '@/lib/calculation/mortgage-calculator';
import { sendMonthlyReport } from '@/lib/email/resend';
import {
  type CurrentMarketStats,
  getRecentMarketSnapshots,
  getRecentMarketStats,
} from '@/lib/estimation/hpi';
import {
  applyRenovationValueAdd,
  resolveRenovationValueAdd,
} from '@/lib/renovation-adjustment';
import { createServerClient } from '@/lib/supabase/server';

interface SubscriberRecord {
  id: string;
  email: string;
  name: string | null;
  workspace_id?: string | null;
  property_data: Record<string, unknown> | null;
  estimate_id: string | null;
  last_report_sent?: string | null;
}

interface MonthlyReportPropertyData {
  estimateId?: string;
  region: string;
  propertyType: string;
  purchaseYear: number;
  purchaseMonth: number;
  purchasePrice: number;
  estimatedCurrentValue?: number;
  modelEstimatedCurrentValue?: number;
  currentValueOverride?: number | null;
  renovationValueAdd?: number;
  netEquity?: number;
  mortgageAssumptions: {
    interestRate?: number;
    amortization?: number;
    downPayment?: number;
    secondaryMortgageBalance?: number;
    helocBalance?: number;
    hasRefinanced?: boolean;
    currentMortgageBalance?: number;
    currentInterestRate?: number;
    currentAmortization?: number;
    refinanceYear?: number;
    renovationValueAdd?: number;
  };
  [key: string]: unknown;
}

interface LatestMonthlyReportMetadata {
  reportMonth?: unknown;
}

interface MonthlyReportOptions {
  dryRun?: boolean;
  limit?: number;
  subscriberId?: string;
}

interface MonthlyReportRunSummary {
  dryRun: boolean;
  processed: number;
  wouldSend: number;
  sent: number;
  failed: number;
  skipped: number;
  results: Array<Record<string, unknown>>;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseInteger(value: unknown): number | null {
  const parsed = parseNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function isValidEmailAddress(email: string): boolean {
  if (!email || email.includes('..')) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function normalizePropertyData(raw: Record<string, unknown> | null): MonthlyReportPropertyData | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const region = typeof raw.region === 'string' ? raw.region.trim() : '';
  const propertyType = typeof raw.propertyType === 'string' ? raw.propertyType.trim() : '';
  const purchaseYear = parseInteger(raw.purchaseYear);
  const purchaseMonth = parseInteger(raw.purchaseMonth);
  const purchasePrice = parseNumber(raw.purchasePrice);
  const mortgageAssumptions =
    raw.mortgageAssumptions && typeof raw.mortgageAssumptions === 'object'
      ? (raw.mortgageAssumptions as MonthlyReportPropertyData['mortgageAssumptions'])
      : {};

  if (!region || !propertyType || !purchaseYear || !purchaseMonth || !purchasePrice) {
    return null;
  }

  return {
    ...(raw as MonthlyReportPropertyData),
    region,
    propertyType,
    purchaseYear,
    purchaseMonth,
    purchasePrice,
    mortgageAssumptions,
  };
}

async function getActiveSubscribers(
  limit?: number,
  subscriberId?: string
): Promise<SubscriberRecord[]> {
  const supabase = createServerClient();

  if (subscriberId) {
      const { data, error } = await supabase
      .from('subscribers')
      .select('id, email, name, workspace_id, property_data, estimate_id, last_report_sent')
      .eq('id', subscriberId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? [data as SubscriberRecord] : [];
  }

  const { data, error } = await supabase
    .from('subscribers')
    .select('id, email, name, workspace_id, property_data, estimate_id, last_report_sent')
    .eq('monthly_reports', true)
    .is('unsubscribed_at', null)
    .order('subscribed_at', { ascending: true });

  if (error) {
    throw error;
  }

  const activeSubscribers = (data ?? []) as SubscriberRecord[];
  return typeof limit === 'number' ? activeSubscribers.slice(0, limit) : activeSubscribers;
}

function getLastDeliveredReportMonth(
  propertyData: MonthlyReportPropertyData | null
): string | null {
  if (!propertyData || typeof propertyData !== 'object') {
    return null;
  }

  const latestMonthlyReport =
    propertyData.latestMonthlyReport as LatestMonthlyReportMetadata | undefined;

  return typeof latestMonthlyReport?.reportMonth === 'string'
    ? latestMonthlyReport.reportMonth
    : null;
}

function buildUpdatedPropertyData(
  propertyData: MonthlyReportPropertyData,
  estimatedCurrentValue: number,
  modelEstimatedCurrentValue: number,
  renovationValueAdd: number,
  netEquity: number,
  marketStats: CurrentMarketStats | null,
  reportMonth: string | null,
  lastReportSentAt: string
): MonthlyReportPropertyData {
  return {
    ...propertyData,
    estimatedCurrentValue,
    modelEstimatedCurrentValue,
    renovationValueAdd,
    netEquity,
    currentMarketStats: marketStats,
    latestMonthlyReport: {
      reportMonth,
      sentAt: lastReportSentAt,
      estimatedCurrentValue,
      netEquity,
      scopeAreaName: marketStats?.scopeAreaName ?? propertyData.region,
    },
  };
}

export async function runMonthlyReports(
  options: MonthlyReportOptions = {}
): Promise<MonthlyReportRunSummary> {
  const { dryRun = false, limit, subscriberId } = options;
  const supabase = createServerClient();
  const subscribers = await getActiveSubscribers(limit, subscriberId);

  const summary: MonthlyReportRunSummary = {
    dryRun,
    processed: subscribers.length,
    wouldSend: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  for (const subscriber of subscribers) {
    const email = subscriber.email?.trim().toLowerCase();
    const propertyData = normalizePropertyData(subscriber.property_data);

    if (!email || !isValidEmailAddress(email)) {
      summary.skipped += 1;
      summary.results.push({
        subscriberId: subscriber.id,
        email: subscriber.email,
        status: 'skipped',
        reason: 'Invalid subscriber email',
      });
      continue;
    }

    if (!propertyData) {
      summary.skipped += 1;
      summary.results.push({
        subscriberId: subscriber.id,
        email,
        status: 'skipped',
        reason: 'Missing or invalid property_data payload',
      });
      continue;
    }

      const estimateResult = await calculateEquityBridge({
      region: propertyData.region,
      propertyType: propertyData.propertyType,
      purchaseYear: propertyData.purchaseYear,
      purchaseMonth: propertyData.purchaseMonth,
      purchasePrice: propertyData.purchasePrice,
    }, {
      workspaceId: subscriber.workspace_id ?? null,
    });

    if ('error' in estimateResult) {
      summary.failed += 1;
      summary.results.push({
        subscriberId: subscriber.id,
        email,
        status: 'failed',
        reason: estimateResult.error,
      });
      continue;
    }

    const [marketSnapshots, marketStatsHistory] = await Promise.all([
      getRecentMarketSnapshots(propertyData.region, propertyData.propertyType, 2, {
        workspaceId: subscriber.workspace_id ?? null,
      }),
      getRecentMarketStats(propertyData.region, propertyData.propertyType, 2, {
        workspaceId: subscriber.workspace_id ?? null,
      }),
    ]);

    const currentSnapshot = marketSnapshots[0] ?? null;
    const previousSnapshot = marketSnapshots[1] ?? null;
    const currentMarketStats = marketStatsHistory[0] ?? estimateResult.currentMarketStats ?? null;
    const previousMarketStats = marketStatsHistory[1] ?? null;
    const currentReportMonth =
      currentSnapshot?.reportMonth ?? currentMarketStats?.reportMonth ?? null;
    const previousReportMonth =
      previousSnapshot?.reportMonth ?? previousMarketStats?.reportMonth ?? null;
    const lastDeliveredReportMonth = getLastDeliveredReportMonth(propertyData);

    if (!currentReportMonth) {
      summary.skipped += 1;
      summary.results.push({
        subscriberId: subscriber.id,
        email,
        status: 'skipped',
        reason: 'No current report month available for this subscriber',
      });
      continue;
    }

    if (currentReportMonth === lastDeliveredReportMonth) {
      summary.skipped += 1;
      summary.results.push({
        subscriberId: subscriber.id,
        email,
        status: 'skipped',
        reason: `Latest report month ${currentReportMonth} already delivered`,
      });
      continue;
    }

    const mortgagePosition = calculateMortgagePosition({
      purchasePrice: propertyData.purchasePrice,
      purchaseYear: propertyData.purchaseYear,
      purchaseMonth: propertyData.purchaseMonth,
      interestRate: parseNumber(propertyData.mortgageAssumptions.interestRate) ?? undefined,
      amortizationYears:
        parseInteger(propertyData.mortgageAssumptions.amortization) ?? undefined,
      downPaymentAmount: parseNumber(propertyData.mortgageAssumptions.downPayment) ?? undefined,
      secondaryMortgageBalance:
        parseNumber(propertyData.mortgageAssumptions.secondaryMortgageBalance) ?? 0,
      helocBalance: parseNumber(propertyData.mortgageAssumptions.helocBalance) ?? 0,
      refinance: {
        enabled: propertyData.mortgageAssumptions.hasRefinanced === true,
        currentBalance: parseNumber(propertyData.mortgageAssumptions.currentMortgageBalance) ?? undefined,
        interestRate: parseNumber(propertyData.mortgageAssumptions.currentInterestRate) ?? undefined,
        amortizationYears:
          parseInteger(propertyData.mortgageAssumptions.currentAmortization) ?? undefined,
        refinanceYear: parseInteger(propertyData.mortgageAssumptions.refinanceYear),
      },
    });

    const totalOutstandingDebt = mortgagePosition.totalOutstandingDebt;
    const modelEstimatedCurrentValue = estimateResult.estimatedCurrentValue;
    const renovationValueAdd = resolveRenovationValueAdd(
      propertyData,
      modelEstimatedCurrentValue
    );
    const estimatedCurrentValue = applyRenovationValueAdd(
      modelEstimatedCurrentValue,
      renovationValueAdd
    );
    const netEquity = calculateNetEquity(estimatedCurrentValue, totalOutstandingDebt);

    const currentHpi = currentSnapshot?.hpiIndex ?? null;
    const previousHpi = previousSnapshot?.hpiIndex ?? null;
    const previousValue =
      currentHpi !== null && previousHpi !== null && currentHpi !== 0
        ? applyRenovationValueAdd(
            Math.round(modelEstimatedCurrentValue * (previousHpi / currentHpi)),
            renovationValueAdd
          )
        : Math.round(parseNumber(propertyData.estimatedCurrentValue) ?? estimatedCurrentValue);

    const benchmarkPrice = currentSnapshot?.benchmarkPrice ?? estimateResult.benchmarkCurrent;
    const benchmarkPriceChange =
      percentChange(currentSnapshot?.benchmarkPrice ?? null, previousSnapshot?.benchmarkPrice ?? null) ??
      percentChange(currentHpi, previousHpi);
    const averageSoldPriceChange = percentChange(
      currentMarketStats?.averageSoldPrice ?? null,
      previousMarketStats?.averageSoldPrice ?? null
    );

    const reportPayload = {
      subscriberId: subscriber.id,
      email,
      name: subscriber.name || 'Homeowner',
      estimateId:
        (typeof propertyData.estimateId === 'string' && propertyData.estimateId) ||
        subscriber.estimate_id,
      region: propertyData.region,
      propertyType: propertyData.propertyType,
      estimatedCurrentValue,
      previousValue,
      netEquity,
      reportMonth: currentReportMonth,
      scopeAreaName: currentMarketStats?.scopeAreaName ?? propertyData.region,
      dataSource: estimateResult.dataSource,
    };

    if (dryRun) {
      summary.wouldSend += 1;
      summary.results.push({
        ...reportPayload,
        status: 'dry-run',
        benchmarkPrice,
        benchmarkPriceChange,
        averageSoldPrice: currentMarketStats?.averageSoldPrice ?? null,
        averageSoldPriceChange,
        sales: currentMarketStats?.sales ?? null,
        newListings: currentMarketStats?.newListings ?? null,
        activeListings: currentMarketStats?.activeListings ?? null,
        averageDaysOnMarket: currentMarketStats?.averageDaysOnMarket ?? null,
        monthsOfInventory: currentMarketStats?.monthsOfInventory ?? null,
        salesToNewListingsRatio: currentMarketStats?.salesToNewListingsRatio ?? null,
      });
      continue;
    }

    const sendResult = await sendMonthlyReport({
      to: email,
      name: subscriber.name || 'Homeowner',
      subscriberId: subscriber.id,
      workspaceId: subscriber.workspace_id ?? null,
      estimateId:
        (typeof propertyData.estimateId === 'string' && propertyData.estimateId) ||
        subscriber.estimate_id,
      estimatedValue: estimatedCurrentValue,
      previousValue,
      equityGained: estimateResult.equityGained,
      netEquity,
      region: propertyData.region,
      propertyType: propertyData.propertyType,
      marketChange: benchmarkPriceChange ?? 0,
      reportMonth: currentReportMonth,
      previousReportMonth,
      benchmarkPrice,
      benchmarkPriceChange,
      averageSoldPrice: currentMarketStats?.averageSoldPrice ?? null,
      averageSoldPriceChange,
      sales: currentMarketStats?.sales ?? null,
      newListings: currentMarketStats?.newListings ?? null,
      activeListings: currentMarketStats?.activeListings ?? null,
      averageDaysOnMarket: currentMarketStats?.averageDaysOnMarket ?? null,
      monthsOfInventory: currentMarketStats?.monthsOfInventory ?? null,
      scopeAreaName: currentMarketStats?.scopeAreaName ?? propertyData.region,
      dataSource: estimateResult.dataSource,
      isFallback: currentMarketStats?.isFallback ?? false,
    });

    if (!sendResult.success) {
      summary.failed += 1;
      summary.results.push({
        ...reportPayload,
        status: 'failed',
        reason:
          sendResult.error instanceof Error
            ? sendResult.error.message
            : String(sendResult.error),
      });
      continue;
    }

    const sentAt = new Date().toISOString();
    const updatedPropertyData = buildUpdatedPropertyData(
      propertyData,
      estimatedCurrentValue,
      modelEstimatedCurrentValue,
      renovationValueAdd,
      netEquity,
      currentMarketStats,
      currentReportMonth,
      sentAt
    );

    const { error: updateError } = await supabase
      .from('subscribers')
      .update({
        last_report_sent: sentAt,
        property_data: updatedPropertyData,
      })
      .eq('id', subscriber.id);

    if (updateError) {
      summary.failed += 1;
      summary.results.push({
        ...reportPayload,
        status: 'failed',
        reason: `Email sent but subscriber update failed: ${updateError.message}`,
      });
      continue;
    }

    summary.sent += 1;
    summary.results.push({
      ...reportPayload,
      status: 'sent',
      lastReportSent: sentAt,
    });
  }

  return summary;
}
