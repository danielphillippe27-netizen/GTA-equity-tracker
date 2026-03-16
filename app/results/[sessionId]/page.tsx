'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { SellBuyCalculatorScreen } from '@/components/calculators/SellBuyCalculator';
import {
  CalculationDetailsDisclosure,
  ClientEquityHero,
  EquitySnapshot,
  HpiTrend,
  MarketPulse,
} from '@/components/report';
import { FreeEvalCTA } from '@/components/results';
import { GlowButton } from '@/components/shared';
import { ContactTeamModal } from '@/app/evaluation/request/ContactTeamModal';
import { formatCurrency } from '@/lib/constants';
import { CurrentMarketStats, HPIEstimateResult } from '@/lib/estimation/hpi';
import { cn } from '@/lib/utils';
import {
  getLatestEstimateResult,
  getLatestPropertyData,
  setLatestPropertyData,
  type EstimatePropertyData,
} from '@/lib/estimate-storage';
import {
  calculateMonthlyPayment,
  calculateMortgagePosition,
  calculateMortgageSummary,
  calculatePreviousBalanceFromCurrentBalance,
  calculateRemainingBalance,
  calculateNetEquity,
} from '@/lib/calculation/mortgage-calculator';
import {
  applyRenovationValueAdd,
  resolveRenovationValueAdd,
} from '@/lib/renovation-adjustment';
import type { SellBuyCalculatorFormValues } from '@/types/sell-buy-calculator';

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
  propertyData?: EstimatePropertyData | null;
}

interface EditableMortgageAssumptions {
  interestRate: number;
  amortization: number;
  downPayment: number;
  secondaryMortgageBalance: number;
  helocBalance: number;
  renovationValueAdd: number;
  hasRefinanced: boolean;
  currentMortgageBalance: number;
  currentInterestRate: number;
  currentAmortization: number;
  refinanceYear: number;
}

type ResultsTab = 'dashboard' | 'sell-buy';

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

function toMonthIndex(period: string): number | null {
  const [year, month] = period.split('-');
  const numericYear = Number(year);
  const numericMonth = Number(month);

  if (
    !Number.isFinite(numericYear) ||
    !Number.isFinite(numericMonth) ||
    numericMonth < 1 ||
    numericMonth > 12
  ) {
    return null;
  }

  return numericYear * 12 + numericMonth;
}

function calculateRemainingAmortizationYears(totalAmortizationYears: number, monthsElapsed: number) {
  return Math.max(1, Math.ceil((totalAmortizationYears * 12 - monthsElapsed) / 12));
}

function buildEditableMortgageAssumptions(
  propertyData: EstimatePropertyData,
  modelEstimatedCurrentValue: number | null
): EditableMortgageAssumptions {
  const baseSummary = calculateMortgageSummary({
    purchasePrice: propertyData.purchasePrice,
    purchaseYear: propertyData.purchaseYear,
    purchaseMonth: propertyData.purchaseMonth,
    interestRate: propertyData.mortgageAssumptions.interestRate,
    amortizationYears: propertyData.mortgageAssumptions.amortization,
    downPaymentAmount: propertyData.mortgageAssumptions.downPayment,
  });

  return {
    interestRate: propertyData.mortgageAssumptions.interestRate,
    amortization: propertyData.mortgageAssumptions.amortization,
    downPayment: propertyData.mortgageAssumptions.downPayment,
    secondaryMortgageBalance: propertyData.mortgageAssumptions.secondaryMortgageBalance ?? 0,
    helocBalance: propertyData.mortgageAssumptions.helocBalance ?? 0,
    hasRefinanced: propertyData.mortgageAssumptions.hasRefinanced ?? false,
    currentMortgageBalance:
      propertyData.mortgageAssumptions.currentMortgageBalance ?? baseSummary.remainingBalance,
    currentInterestRate:
      propertyData.mortgageAssumptions.currentInterestRate ??
      propertyData.mortgageAssumptions.interestRate,
    currentAmortization:
      propertyData.mortgageAssumptions.currentAmortization ??
      calculateRemainingAmortizationYears(
        propertyData.mortgageAssumptions.amortization,
        baseSummary.monthsElapsed
      ),
    renovationValueAdd: resolveRenovationValueAdd(propertyData, modelEstimatedCurrentValue),
    refinanceYear: propertyData.mortgageAssumptions.refinanceYear ?? new Date().getFullYear(),
  };
}

