'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calculator,
  Home,
  Landmark,
  Printer,
} from 'lucide-react';
import { PageHeader } from '@/components/dashboard/dashboard-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ONTARIO_CITIES } from '@/lib/ontario-cities';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/constants';
import type {
  CurrentHomeFormValues,
  FinancingFormValues,
  MortgageMode,
  PaymentFrequency,
  PurchaseFormValues,
  SellBuyCalculatorFormValues,
  SellBuyCalculatorResults,
} from '@/types/sell-buy-calculator';
import { calculateSellBuyScenario } from '@/utils/calculators/sell-buy';
import { buildSellBuyPrintableReportHtml } from '@/utils/calculators/sell-buy-print';

const DEFAULT_FORM_VALUES: SellBuyCalculatorFormValues = {
  currentHome: {
    estimatedCurrentValue: 790000,
    expectedSalePrice: 790000,
    currentMortgageBalance: 650393.31,
    currentInterestRate: 0,
    currentMonthlyPayment: 0,
    realtorCommissionPercent: 4.5,
    commissionIncludesHst: true,
    legalFeesOnSale: 3500,
    mortgageDischargeFee: 0,
    mortgagePenalty: 0,
    bridgeFinancingEstimate: 0,
  },
  purchase: {
    purchasePrice: 805000,
    province: 'ON',
    city: 'Ajax',
    propertyTaxesAnnual: 6024,
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
    simpleInterestRate: 4.04,
    amortizationYears: 25,
    paymentFrequency: 'monthly',
    portExistingMortgage: false,
    portedMortgageBalance: 0,
    portedInterestRate: 0,
    topUpInterestRate: 4.04,
    manualBlendedRate: 0,
  },
};

const RESERVE_PRESETS = [25000, 50000, 100000];

