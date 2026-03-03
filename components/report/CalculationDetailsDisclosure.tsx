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
}

interface CalculationDetailsDisclosureProps {
  purchasePrice: number;
  monthsElapsed: number | null;
  values: EditableMortgageValues;
  originalValues: EditableMortgageValues;
  summary: {
    originalMortgage: number | null;
    primaryRemainingBalance: number | null;
    totalOutstandingDebt: number | null;
    principalPaid: number | null;
    interestPaid: number | null;
    monthlyPayment: number | null;
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

export function CalculationDetailsDisclosure({
  purchasePrice,
  monthsElapsed,
  values,
  originalValues,
  summary,
  onChange,
  onReset,
}: CalculationDetailsDisclosureProps) {
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
        <p className="text-sm leading-6 text-muted-foreground">
          Edit the mortgage assumptions below to reflect your actual financing. Secondary mortgage and
          HELOC balances are included in total debt immediately.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-accent-blue/40 hover:text-foreground"
        >
          Reset to original
        </button>
      </div>

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
    </details>
  );
}