function mergePropertyDataWithEditableAssumptions(
  propertyData: EstimatePropertyData,
  editableAssumptions: EditableMortgageAssumptions,
  modelEstimatedCurrentValue: number,
  netEquity: number | null
): EstimatePropertyData {
  const adjustedEstimatedCurrentValue = applyRenovationValueAdd(
    modelEstimatedCurrentValue,
    editableAssumptions.renovationValueAdd
  );

  return {
    ...propertyData,
    modelEstimatedCurrentValue,
    estimatedCurrentValue: adjustedEstimatedCurrentValue,
    renovationValueAdd: editableAssumptions.renovationValueAdd,
    netEquity: netEquity ?? propertyData.netEquity,
    mortgageAssumptions: {
      ...propertyData.mortgageAssumptions,
      interestRate: editableAssumptions.interestRate,
      amortization: editableAssumptions.amortization,
      downPayment: editableAssumptions.downPayment,
      secondaryMortgageBalance: editableAssumptions.secondaryMortgageBalance,
      helocBalance: editableAssumptions.helocBalance,
      hasRefinanced: editableAssumptions.hasRefinanced,
      currentMortgageBalance: editableAssumptions.currentMortgageBalance,
      currentInterestRate: editableAssumptions.currentInterestRate,
      currentAmortization: editableAssumptions.currentAmortization,
      refinanceYear: editableAssumptions.refinanceYear,
      renovationValueAdd: editableAssumptions.renovationValueAdd,
    },
  };
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

function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous <= 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function roundToNearestStep(value: number, step: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value / step) * step;
}

