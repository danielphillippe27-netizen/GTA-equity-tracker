'use client';

import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditableMortgageValues {
  downPayment: number;
  interestRate: number;
  amortization: number;
  secondaryMortgageBalance: number;
  helocBalance: number;
  renovationValueAdd: number;
  hasRefinanced: boolean;
  currentMortgageBalance: number;
  currentInterestRate: number;
  currentAmortization: number;
  refinanceYear: number;
}

interface CalculationDetailsDisclosureProps {
  purchasePrice: number;
  monthsElapsed: number | null;
  values: EditableMortgageValues;
  originalValues: EditableMortgageValues;
  summary: {
    mode: 'original' | 'refinance';
    originalMortgage: number | null;
    primaryRemainingBalance: number | null;
    totalOutstandingDebt: number | null;
    principalPaid: number | null;
    interestPaid: number | null;
    monthlyPayment: number | null;
    accessedEquitySincePurchase: number | null;
    refinanceYear: number | null;
    currentEquity: number | null;
  };
  onChange: (values: EditableMortgageValues) => void;
  onReset: () => void;
}

function DetailItem({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function sanitizeCurrencyInput(value: string) {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function sanitizeNumberInput(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-accent-cyan/40 bg-accent-cyan/15 text-foreground'
          : 'border-border bg-background/20 text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

export function CalculationDetailsDisclosure({
  purchasePrice,
  monthsElapsed,
  values,
  originalValues,
  summary,
  onChange,
  onReset,
}: CalculationDetailsDisclosureProps) {
  const isRefinanceMode = values.hasRefinanced;

  return (
    <details className="group rounded-[28px] border border-border bg-surface/85 p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Details</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">See financial details</h2>
        </div>
        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Switch between the original purchase mortgage path and your current mortgage structure.
          Secondary mortgage and HELOC balances are added to total debt immediately.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-accent-blue/40 hover:text-foreground"
        >
          Reset to original
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="mr-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Have you refinanced since purchase?
        </p>
        <ToggleButton
          active={!isRefinanceMode}
          label="No"
          onClick={() => onChange({ ...values, hasRefinanced: false })}
        />
        <ToggleButton
          active={isRefinanceMode}
          label="Yes"
          onClick={() => onChange({ ...values, hasRefinanced: true })}
        />
        {isRefinanceMode ? (
          <span className="rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1.5 text-xs font-medium text-accent-cyan">
            Refinance Mode Active
          </span>
        ) : null}
      </div>

      {!isRefinanceMode ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label htmlFor="down-payment" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Down Payment
            </Label>
            <Input
              id="down-payment"
              type="number"
              min="0"
              value={values.downPayment}
              onChange={(event) =>
                onChange({
                  ...values,
                  downPayment: sanitizeCurrencyInput(event.target.value),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="interest-rate" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Interest Rate
            </Label>
            <Input
              id="interest-rate"
              type="number"
              min="0"
              step="0.01"
              value={values.interestRate}
              onChange={(event) =>
                onChange({
                  ...values,
                  interestRate: Math.max(0, sanitizeNumberInput(event.target.value, values.interestRate)),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Amortization
            </Label>
            <Select
              value={String(values.amortization)}
              onValueChange={(value) =>
                onChange({
                  ...values,
                  amortization: Number(value),
                })
              }
            >
              <SelectTrigger className="mt-2 h-11 w-full border-border bg-background/20 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 years</SelectItem>
                <SelectItem value="20">20 years</SelectItem>
                <SelectItem value="25">25 years</SelectItem>
                <SelectItem value="30">30 years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="secondary-mortgage" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Secondary Mortgage
            </Label>
            <Input
              id="secondary-mortgage"
              type="number"
              min="0"
              value={values.secondaryMortgageBalance}
              onChange={(event) =>
                onChange({
                  ...values,
                  secondaryMortgageBalance: sanitizeCurrencyInput(event.target.value),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="heloc-balance" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              HELOC Balance
            </Label>
            <Input
              id="heloc-balance"
              type="number"
              min="0"
              value={values.helocBalance}
              onChange={(event) =>
                onChange({
                  ...values,
                  helocBalance: sanitizeCurrencyInput(event.target.value),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label htmlFor="current-balance" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Current Mortgage Balance
            </Label>
            <Input
              id="current-balance"
              type="number"
              min="0"
              value={values.currentMortgageBalance}
              onChange={(event) =>
                onChange({
                  ...values,
                  currentMortgageBalance: sanitizeCurrencyInput(event.target.value),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="current-interest-rate" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Current Interest Rate
            </Label>
            <Input
              id="current-interest-rate"
              type="number"
              min="0"
              step="0.01"
              value={values.currentInterestRate}
              onChange={(event) =>
                onChange({
                  ...values,
                  currentInterestRate: Math.max(
                    0,
                    sanitizeNumberInput(event.target.value, values.currentInterestRate)
                  ),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="current-amortization" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Remaining Amortization
            </Label>
            <Input
              id="current-amortization"
              type="number"
              min="1"
              step="1"
              value={values.currentAmortization}
              onChange={(event) =>
                onChange({
                  ...values,
                  currentAmortization: Math.max(
                    1,
                    sanitizeNumberInput(event.target.value, values.currentAmortization)
                  ),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="refinance-year" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Approximate Refinance Year
            </Label>
            <Input
              id="refinance-year"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              step="1"
              value={values.refinanceYear}
              onChange={(event) =>
                onChange({
                  ...values,
                  refinanceYear: Math.max(
                    1900,
                    Math.min(
                      new Date().getFullYear(),
                      Math.round(sanitizeNumberInput(event.target.value, values.refinanceYear))
                    )
                  ),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="secondary-mortgage-refi" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Secondary Mortgage
            </Label>
            <Input
              id="secondary-mortgage-refi"
              type="number"
              min="0"
              value={values.secondaryMortgageBalance}
              onChange={(event) =>
                onChange({
                  ...values,
                  secondaryMortgageBalance: sanitizeCurrencyInput(event.target.value),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="heloc-balance-refi" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              HELOC Balance
            </Label>
            <Input
              id="heloc-balance-refi"
              type="number"
              min="0"
              value={values.helocBalance}
              onChange={(event) =>
                onChange({
                  ...values,
                  helocBalance: sanitizeCurrencyInput(event.target.value),
                })
              }
              className="mt-2 h-11 border-border bg-background/20 text-foreground"
            />
          </div>
        </div>
      )}

      {!isRefinanceMode ? (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailItem label="Purchase Price" value={formatCurrency(purchasePrice)} />
            <DetailItem
              label="Original Mortgage"
              value={summary.originalMortgage !== null ? formatCurrency(summary.originalMortgage) : 'Unavailable'}
              helper="Primary mortgage at purchase."
            />
            <DetailItem
              label="Primary Remaining Balance"
              value={
                summary.primaryRemainingBalance !== null
                  ? formatCurrency(summary.primaryRemainingBalance)
                  : 'Unavailable'
              }
              helper="Estimated primary mortgage balance today."
            />
            <DetailItem
              label="Total Outstanding Debt"
              value={
                summary.totalOutstandingDebt !== null
                  ? formatCurrency(summary.totalOutstandingDebt)
                  : 'Unavailable'
              }
              helper="Primary mortgage plus secondary mortgage and HELOC."
            />
            <DetailItem
              label="Primary Principal Paid"
              value={summary.principalPaid !== null ? formatCurrency(summary.principalPaid) : 'Unavailable'}
            />
            <DetailItem
              label="Primary Interest Paid"
              value={summary.interestPaid !== null ? formatCurrency(summary.interestPaid) : 'Unavailable'}
            />
            <DetailItem
              label="Estimated Monthly Payment"
              value={summary.monthlyPayment !== null ? formatCurrency(summary.monthlyPayment) : 'Unavailable'}
              helper="Primary mortgage only."
            />
            <DetailItem
              label="Original Assumptions"
              value={`${originalValues.interestRate.toFixed(2)}% • ${originalValues.amortization} yrs`}
              helper={`Down payment ${formatCurrency(originalValues.downPayment)}.`}
            />
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Months elapsed: {monthsElapsed !== null ? monthsElapsed.toString() : 'Unavailable'}
          </p>
        </>
      ) : (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailItem label="Purchase Price" value={formatCurrency(purchasePrice)} />
            <DetailItem
              label="Current Mortgage Structure"
              value={`${values.currentInterestRate.toFixed(2)}% • ${values.currentAmortization} yrs`}
              helper={`Approx. refinanced in ${summary.refinanceYear ?? values.refinanceYear}.`}
            />
            <DetailItem
              label="Current Mortgage Balance"
              value={
                summary.primaryRemainingBalance !== null
                  ? formatCurrency(summary.primaryRemainingBalance)
                  : 'Unavailable'
              }
              helper="Used as the starting point for refinance calculations."
            />
            <DetailItem
              label="Total Outstanding Debt"
              value={
                summary.totalOutstandingDebt !== null
                  ? formatCurrency(summary.totalOutstandingDebt)
                  : 'Unavailable'
              }
              helper="Primary mortgage plus secondary mortgage and HELOC."
            />
            <DetailItem
              label="Equity Accessed"
              value={
                summary.accessedEquitySincePurchase !== null
                  ? formatCurrency(summary.accessedEquitySincePurchase)
                  : 'Unavailable'
              }
              helper={
                summary.accessedEquitySincePurchase !== null
                  ? `Pulled through refinancing compared to the original mortgage path.${summary.currentEquity !== null && summary.currentEquity > 0 ? ` ${Math.round((summary.accessedEquitySincePurchase / summary.currentEquity) * 100)}% of your current equity has been accessed through refinancing.` : ''}`
                  : 'Pulled through refinancing compared to the original mortgage path.'
              }
            />
            <DetailItem
              label="Estimated Monthly Payment"
              value={summary.monthlyPayment !== null ? formatCurrency(summary.monthlyPayment) : 'Unavailable'}
              helper="Primary mortgage only."
            />
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Refinance mode calculates from your current mortgage balance rather than the original
            purchase mortgage path. Principal paid and interest paid are hidden because those totals
            need full lender history to calculate accurately.
          </p>
        </>
      )}
    </details>
  );
}