export function SellBuyCalculatorScreen({
  initialValues,
  embedded = false,
}: {
  initialValues?: SellBuyCalculatorFormValues;
  embedded?: boolean;
}) {
  const baselineValues = initialValues ?? DEFAULT_FORM_VALUES;
  const [formValues, setFormValues] = useState<SellBuyCalculatorFormValues>(baselineValues);
  const [showAdvancedSaleOptions, setShowAdvancedSaleOptions] = useState(false);
  const [showAdvancedPurchaseOptions, setShowAdvancedPurchaseOptions] = useState(false);
  const [showAdvancedMortgageOptions, setShowAdvancedMortgageOptions] = useState(false);
  const results = calculateSellBuyScenario(formValues);
  const equityStrategyLabel = getEquityStrategyLabel(formValues.purchase.equityStrategy);
  const totalSalePayout = results.sale.mortgagePayout + results.sale.totalSellingCosts;

  useEffect(() => {
    setFormValues(baselineValues);
  }, [baselineValues]);

  function updateCurrentHome<K extends keyof CurrentHomeFormValues>(
    key: K,
    value: CurrentHomeFormValues[K]
  ) {
    setFormValues((current) => ({
      ...current,
      currentHome: {
        ...current.currentHome,
        [key]: value,
      },
    }));
  }

  function updateSalePrice(value: number) {
    setFormValues((current) => ({
      ...current,
      currentHome: {
        ...current.currentHome,
        expectedSalePrice: value,
        estimatedCurrentValue: value,
      },
    }));
  }

  function updatePurchase<K extends keyof PurchaseFormValues>(
    key: K,
    value: PurchaseFormValues[K]
  ) {
    setFormValues((current) => ({
      ...current,
      purchase: {
        ...current.purchase,
        [key]: value,
      },
    }));
  }

  function updateFinancing<K extends keyof FinancingFormValues>(
    key: K,
    value: FinancingFormValues[K]
  ) {
    setFormValues((current) => ({
      ...current,
      financing: {
        ...current.financing,
        [key]: value,
      },
    }));
  }

  function setMortgageMode(mode: MortgageMode) {
    setFormValues((current) => ({
      ...current,
      financing: {
        ...current.financing,
        mode,
        portExistingMortgage: mode === 'port',
      },
    }));
  }

  function setPaymentFrequency(value: PaymentFrequency) {
    updateFinancing('paymentFrequency', value);
  }

  function resetDefaults() {
    setFormValues(baselineValues);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {!embedded ? (
        <PageHeader
          eyebrow="Sell & Buy Calculator"
          title="Plan the move before you list."
          description="Model your sale proceeds, decide how much equity to roll into the next property, and see the mortgage impact in one premium planning flow."
        />
      ) : null}

      <section className={cn(!embedded && 'mb-8')}>
        <div className="overflow-hidden rounded-[2rem] border border-accent-blue/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_45%),linear-gradient(180deg,rgba(19,25,32,0.98),rgba(11,15,20,0.98))] p-6 shadow-[0_30px_80px_rgba(2,12,27,0.45)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.22em] text-accent-cyan/90">Instructions</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-[2rem]">
                Start with the current home, then build the next move.
              </h2>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-muted-foreground">
                <p>1. Enter the sale details for the current property and confirm the net proceeds.</p>
                <p>2. Enter the next purchase details, including annual taxes and any condo fees if applicable.</p>
                <p>3. Choose how much equity to use, then adjust the mortgage setup to compare payments and cash left over.</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-full border-border/70 bg-background/20 px-5"
              onClick={resetDefaults}
            >
              Reset sample case
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SectionCard
            eyebrow="Step 1"
            title="Sell Your Current Home"
            description="Enter the basics first, then open advanced sale costs only if you need them."
            icon={<Home className="h-5 w-5 text-accent-cyan" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <CurrencyField
                label="Selling price"
                value={formValues.currentHome.expectedSalePrice}
                onChange={updateSalePrice}
              />
              <CurrencyField
                label="Mortgage balance"
                value={formValues.currentHome.currentMortgageBalance}
                onChange={(value) => updateCurrentHome('currentMortgageBalance', value)}
              />
              <PercentField
                label="Realtor commission"
                value={formValues.currentHome.realtorCommissionPercent}
                onChange={(value) => updateCurrentHome('realtorCommissionPercent', value)}
              />
              <CurrencyField
                label="Lawyer fees"
                value={formValues.currentHome.legalFeesOnSale}
                onChange={(value) => updateCurrentHome('legalFeesOnSale', value)}
              />
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-border bg-background/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowAdvancedSaleOptions((current) => !current)}
              >
                Advanced sale options
              </button>
            </div>

            {showAdvancedSaleOptions ? (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <PercentField
                    label="Current interest rate"
                    value={formValues.currentHome.currentInterestRate}
                    onChange={(value) => updateCurrentHome('currentInterestRate', value)}
                    helpText="Optional. Used only for current-home context."
                  />
                  <CurrencyField
                    label="Current monthly payment"
                    value={formValues.currentHome.currentMonthlyPayment}
                    onChange={(value) => updateCurrentHome('currentMonthlyPayment', value)}
                    helpText="Optional. Unlocks same-payment budget guidance."
                  />
                  <CurrencyField
                    label="Mortgage discharge / admin fee"
                    value={formValues.currentHome.mortgageDischargeFee}
                    onChange={(value) => updateCurrentHome('mortgageDischargeFee', value)}
                  />
                  <CurrencyField
                    label="Mortgage penalty"
                    value={formValues.currentHome.mortgagePenalty}
                    onChange={(value) => updateCurrentHome('mortgagePenalty', value)}
                  />
                  <CurrencyField
                    label="Bridge financing estimate"
                    value={formValues.currentHome.bridgeFinancingEstimate}
                    onChange={(value) => updateCurrentHome('bridgeFinancingEstimate', value)}
                    helpText="Optional carrying-cost placeholder if your sale closes after the purchase."
                  />
                </div>
              </>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricPill label="Selling price" value={formatCurrency(results.sale.grossSalePrice)} />
              <MetricPill label="Mortgage + fees" value={formatCurrency(totalSalePayout)} />
              <MetricPill
                label="Net equity"
                value={formatCurrency(results.sale.totalNetCashFromSale)}
                emphasis
              />
            </div>
        </SectionCard>

        <SectionCard
            eyebrow="Step 2"
            title="Buy Your Next Home"
            description="Enter the next property first. Open advanced purchase tools only when you want taxes, reserve settings, or quick scenarios."
            icon={<Building2 className="h-5 w-5 text-accent-cyan" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <CurrencyField
                label="Purchase price"
                value={formValues.purchase.purchasePrice}
                onChange={(value) => updatePurchase('purchasePrice', value)}
              />
              <OntarioCityAutocompleteField
                label="City"
                value={formValues.purchase.city}
                onChange={(value) => updatePurchase('city', value)}
              />
              <CurrencyField
                label="Property taxes yearly"
                value={formValues.purchase.propertyTaxesAnnual}
                onChange={(value) => updatePurchase('propertyTaxesAnnual', value)}
              />
              <CurrencyField
                label="Condo fees monthly"
                value={formValues.purchase.condoFeesMonthly}
                onChange={(value) => updatePurchase('condoFeesMonthly', value)}
              />
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-border bg-background/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowAdvancedPurchaseOptions((current) => !current)}
              >
                Advanced purchase tools
              </button>
            </div>

            {showAdvancedPurchaseOptions ? (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Province</Label>
                    <Select
                      value={formValues.purchase.province}
                      onValueChange={(value) => updatePurchase('province', value as PurchaseFormValues['province'])}
                    >
                      <SelectTrigger className="h-12 w-full rounded-2xl border-border/80 bg-background/60">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ON">Ontario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <CurrencyField
                    label="Title insurance / adjustments"
                    value={formValues.purchase.titleInsuranceAndAdjustments}
                    onChange={(value) => updatePurchase('titleInsuranceAndAdjustments', value)}
                  />
                  <CurrencyField
                    label="Additional cash added"
                    value={formValues.purchase.additionalCashAdded}
                    onChange={(value) => updatePurchase('additionalCashAdded', value)}
                    helpText="Use this to reflect extra savings outside the sale proceeds."
                  />
                </div>

                <div className="mt-4">
                  <div className="rounded-[1.5rem] border border-border/70 bg-background/45 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Equity strategy</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {[
                        { label: 'Use all proceeds', value: 'all' },
                        { label: 'Custom equity', value: 'custom' },
                        { label: 'Keep reserve', value: 'reserve' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            'rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                            formValues.purchase.equityStrategy === option.value
                              ? 'border-accent-blue/60 bg-accent-blue/15 text-foreground'
                              : 'border-border bg-background/55 text-muted-foreground hover:text-foreground'
                          )}
                          onClick={() =>
                            updatePurchase('equityStrategy', option.value as PurchaseFormValues['equityStrategy'])
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {formValues.purchase.equityStrategy === 'custom' ? (
                        <div className="mt-3">
                        <CurrencyField
                          label="Custom equity amount"
                          value={formValues.purchase.customEquityAmount}
                          onChange={(value) => updatePurchase('customEquityAmount', value)}
                          helpText={`Available max: ${formatCurrency(results.purchase.availableSaleProceeds)}`}
                        />
                      </div>
                    ) : null}

                    {formValues.purchase.equityStrategy === 'reserve' ? (
                      <div className="mt-3 space-y-3">
                        <CurrencyField
                          label="Reserve to keep aside"
                          value={formValues.purchase.reserveAmount}
                          onChange={(value) => updatePurchase('reserveAmount', value)}
                        />
                        <div className="flex flex-wrap gap-2">
                          {RESERVE_PRESETS.map((reserve) => (
                            <Button
                              key={reserve}
                              type="button"
                              variant={formValues.purchase.reserveAmount === reserve ? 'default' : 'outline'}
                              className="rounded-full"
                              onClick={() => updatePurchase('reserveAmount', reserve)}
                            >
                              Keep {formatCurrency(reserve)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-background/45 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Quick price checks</p>
                      <p className="text-xs text-muted-foreground">
                        Test a few purchase prices without leaving the section.
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(formValues.purchase.purchasePrice)}</p>
                  </div>

                  <Slider
                    className="mt-3"
                    min={500000}
                    max={1500000}
                    step={5000}
                    value={[formValues.purchase.purchasePrice]}
                    onValueChange={([value]) => updatePurchase('purchasePrice', value)}
                  />
                </div>
              </>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricPill label="Land transfer tax" value={formatCurrency(results.purchase.landTransferTax.totalTax)} />
              <MetricPill label="Cash needed to close" value={formatCurrency(results.purchase.totalCashContribution)} />
              <MetricPill label="Mortgage needed" value={formatCurrency(results.purchase.totalMortgageNeeded)} emphasis />
            </div>
        </SectionCard>

        <SectionCard
            eyebrow="Step 3"
            title="Your New Mortgage"
            description="Choose how your mortgage will work when you move."
            icon={<Landmark className="h-5 w-5 text-accent-cyan" />}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  label: 'New Mortgage',
                  value: 'simple',
                  description: 'Start a brand new mortgage for the full amount.',
                },
                {
                  label: 'Keep Your Current Rate',
                  value: 'port',
                  description: "Move your existing mortgage to the new home and borrow the rest at today's rate.",
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'rounded-[1.35rem] border p-4 text-left transition-colors',
                    formValues.financing.mode === option.value
                      ? 'border-accent-blue/60 bg-accent-blue/15'
                      : 'border-border bg-background/55'
                  )}
                  onClick={() => setMortgageMode(option.value as MortgageMode)}
                >
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {formValues.financing.mode === 'simple' ? (
                <PercentField
                  label="New mortgage rate"
                  value={formValues.financing.simpleInterestRate}
                  onChange={(value) => updateFinancing('simpleInterestRate', value)}
                />
              ) : (
                <>
                  <CurrencyField
                    label="Remaining balance on your current mortgage"
                    value={formValues.financing.portedMortgageBalance}
                    onChange={(value) => updateFinancing('portedMortgageBalance', value)}
                    helpText="This amount stays with you and is applied first on the new home."
                  />
                  <PercentField
                    label="Your current mortgage rate"
                    value={formValues.financing.portedInterestRate}
                    onChange={(value) => updateFinancing('portedInterestRate', value)}
                  />
                  <PercentField
                    label="Rate for the additional amount you borrow"
                    value={formValues.financing.topUpInterestRate}
                    onChange={(value) => updateFinancing('topUpInterestRate', value)}
                  />
                </>
              )}

              <div className="space-y-2">
                <Label>Years left on mortgage</Label>
                <Select
                  value={String(formValues.financing.amortizationYears)}
                  onValueChange={(value) => updateFinancing('amortizationYears', Number(value))}
                >
                  <SelectTrigger className="h-12 w-full rounded-2xl border-border/80 bg-background/60">
                    <SelectValue placeholder="Amortization" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, index) => index + 1).map((years) => (
                      <SelectItem key={years} value={String(years)}>
                        {years} years
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-border bg-background/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowAdvancedMortgageOptions((current) => !current)}
              >
                Advanced mortgage options
              </button>
            </div>

            {showAdvancedMortgageOptions ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {formValues.financing.mode === 'port' ? (
                  <PercentField
                    label="Override blended rate (optional)"
                    value={formValues.financing.manualBlendedRate}
                    onChange={(value) => updateFinancing('manualBlendedRate', value)}
                    helpText="Leave blank or 0 to let the calculator estimate the blended rate for you."
                  />
                ) : (
                  <div className="hidden md:block" />
                )}

                <div className="space-y-2">
                  <Label>Payment schedule</Label>
                  <Select
                    value={formValues.financing.paymentFrequency}
                    onValueChange={(value) => setPaymentFrequency(value as PaymentFrequency)}
                  >
                    <SelectTrigger className="h-12 w-full rounded-2xl border-border/80 bg-background/60">
                      <SelectValue placeholder="Payment schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {formValues.financing.mode === 'port' ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetricPill
                  label="Amount kept from current mortgage"
                  value={formatCurrency(results.financing.mortgagePayment.portedBalanceUsed)}
                />
                <MetricPill
                  label="New amount borrowed"
                  value={formatCurrency(results.financing.mortgagePayment.topUpAmount)}
                />
                <MetricPill
                  label="Blended interest rate"
                  value={formatPercent(results.financing.mortgagePayment.effectiveRate, 2)}
                />
              </div>
            ) : null}
        </SectionCard>

        <ResultsRail
          formValues={formValues}
          results={results}
          currentMonthlyPayment={formValues.currentHome.currentMonthlyPayment}
          purchasePrice={formValues.purchase.purchasePrice}
          equityStrategyLabel={equityStrategyLabel}
        />
      </section>

    </motion.div>
  );
}

function ResultsRail({
  formValues,
  results,
  currentMonthlyPayment,
  purchasePrice,
  equityStrategyLabel,
}: {
  formValues: SellBuyCalculatorFormValues;
  results: SellBuyCalculatorResults;
  currentMonthlyPayment: number;
  purchasePrice: number;
  equityStrategyLabel: string;
}) {
  const paymentDeltaPositive = results.financing.monthlyPaymentDifference >= 0;

  function handlePrintResults() {
    const generatedAt = new Intl.DateTimeFormat('en-CA', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date());
    const html = buildSellBuyPrintableReportHtml({
      formValues,
      results,
      generatedAt,
    });
    const existingFrame = document.getElementById('sell-buy-print-frame');
    existingFrame?.remove();

    const printFrame = document.createElement('iframe');
    printFrame.id = 'sell-buy-print-frame';
    printFrame.title = 'Sell and Buy printable report';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';

    const cleanup = () => {
      window.setTimeout(() => {
        printFrame.remove();
      }, 300);
    };

    printFrame.onload = () => {
      const frameWindow = printFrame.contentWindow;

      if (!frameWindow) {
        cleanup();
        window.alert('Print preview could not be opened. Please try again.');
        return;
      }

      frameWindow.onafterprint = cleanup;

      window.setTimeout(() => {
        frameWindow.focus();
        frameWindow.print();
      }, 150);
    };

    document.body.appendChild(printFrame);

    const frameDocument = printFrame.contentWindow?.document;

    if (!frameDocument) {
      cleanup();
      window.alert('Print preview could not be opened. Please try again.');
      return;
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
  }

  return (
    <div className="rounded-[2rem] border border-border bg-surface/85 p-6 shadow-[0_22px_60px_rgba(3,10,24,0.22)]">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-accent-cyan/10">
          <Calculator className="h-5 w-5 text-accent-cyan" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Results</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">Your move summary</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                Purchase target {formatCurrency(purchasePrice)} using {equityStrategyLabel.toLowerCase()}.
              </p>
            </div>
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm',
                paymentDeltaPositive
                  ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                  : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
              )}
            >
              {paymentDeltaPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {paymentDeltaPositive ? 'Payment increase' : 'Payment decrease'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ResultStat label="New Mortgage Amount" value={formatCurrency(results.purchase.totalMortgageNeeded)} />
        <ResultStat
          label="Estimated Monthly Mortgage Payment"
          value={formatCurrency(results.financing.monthlyMortgagePayment)}
        />
        <ResultStat
          label="Total Monthly Housing Cost"
          value={formatCurrency(results.financing.totalMonthlyHousingCost)}
        />
        <ResultStat label="Cash Left Over After Closing" value={formatCurrency(results.purchase.cashRemainingAfterClose)} />
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-accent-cyan/15 bg-accent-cyan/8 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-accent-cyan/90">Estimated monthly payment</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <p className="text-3xl font-semibold text-foreground">
            {formatCurrency(results.financing.monthlyMortgagePayment)} <span className="text-lg text-muted-foreground">/ month</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {currentMonthlyPayment > 0
              ? `Compared to your current payment: ${results.financing.monthlyPaymentDifference >= 0 ? '+' : '-'}${formatCurrency(
                  Math.abs(results.financing.monthlyPaymentDifference)
                )}`
              : 'Add your current monthly payment in Section 1 to compare the difference.'}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-border bg-background/45 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Save this breakdown</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Open a print-friendly version of these results, then choose Save as PDF in the print dialog.
            </p>
          </div>
          <Button type="button" className="rounded-full px-5" onClick={handlePrintResults}>
            <Printer className="mr-2 h-4 w-4" />
            Print results
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-border bg-surface/85 p-5 shadow-[0_22px_60px_rgba(3,10,24,0.22)] lg:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-accent-cyan/10">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-1.5 text-2xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  helpText,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helpText?: string;
}) {
  return (
    <FormattedNumberField
      label={label}
      prefix="$"
      value={value}
      onChange={onChange}
      helpText={helpText}
    />
  );
}

function PercentField({
  label,
  value,
  onChange,
  helpText,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helpText?: string;
}) {
  return (
    <FormattedNumberField
      label={label}
      suffix="%"
      value={value}
      onChange={onChange}
      helpText={helpText}
    />
  );
}

function OntarioCityAutocompleteField({
  label,
  value,
  onChange,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = value.trim().toLowerCase();
  const suggestions = normalizedValue.length === 0
    ? ONTARIO_CITIES.slice(0, 8)
    : ONTARIO_CITIES.filter((city) => city.toLowerCase().includes(normalizedValue)).slice(0, 8);

  return (
    <div className="relative space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        className="h-12 rounded-2xl border-border/80 bg-background/60"
      />
      {isOpen && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-[1.25rem] border border-border bg-popover/95 p-2 shadow-[0_18px_40px_rgba(2,12,27,0.35)] backdrop-blur">
          {suggestions.map((city) => (
            <button
              key={city}
              type="button"
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent-blue/10"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(city);
                setIsOpen(false);
              }}
            >
              {city}
            </button>
          ))}
        </div>
      ) : null}
      {helpText ? <p className="text-xs leading-5 text-muted-foreground">{helpText}</p> : null}
    </div>
  );
}

function FormattedNumberField({
  label,
  value,
  onChange,
  helpText,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helpText?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(parseNumericInput(event.target.value))}
          className={cn(
            'h-12 rounded-2xl border-border/80 bg-background/60',
            prefix && 'pl-8',
            suffix && 'pr-10'
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {helpText ? <p className="text-xs leading-5 text-muted-foreground">{helpText}</p> : null}
    </div>
  );
}

function MetricPill({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[1.35rem] border px-4 py-3.5',
        emphasis
          ? 'border-accent-cyan/25 bg-accent-cyan/10'
          : 'border-border bg-background/55'
      )}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-background/40 px-4 py-3.5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function getEquityStrategyLabel(strategy: PurchaseFormValues['equityStrategy']) {
  if (strategy === 'custom') {
    return 'custom equity';
  }

  if (strategy === 'reserve') {
    return 'reserve mode';
  }

  return 'all net sale proceeds';
}

function parseNumericInput(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');

  if (!cleaned) {
    return 0;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