export default function ResultsPage() {
  const params = useParams();
  const estimateId = params.sessionId as string;

  const [result, setResult] = useState<BridgeEstimateResult | null>(null);
  const [propertyData, setPropertyData] = useState<EstimatePropertyData | null>(null);
  const [editableAssumptions, setEditableAssumptions] = useState<EditableMortgageAssumptions | null>(null);
  const [activeTab, setActiveTab] = useState<ResultsTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetchedRef = useRef(false);
  const syncTimeoutRef = useRef<number | null>(null);
  const lastSyncedPayloadRef = useRef<string>('');

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
        if (data.propertyData && latestPropertyData?.estimateId !== estimateId) {
          setPropertyData({
            ...data.propertyData,
            estimateId,
          });
        }
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
    if (!propertyData || !result) {
      return;
    }

    setEditableAssumptions((current) => {
      if (current) {
        return current;
      }

      return buildEditableMortgageAssumptions(
        propertyData,
        result.estimatedCurrentValue
      );
    });
  }, [propertyData, result]);

  const renovationValueAdd = Math.max(0, editableAssumptions?.renovationValueAdd ?? 0);
  const adjustedEstimatedCurrentValue =
    result ? applyRenovationValueAdd(result.estimatedCurrentValue, renovationValueAdd) : null;

  const mortgagePosition = useMemo(() => {
    if (
      !propertyData ||
      !result ||
      !editableAssumptions ||
      adjustedEstimatedCurrentValue === null
    ) {
      return null;
    }

    const position = calculateMortgagePosition({
      purchasePrice: propertyData.purchasePrice,
      purchaseYear: propertyData.purchaseYear,
      purchaseMonth: propertyData.purchaseMonth,
      interestRate: editableAssumptions.interestRate,
      amortizationYears: editableAssumptions.amortization,
      downPaymentAmount: editableAssumptions.downPayment,
      secondaryMortgageBalance: editableAssumptions.secondaryMortgageBalance,
      helocBalance: editableAssumptions.helocBalance,
      refinance: {
        enabled: editableAssumptions.hasRefinanced,
        currentBalance: editableAssumptions.currentMortgageBalance,
        interestRate: editableAssumptions.currentInterestRate,
        amortizationYears: editableAssumptions.currentAmortization,
        refinanceYear: editableAssumptions.refinanceYear,
      },
    });

    return {
      ...position,
      netEquity: calculateNetEquity(
        adjustedEstimatedCurrentValue,
        position.totalOutstandingDebt
      ),
    };
  }, [adjustedEstimatedCurrentValue, editableAssumptions, propertyData, result]);

  const mergedPropertyData = useMemo(() => {
    if (!propertyData || !editableAssumptions || !result) {
      return null;
    }

    return mergePropertyDataWithEditableAssumptions(
      propertyData,
      editableAssumptions,
      result.estimatedCurrentValue,
      mortgagePosition?.netEquity ?? null
    );
  }, [editableAssumptions, mortgagePosition?.netEquity, propertyData, result]);

  useEffect(() => {
    if (!mergedPropertyData) {
      return;
    }

    setLatestPropertyData(mergedPropertyData);
  }, [mergedPropertyData]);

  useEffect(() => {
    if (!mergedPropertyData) {
      return;
    }

    const payload = JSON.stringify({
      estimateId,
      propertyData: mergedPropertyData,
    });

    if (payload === lastSyncedPayloadRef.current) {
      return;
    }

    if (syncTimeoutRef.current !== null) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      void fetch('/api/estimate/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })
        .then((response) => {
          if (response.ok) {
            lastSyncedPayloadRef.current = payload;
            return;
          }

          console.error(
            '[Results] Failed to persist property data:',
            response.status
          );
        })
        .catch((persistError) => {
          console.error('[Results] Failed to persist property data:', persistError);
        });
    }, 500);

    return () => {
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [estimateId, mergedPropertyData]);

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
  const currentTrendPoint =
    result.hpiTrend && result.hpiTrend.length > 0
      ? result.hpiTrend[result.hpiTrend.length - 1]
      : null;
  const previousTrendPoint =
    result.hpiTrend && result.hpiTrend.length > 1
      ? result.hpiTrend[result.hpiTrend.length - 2]
      : null;
  const currentTrendMetric =
    currentTrendPoint?.benchmarkPrice ?? currentTrendPoint?.hpiIndex ?? null;
  const previousTrendMetric =
    previousTrendPoint?.benchmarkPrice ?? previousTrendPoint?.hpiIndex ?? null;
  const currentTrendMonthIndex =
    currentTrendPoint ? toMonthIndex(currentTrendPoint.reportMonth) : null;
  const previousTrendMonthIndex =
    previousTrendPoint ? toMonthIndex(previousTrendPoint.reportMonth) : null;
  const hasConsecutiveMonthlyTrend =
    currentTrendMonthIndex !== null &&
    previousTrendMonthIndex !== null &&
    currentTrendMonthIndex - previousTrendMonthIndex === 1;
  const monthOverMonthValuePercent = hasConsecutiveMonthlyTrend
    ? percentChange(currentTrendMetric, previousTrendMetric)
    : null;
  const previousMortgageBalance = mortgagePosition
    ? mortgagePosition.mode === 'refinance'
      ? calculatePreviousBalanceFromCurrentBalance(
          mortgagePosition.summary.primaryRemainingBalance,
          mortgagePosition.summary.interestRate,
          mortgagePosition.summary.amortizationYears
        )
      : calculateRemainingBalance(
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
  const originalAssumptions: EditableMortgageAssumptions | null = propertyData
    ? buildEditableMortgageAssumptions(
        propertyData,
        result.estimatedCurrentValue
      )
    : null;
  const refinanceRate = 5.25;
  const remainingAmortizationYears =
    mortgagePosition
      ? mortgagePosition.mode === 'refinance'
        ? mortgagePosition.summary.amortizationYears
        : Math.max(
            1,
            (mortgagePosition.summary.amortizationYears * 12 -
              mortgagePosition.summary.monthsElapsed) /
              12
          )
      : null;
  const currentEstimatedDebtPayment =
    mortgagePosition && remainingAmortizationYears !== null
      ? calculateMonthlyPayment(
          mortgagePosition.totalOutstandingDebt,
          mortgagePosition.summary.interestRate,
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
    estimatedValue: adjustedEstimatedCurrentValue ?? result.estimatedCurrentValue,
    marketChangePercent,
    netEquity: mortgagePosition?.netEquity ?? null,
    mortgageAvailable: Boolean(mortgagePosition),
  });
  const marketStats = result.currentMarketStats;
  const estimatedCurrentValueForCalculator = Math.max(
    0,
    roundToNearestStep(adjustedEstimatedCurrentValue ?? result.estimatedCurrentValue, 1000)
  );
  const currentMortgageBalanceForCalculator = Math.max(
    0,
    mortgagePosition?.totalOutstandingDebt ??
      editableAssumptions?.currentMortgageBalance ??
      propertyData?.mortgageAssumptions.currentMortgageBalance ??
      0
  );
  const currentMonthlyPaymentForCalculator = Math.max(
    0,
    currentEstimatedDebtPayment ?? mortgagePosition?.summary.monthlyPayment ?? 0
  );
  const effectiveCurrentRateForCalculator = Math.max(
    0,
    editableAssumptions?.currentInterestRate ??
      mortgagePosition?.summary.interestRate ??
      editableAssumptions?.interestRate ??
      0
  );
  const calculatorInitialValues: SellBuyCalculatorFormValues = {
      currentHome: {
        estimatedCurrentValue: estimatedCurrentValueForCalculator,
        expectedSalePrice: estimatedCurrentValueForCalculator,
        currentMortgageBalance: currentMortgageBalanceForCalculator,
        currentInterestRate: effectiveCurrentRateForCalculator,
        currentMonthlyPayment: currentMonthlyPaymentForCalculator,
        realtorCommissionPercent: 4.5,
        commissionIncludesHst: true,
        legalFeesOnSale: 3500,
        mortgageDischargeFee: 0,
        mortgagePenalty: 0,
      bridgeFinancingEstimate: 0,
    },
    purchase: {
      purchasePrice: Math.max(500000, roundToNearestStep(estimatedCurrentValueForCalculator, 5000)),
      province: 'ON',
      city: result.input.region,
      propertyTaxesAnnual: 0,
      condoFeesMonthly: 0,
      purchaseLegalFees: 0,
      titleInsuranceAndAdjustments: 0,
      additionalCashAdded: 0,
      equityStrategy: 'all',
      customEquityAmount: 0,
      reserveAmount: 50000,
    },
    financing: {
      mode: 'simple',
      simpleInterestRate:
        effectiveCurrentRateForCalculator || editableAssumptions?.interestRate || 4.04,
      amortizationYears:
        editableAssumptions?.currentAmortization ?? editableAssumptions?.amortization ?? 25,
      paymentFrequency: 'monthly',
      portExistingMortgage: false,
      portedMortgageBalance: 0,
      portedInterestRate: 0,
      topUpInterestRate:
        effectiveCurrentRateForCalculator || editableAssumptions?.interestRate || 4.04,
      manualBlendedRate: 0,
    },
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-hero-gradient opacity-30" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.12),_transparent_30%)]" />

      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Equity Tracker
          </Link>
          <div className="flex items-center gap-3">
            <ContactTeamModal
              triggerLabel="Real Estate Questions?"
              triggerClassName="inline-flex items-center justify-center rounded-full border border-white/14 bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
            />
            <Link href={`/evaluation/request?estimateId=${estimateId}`}>
              <GlowButton size="sm">
                Request Free Home Evaluation
              </GlowButton>
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16">
        <motion.section
          className="py-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="inline-flex rounded-full border border-border/70 bg-surface/70 p-1">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'sell-buy', label: 'Sell & Buy Calculator' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ResultsTab)}
                className={cn(
                  'rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-accent-blue text-primary-foreground shadow-[0_12px_30px_rgba(59,130,246,0.35)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.section>

        {activeTab === 'dashboard' ? (
          <>
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
              estimatedValue={adjustedEstimatedCurrentValue ?? result.estimatedCurrentValue}
              principalPaidSincePurchase={
                mortgagePosition?.originalSummary.principalPaidToDate ?? null
              }
              netEquity={mortgagePosition?.netEquity ?? null}
              monthOverMonthValuePercent={monthOverMonthValuePercent}
              monthlyMortgagePaydown={monthlyMortgagePaydown}
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

        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          <FreeEvalCTA estimateId={estimateId} />
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
            estimatedValue={adjustedEstimatedCurrentValue ?? result.estimatedCurrentValue}
            mortgageBalance={mortgagePosition?.totalOutstandingDebt ?? null}
            netEquity={mortgagePosition?.netEquity ?? null}
            currentEstimatedPayment={currentEstimatedDebtPayment}
            refinanceRate={refinanceRate}
            refinancePayment={refinancePayment}
            refinanceDelta={refinanceDelta}
            accessedEquitySincePurchase={
              mortgagePosition?.summary.accessedEquitySincePurchase ?? null
            }
            renovationValueAdd={renovationValueAdd}
            onRenovationValueAddChange={(value) =>
              setEditableAssumptions((current) =>
                current
                  ? {
                      ...current,
                      renovationValueAdd: Math.max(0, Math.round(value)),
                    }
                  : current
              )
            }
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
                renovationValueAdd: 0,
                hasRefinanced: false,
                currentMortgageBalance: 0,
                currentInterestRate: 0,
                currentAmortization: 25,
                refinanceYear: new Date().getFullYear(),
              }
            }
            originalValues={
              originalAssumptions ?? {
                interestRate: 0,
                amortization: 25,
                downPayment: 0,
                secondaryMortgageBalance: 0,
                helocBalance: 0,
                renovationValueAdd: 0,
                hasRefinanced: false,
                currentMortgageBalance: 0,
                currentInterestRate: 0,
                currentAmortization: 25,
                refinanceYear: new Date().getFullYear(),
              }
            }
            summary={{
              mode: mortgagePosition?.summary.mode ?? 'original',
              originalMortgage: mortgagePosition?.summary.originalMortgage ?? null,
              primaryRemainingBalance:
                mortgagePosition?.summary.primaryRemainingBalance ?? null,
              totalOutstandingDebt: mortgagePosition?.totalOutstandingDebt ?? null,
              principalPaid: mortgagePosition?.summary.principalPaidToDate ?? null,
              interestPaid: mortgagePosition?.summary.interestPaidToDate ?? null,
              monthlyPayment: mortgagePosition?.summary.monthlyPayment ?? null,
              accessedEquitySincePurchase:
                mortgagePosition?.summary.accessedEquitySincePurchase ?? null,
              refinanceYear: mortgagePosition?.summary.refinanceYear ?? null,
              currentEquity: mortgagePosition?.netEquity ?? null,
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
          className="mb-8 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
        >
          <div className="relative h-10 w-48 opacity-80 sm:h-12 sm:w-56">
            <Image
              src="/REVEL Grey Logo.png"
              alt="Revel Realty logo"
              fill
              className="object-contain"
              sizes="224px"
            />
          </div>
        </motion.section>

        <footer className="mt-6 rounded-2xl border border-border/70 bg-surface/50 px-4 py-3 text-center text-xs text-muted-foreground">
          <p className="leading-relaxed">
            Home value estimates are calculated using publicly available market statistics and user-provided information. Estimates are not provided by TRREB/PropTx and should not be relied upon as a professional appraisal.
          </p>
        </footer>
          </>
        ) : (
          <motion.section
            className="pb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <SellBuyCalculatorScreen embedded initialValues={calculatorInitialValues} />
          </motion.section>
        )}
      </div>
    </main>
  );
}
