'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import {
  CalculationDetailsDisclosure,
  ClientEquityHero,
  EquitySnapshot,
  HpiTrend,
  MarketPulse,
} from '@/components/report';
import { FreeEvalCTA } from '@/components/results';
import { GlowButton } from '@/components/shared';
import { formatCurrency } from '@/lib/constants';
import { CurrentMarketStats, HPIEstimateResult } from '@/lib/estimation/hpi';
import {
  getLatestEstimateResult,
  getLatestPropertyData,
  setLatestPropertyData,
  type EstimatePropertyData,
} from '@/lib/estimate-storage';
import {
  calculateMonthlyPayment,
  calculateMortgageSummary,
  calculateRemainingBalance,
  calculateNetEquity,
} from '@/lib/calculation/mortgage-calculator';

interface BridgeEstimateResult extends HPIEstimateResult {
  dataEra?: 'historic' | 'hpi';
  dataSource?: string;
  bridgeNote?: string;
  benchmarkAtPurchase?: number | null;
  benchmarkAtPurchaseDate?: string | null;
  benchmarkCurrent?: number | null;
  benchmarkCurrentDate?: string | null;
  currentMarketStats?: CurrentMarketStats;
}

interface ApiHPIResult {
  estimateId: string;
  result: BridgeEstimateResult;
}

interface EditableMortgageAssumptions {
  interestRate: number;
  amortization: number;
  downPayment: number;
  secondaryMortgageBalance: number;
  helocBalance: number;
}

function formatPurchaseLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split('-');
  if (!year || !month) {
    return period;
  }

  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function buildInterpretation({
  purchaseLabel,
  region,
  propertyType,
  estimatedValue,
  marketChangePercent,
  netEquity,
  mortgageAvailable,
}: {
  purchaseLabel: string;
  region: string;
  propertyType: string;
  estimatedValue: number;
  marketChangePercent: number | null;
  netEquity: number | null;
  mortgageAvailable: boolean;
}) {
  const movementText =
    marketChangePercent === null
      ? `Since ${purchaseLabel}, benchmark pricing for ${propertyType.toLowerCase()} homes in ${region} has moved based on the latest available TRREB benchmark data.`
      : `Since ${purchaseLabel}, benchmark pricing for ${propertyType.toLowerCase()} homes in ${region} has moved ${marketChangePercent >= 0 ? 'up' : 'down'} ${Math.abs(marketChangePercent).toFixed(1)}%.`;

  if (!mortgageAvailable || netEquity === null) {
    return `${movementText} Your estimated home value is about ${formatCurrency(estimatedValue)}. Mortgage balance and net equity need the saved mortgage assumptions from your original estimate session.`;
  }

  return `${movementText} Based on your mortgage assumptions, that leaves about ${formatCurrency(netEquity)} in estimated equity today, built from both market movement and principal paydown.`;
}

