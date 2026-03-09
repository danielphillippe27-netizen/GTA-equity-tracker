'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CircleCheckBig, Loader2, UserRoundPlus } from 'lucide-react';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import {
  AgentOnlyState,
  DashboardCard,
  PageHeader,
} from '@/components/dashboard/dashboard-ui';
import { formatCurrency } from '@/lib/constants';
import {
  calculateMortgagePosition,
  calculateNetEquity,
} from '@/lib/calculation/mortgage-calculator';
import { getHistoricalRate } from '@/lib/data/historical-rates';

interface HpiOptionsResponse {
  regions: string[];
  propertyTypes: string[];
}

interface EstimateResponse {
  estimateId: string;
  result: {
    estimatedCurrentValue: number;
  };
}

interface SignupSuccess {
  clientName: string;
  email: string;
  estimateId: string;
  modelCurrentValue: number;
  finalCurrentValue: number;
  finalNetEquity: number;
}

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function parseNumberInput(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeNumberInput(value: string, allowDecimals = false) {
  if (allowDecimals) {
    return value.replace(/[^0-9.]/g, '');
  }

  return value.replace(/[^0-9]/g, '');
}

export default function AddNewClientPage() {
  const { dashboard, refreshDashboard } = useDashboard();
  const [regions, setRegions] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const defaultYear = currentYear - 5;
  const defaultMonth = currentMonth;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [purchaseYear, setPurchaseYear] = useState(String(defaultYear));
  const [purchaseMonth, setPurchaseMonth] = useState(String(defaultMonth));
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentValueOverride, setCurrentValueOverride] = useState('');
  const [interestRate, setInterestRate] = useState(getHistoricalRate(defaultYear).toFixed(2));
  const [amortization, setAmortization] = useState('25');
  const [downPayment, setDownPayment] = useState('');
  const [secondaryMortgageBalance, setSecondaryMortgageBalance] = useState('0');
  const [helocBalance, setHelocBalance] = useState('0');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SignupSuccess | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        const response = await fetch('/api/hpi-options', { cache: 'no-store' });
        const payload = (await response.json()) as HpiOptionsResponse;

        if (!response.ok) {
          throw new Error('Failed to load region options.');
        }

        if (!isMounted) {
          return;
        }

        setRegions(payload.regions ?? []);
        setPropertyTypes(payload.propertyTypes ?? []);
      } catch (optionsError) {
        if (!isMounted) {
          return;
        }

        setError(
          optionsError instanceof Error
            ? optionsError.message
            : 'Unable to load options.'
        );
      } finally {
        if (isMounted) {
          setLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const parsedYear = Number(purchaseYear);
    if (!Number.isFinite(parsedYear) || parsedYear < 1980 || parsedYear > currentYear) {
      return;
    }

    setInterestRate(getHistoricalRate(parsedYear).toFixed(2));
  }, [currentYear, purchaseYear]);

  const workspaceSlug = dashboard?.workspace?.slug ?? null;
  const parsedPurchasePrice = parseNumberInput(purchasePrice);
  const parsedCurrentOverride = parseNumberInput(currentValueOverride);
  const parsedYear = Math.trunc(parseNumberInput(purchaseYear));
  const parsedMonth = Math.trunc(parseNumberInput(purchaseMonth));
  const parsedRate = parseNumberInput(interestRate);
  const parsedAmortization = Math.trunc(parseNumberInput(amortization));
  const parsedDownPayment = parseNumberInput(downPayment);
  const parsedSecondaryMortgageBalance = parseNumberInput(secondaryMortgageBalance);
  const parsedHelocBalance = parseNumberInput(helocBalance);

  const mortgagePreview = useMemo(() => {
    if (
      parsedPurchasePrice <= 0 ||
      parsedYear < 1980 ||
      parsedMonth < 1 ||
      parsedMonth > 12 ||
      parsedRate <= 0 ||
      parsedAmortization <= 0
    ) {
      return null;
    }

    return calculateMortgagePosition({
      purchasePrice: parsedPurchasePrice,
      purchaseYear: parsedYear,
      purchaseMonth: parsedMonth,
      interestRate: parsedRate,
      amortizationYears: parsedAmortization,
      downPaymentAmount: parsedDownPayment,
      secondaryMortgageBalance: parsedSecondaryMortgageBalance,
      helocBalance: parsedHelocBalance,
    });
  }, [
    parsedAmortization,
    parsedDownPayment,
    parsedHelocBalance,
    parsedMonth,
    parsedPurchasePrice,
    parsedRate,
    parsedSecondaryMortgageBalance,
    parsedYear,
  ]);

  const previewNetEquity =
    mortgagePreview && parsedCurrentOverride > 0
      ? calculateNetEquity(parsedCurrentOverride, mortgagePreview.totalOutstandingDebt)
      : null;

  const validEmail = email.includes('@') && email.includes('.');
  const canSubmit =
    Boolean(workspaceSlug) &&
    name.trim().length > 0 &&
    validEmail &&
    region.trim().length > 0 &&
    propertyType.trim().length > 0 &&
    parsedPurchasePrice > 0 &&
    parsedYear >= 1980 &&
    parsedYear <= currentYear &&
    parsedMonth >= 1 &&
    parsedMonth <= 12 &&
    parsedRate > 0 &&
    parsedAmortization > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit || !workspaceSlug || !mortgagePreview) {
      setError('Please complete all required fields before saving.');
      return;
    }

    setIsSubmitting(true);

    try {
      const estimateResponse = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceSlug,
          region,
          propertyType,
          purchaseYear: parsedYear,
          purchaseMonth: parsedMonth,
          purchasePrice: parsedPurchasePrice,
        }),
      });

      const estimateData = (await estimateResponse.json()) as EstimateResponse & { error?: string };

      if (!estimateResponse.ok) {
        throw new Error(estimateData.error || 'Failed to generate estimate.');
      }

      const modelCurrentValue = estimateData.result.estimatedCurrentValue;
      const finalCurrentValue = parsedCurrentOverride > 0 ? parsedCurrentOverride : modelCurrentValue;
      const finalNetEquity = calculateNetEquity(
        finalCurrentValue,
        mortgagePreview.totalOutstandingDebt
      );

      const propertyData = {
        estimateId: estimateData.estimateId,
        region,
        propertyType,
        purchaseYear: parsedYear,
        purchaseMonth: parsedMonth,
        purchasePrice: parsedPurchasePrice,
        estimatedCurrentValue: finalCurrentValue,
        modelEstimatedCurrentValue: modelCurrentValue,
        currentValueOverride: parsedCurrentOverride > 0 ? parsedCurrentOverride : null,
        netEquity: finalNetEquity,
        mortgageAssumptions: {
          interestRate: parsedRate,
          amortization: parsedAmortization,
          downPayment: parsedDownPayment,
          secondaryMortgageBalance: parsedSecondaryMortgageBalance,
          helocBalance: parsedHelocBalance,
        },
      };

      const subscribeResponse = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          estimateId: estimateData.estimateId,
          workspaceSlug,
          propertyData,
        }),
      });

      const subscribeData = (await subscribeResponse.json()) as { error?: string };
      if (!subscribeResponse.ok) {
        throw new Error(subscribeData.error || 'Failed to save client.');
      }

      await refreshDashboard();

      setSuccess({
        clientName: name.trim(),
        email: email.trim().toLowerCase(),
        estimateId: estimateData.estimateId,
        modelCurrentValue,
        finalCurrentValue,
        finalNetEquity,
      });

      setName('');
      setEmail('');
      setRegion('');
      setPropertyType('');
      setPurchasePrice('');
      setCurrentValueOverride('');
      setDownPayment('');
      setSecondaryMortgageBalance('0');
      setHelocBalance('0');
      setPurchaseYear(String(defaultYear));
      setPurchaseMonth(String(defaultMonth));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to add this client.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!dashboard) {
    return null;
  }

  if (dashboard.accountType !== 'agent') {
    return <AgentOnlyState />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Add New"
        title="Sign Up A New Client"
        description="Use the same estimate inputs and mortgage assumptions from your workflow, with an optional manual current value override."
      />

      <DashboardCard
        title="Client Intake"
        description="Creates an estimate, subscribes the client, and syncs to your workspace CRM."
        icon={<UserRoundPlus className="h-5 w-5 text-accent-cyan" />}
      >
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Client Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                placeholder="Jane Client"
                required
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Client Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                placeholder="jane@example.com"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Region</span>
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                required
                disabled={loadingOptions}
              >
                <option value="">{loadingOptions ? 'Loading...' : 'Select region'}</option>
                {regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Property Type</span>
              <select
                value={propertyType}
                onChange={(event) => setPropertyType(event.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                required
                disabled={loadingOptions}
              >
                <option value="">{loadingOptions ? 'Loading...' : 'Select type'}</option>
                {propertyTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Purchase Price</span>
              <input
                inputMode="numeric"
                value={purchasePrice}
                onChange={(event) => setPurchasePrice(sanitizeNumberInput(event.target.value))}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                placeholder="252000"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Purchase Year</span>
              <input
                inputMode="numeric"
                value={purchaseYear}
                onChange={(event) => setPurchaseYear(sanitizeNumberInput(event.target.value))}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                placeholder="2014"
                required
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Purchase Month</span>
              <select
                value={purchaseMonth}
                onChange={(event) => setPurchaseMonth(event.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                required
              >
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Interest Rate (%)</span>
              <input
                inputMode="decimal"
                value={interestRate}
                onChange={(event) =>
                  setInterestRate(sanitizeNumberInput(event.target.value, true))
                }
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                placeholder="5.25"
                required
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Amortization (years)</span>
              <input
                inputMode="numeric"
                value={amortization}
                onChange={(event) => setAmortization(sanitizeNumberInput(event.target.value))}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                placeholder="25"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Down Payment</span>
              <input
                inputMode="numeric"
                value={downPayment}
                onChange={(event) => setDownPayment(sanitizeNumberInput(event.target.value))}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Secondary Mortgage</span>
              <input
                inputMode="numeric"
                value={secondaryMortgageBalance}
                onChange={(event) =>
                  setSecondaryMortgageBalance(sanitizeNumberInput(event.target.value))
                }
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">HELOC Balance</span>
              <input
                inputMode="numeric"
                value={helocBalance}
                onChange={(event) => setHelocBalance(sanitizeNumberInput(event.target.value))}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-blue/70"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted-foreground">Current Value Override</span>
              <input
                inputMode="numeric"
                value={currentValueOverride}
                onChange={(event) =>
                  setCurrentValueOverride(sanitizeNumberInput(event.target.value))
                }
                className="rounded-2xl border border-accent-cyan/30 bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-accent-cyan"
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
            {mortgagePreview ? (
              <>
                <p>
                  Estimated outstanding debt from assumptions:{' '}
                  <span className="font-medium text-foreground">
                    {formatCurrency(mortgagePreview.totalOutstandingDebt)}
                  </span>
                </p>
                {previewNetEquity !== null ? (
                  <p className="mt-2">
                    Net equity based on override:{' '}
                    <span className="font-medium text-foreground">
                      {formatCurrency(previewNetEquity)}
                    </span>
                  </p>
                ) : (
                  <p className="mt-2">
                    Add a current value override to preview manual net equity before saving.
                  </p>
                )}
              </>
            ) : (
              <p>Complete purchase and mortgage fields to preview debt and equity values.</p>
            )}
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm">
              <div className="flex items-start gap-3">
                <CircleCheckBig className="mt-0.5 h-5 w-5 text-emerald-300" />
                <div className="space-y-1">
                  <p className="font-medium text-emerald-200">
                    {success.clientName} has been added and subscribed at {success.email}.
                  </p>
                  <p className="text-emerald-100/90">
                    Model value: {formatCurrency(success.modelCurrentValue)}. Saved current value:{' '}
                    {formatCurrency(success.finalCurrentValue)}. Net equity:{' '}
                    {formatCurrency(success.finalNetEquity)}.
                  </p>
                  <p className="text-emerald-100/80">
                    Estimate ID: {success.estimateId}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-accent-blue px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Client...
                </>
              ) : (
                'Add New Client'
              )}
            </button>
            <p className="text-xs text-muted-foreground">
              Creates estimate + monthly subscription + CRM record in this workspace.
            </p>
          </div>
        </form>
      </DashboardCard>
    </motion.div>
  );
}