export default function ResultsPage() {
  const params = useParams();
  const estimateId = params.sessionId as string;

  const [result, setResult] = useState<BridgeEstimateResult | null>(null);
  const [propertyData, setPropertyData] = useState<EstimatePropertyData | null>(null);
  const [editableAssumptions, setEditableAssumptions] = useState<EditableMortgageAssumptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }

    async function fetchEstimate() {
      hasFetchedRef.current = true;
      let hasLocalResult = false;

      const latestPropertyData = getLatestPropertyData();
      if (latestPropertyData?.estimateId === estimateId) {
        setPropertyData(latestPropertyData);
      }

      const latestEstimateResult = getLatestEstimateResult();
      if (latestEstimateResult?.estimateId === estimateId) {
        setResult(latestEstimateResult.result as BridgeEstimateResult);
        hasLocalResult = true;
      }

      if (typeof window !== 'undefined') {
        const cachedResult = window.sessionStorage.getItem(`estimate_${estimateId}`);
        if (cachedResult) {
          try {
            const parsed = JSON.parse(cachedResult) as BridgeEstimateResult;
            setResult(parsed);
            hasLocalResult = true;
            window.sessionStorage.removeItem(`estimate_${estimateId}`);
          } catch {
            setError('Unable to read your saved estimate. Please try again.');
          }
        }
      }

      if (hasLocalResult) {
        setLoading(false);
      }

      try {
        const estimateResponse = await fetch(`/api/estimate?id=${estimateId}`);

        if (!estimateResponse.ok) {
          const data = await estimateResponse.json().catch(() => null);
          if (!hasLocalResult) {
            setError(data?.error || 'Estimate not found');
          }
          return;
        }

        const data: ApiHPIResult = await estimateResponse.json();
        setResult(data.result);
      } catch {
        if (!hasLocalResult) {
          setError('Unable to load your estimate. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }

    void fetchEstimate();
  }, [estimateId]);

  useEffect(() => {
    if (!propertyData) {
      return;
    }

    setEditableAssumptions((current) => {
      if (current) {
        return current;
      }

      return {
        interestRate: propertyData.mortgageAssumptions.interestRate,
        amortization: propertyData.mortgageAssumptions.amortization,
        downPayment: propertyData.mortgageAssumptions.downPayment,
        secondaryMortgageBalance: propertyData.mortgageAssumptions.secondaryMortgageBalance ?? 0,
        helocBalance: propertyData.mortgageAssumptions.helocBalance ?? 0,
      };
    });
  }, [propertyData]);

  useEffect(() => {
    if (!propertyData || !editableAssumptions) {
      return;
    }

    setLatestPropertyData({
      ...propertyData,
      mortgageAssumptions: {
        ...propertyData.mortgageAssumptions,
        interestRate: editableAssumptions.interestRate,
        amortization: editableAssumptions.amortization,
        downPayment: editableAssumptions.downPayment,
        secondaryMortgageBalance: editableAssumptions.secondaryMortgageBalance,
        helocBalance: editableAssumptions.helocBalance,
      },
    });
  }, [editableAssumptions, propertyData]);

  const mortgagePosition = useMemo(() => {
    if (!propertyData || !result || !editableAssumptions) {
      return null;
    }

    const summary = calculateMortgageSummary({
      purchasePrice: propertyData.purchasePrice,
      purchaseYear: propertyData.purchaseYear,
      purchaseMonth: propertyData.purchaseMonth,
      interestRate: editableAssumptions.interestRate,
      amortizationYears: editableAssumptions.amortization,
      downPaymentAmount: editableAssumptions.downPayment,
    });
    const secondaryMortgageBalance = editableAssumptions.secondaryMortgageBalance;
    const helocBalance = editableAssumptions.helocBalance;
    const totalOutstandingDebt =
      summary.remainingBalance + secondaryMortgageBalance + helocBalance;

    return {
      summary,
      secondaryMortgageBalance,
      helocBalance,
      totalOutstandingDebt,
      netEquity: calculateNetEquity(result.estimatedCurrentValue, totalOutstandingDebt),
    };
  }, [editableAssumptions, propertyData, result]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent-blue" />
          <p className="text-muted-foreground">Loading your estimate...</p>
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-foreground">Estimate Not Found</h1>
          <p className="mb-6 text-muted-foreground">
            {error || "We couldn't find this estimate. It may have expired or the link is incorrect."}
          </p>
          <Link href="/">
            <GlowButton>Start a New Estimate</GlowButton>
          </Link>
        </div>
      </main>
    );
  }

  const purchaseLabel = formatPurchaseLabel(result.input.purchaseYear, result.input.purchaseMonth);
  const marketChangePercent =
    result.hpiAtPurchase > 0 ? ((result.hpiCurrent / result.hpiAtPurchase) - 1) * 100 : null;
  const benchmarkRangeLow = mortgagePosition
    ? calculateNetEquity(result.scenarios.soft.value, mortgagePosition.totalOutstandingDebt)
    : null;
  const benchmarkRangeHigh = mortgagePosition
    ? calculateNetEquity(result.scenarios.hot.value, mortgagePosition.totalOutstandingDebt)
    : null;
  const previousTrendPoint =
    result.hpiTrend && result.hpiTrend.length > 1
      ? result.hpiTrend[result.hpiTrend.length - 2]
      : null;
  const monthOverMonthValuePercent =
    previousTrendPoint && previousTrendPoint.hpiIndex > 0
      ? ((result.hpiCurrent / previousTrendPoint.hpiIndex) - 1) * 100
      : null;
  const previousMortgageBalance = mortgagePosition
    ? calculateRemainingBalance(
        mortgagePosition.summary.originalMortgage,
        mortgagePosition.summary.interestRate,
        mortgagePosition.summary.amortizationYears,
        Math.max(0, mortgagePosition.summary.monthsElapsed - 1)
      )
    : null;
  const monthlyMortgagePaydown =
    previousMortgageBalance !== null && mortgagePosition
      ? previousMortgageBalance - mortgagePosition.summary.remainingBalance
      : null;
  const previousTotalDebt =
    previousMortgageBalance !== null && mortgagePosition
      ? previousMortgageBalance +
        mortgagePosition.secondaryMortgageBalance +
        mortgagePosition.helocBalance
      : null;
  const previousEstimatedValue =
    monthOverMonthValuePercent !== null
      ? result.estimatedCurrentValue / (1 + monthOverMonthValuePercent / 100)
      : null;
  const previousNetEquity =
    previousEstimatedValue !== null && previousTotalDebt !== null
      ? calculateNetEquity(previousEstimatedValue, previousTotalDebt)
      : null;
  const monthlyEquityChange =
    previousNetEquity !== null && mortgagePosition
      ? mortgagePosition.netEquity - previousNetEquity
      : null;
  const originalAssumptions: EditableMortgageAssumptions | null = propertyData
    ? {
        interestRate: propertyData.mortgageAssumptions.interestRate,
        amortization: propertyData.mortgageAssumptions.amortization,
        downPayment: propertyData.mortgageAssumptions.downPayment,
        secondaryMortgageBalance: propertyData.mortgageAssumptions.secondaryMortgageBalance ?? 0,
        helocBalance: propertyData.mortgageAssumptions.helocBalance ?? 0,
      }
    : null;
  const refinanceRate = 5.25;
  const remainingAmortizationYears =
    mortgagePosition && editableAssumptions
      ? Math.max(
          1,
          (editableAssumptions.amortization * 12 - mortgagePosition.summary.monthsElapsed) / 12
        )
      : null;
  const currentEstimatedDebtPayment =
    mortgagePosition && editableAssumptions && remainingAmortizationYears !== null
      ? calculateMonthlyPayment(
          mortgagePosition.totalOutstandingDebt,
          editableAssumptions.interestRate,
          remainingAmortizationYears
        )
      : null;
  const refinancePayment =
    mortgagePosition && remainingAmortizationYears !== null
      ? calculateMonthlyPayment(
          mortgagePosition.totalOutstandingDebt,
          refinanceRate,
          remainingAmortizationYears
        )
      : null;
  const refinanceDelta =
    refinancePayment !== null && currentEstimatedDebtPayment !== null
      ? refinancePayment - currentEstimatedDebtPayment
      : null;
  const interpretation = buildInterpretation({
    purchaseLabel,
    region: result.input.region,
    propertyType: result.input.propertyType,
    estimatedValue: result.estimatedCurrentValue,
    marketChangePercent,
    netEquity: mortgagePosition?.netEquity ?? null,
    mortgageAvailable: Boolean(mortgagePosition),
  });
  const marketStats = result.currentMarketStats;

  return (
    <main className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-hero-gradient opacity-30" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.12),_transparent_30%)]" />

      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-foreground">
            GTA Equity Tracker
          </Link>
          <Link href="/">
            <GlowButton variant="ghost" size="sm">
              New Estimate
            </GlowButton>
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16">
        <motion.section
          className="py-8 sm:py-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <ClientEquityHero
              area={result.input.region}
              neighborhood={propertyData?.neighborhood ?? null}
              propertyType={result.input.propertyType}
              purchaseLabel={purchaseLabel}
              estimatedValue={result.estimatedCurrentValue}
              mortgageBalance={mortgagePosition?.totalOutstandingDebt ?? null}
              netEquity={mortgagePosition?.netEquity ?? null}
              monthOverMonthValuePercent={monthOverMonthValuePercent}
              monthlyMortgagePaydown={monthlyMortgagePaydown}
              monthlyEquityChange={monthlyEquityChange}
              interpretation={interpretation}
            />

            <MarketPulse
              averageSoldPrice={marketStats?.averageSoldPrice ?? null}
              averageDaysOnMarket={marketStats?.averageDaysOnMarket ?? null}
              monthsOfInventory={marketStats?.monthsOfInventory ?? null}
              reportMonth={marketStats?.reportMonth ?? null}
              scopeAreaName={marketStats?.scopeAreaName ?? null}
              isFallback={marketStats?.isFallback ?? false}
            />
          </div>
        </motion.section>

        {result.hpiTrend && result.hpiTrend.length > 0 ? (
          <motion.section
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <HpiTrend
              data={result.hpiTrend}
              purchaseDate={`${result.input.purchaseYear}-${result.input.purchaseMonth.toString().padStart(2, '0')}-01`}
              purchaseHpi={result.hpiAtPurchase}
              currentHpi={result.hpiCurrent}
            />
          </motion.section>
        ) : null}

        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <EquitySnapshot
            estimatedValue={result.estimatedCurrentValue}
            mortgageBalance={mortgagePosition?.totalOutstandingDebt ?? null}
            netEquity={mortgagePosition?.netEquity ?? null}
            currentEstimatedPayment={currentEstimatedDebtPayment}
            refinanceRate={refinanceRate}
            refinancePayment={refinancePayment}
            refinanceDelta={refinanceDelta}
          />
        </motion.section>

        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CalculationDetailsDisclosure
            purchasePrice={result.input.purchasePrice}
            monthsElapsed={mortgagePosition?.summary.monthsElapsed ?? null}
            values={
              editableAssumptions ?? {
                interestRate: 0,
                amortization: 25,
                downPayment: 0,
                secondaryMortgageBalance: 0,
                helocBalance: 0,
              }
            }
            originalValues={
              originalAssumptions ?? {
                interestRate: 0,
                amortization: 25,
                downPayment: 0,
                secondaryMortgageBalance: 0,
                helocBalance: 0,
              }
            }
            summary={{
              originalMortgage: mortgagePosition?.summary.originalMortgage ?? null,
              primaryRemainingBalance: mortgagePosition?.summary.remainingBalance ?? null,
              totalOutstandingDebt: mortgagePosition?.totalOutstandingDebt ?? null,
              principalPaid: mortgagePosition?.summary.principalPaidToDate ?? null,
              interestPaid: mortgagePosition?.summary.interestPaidToDate ?? null,
              monthlyPayment: mortgagePosition?.summary.monthlyPayment ?? null,
            }}
            onChange={(values) => setEditableAssumptions(values)}
            onReset={() => {
              if (originalAssumptions) {
                setEditableAssumptions(originalAssumptions);
              }
            }}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <FreeEvalCTA />
        </motion.section>

        <footer className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/70 bg-surface/50 px-4 py-3 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-cyan" />
          <span>Data source: TRREB benchmark &amp; market stats.</span>
          {marketStats?.reportMonth ? <span>Latest market pulse month: {formatPeriodLabel(marketStats.reportMonth)}.</span> : null}
        </footer>
      </div>
    </main>
  );
}
