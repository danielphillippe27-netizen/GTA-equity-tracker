'use client';

import { formatCurrency } from '@/lib/constants';

interface EquitySnapshotProps {
  estimatedValue: number | null;
  mortgageBalance: number | null;
  netEquity: number | null;
  currentEstimatedPayment: number | null;
  refinanceRate: number;
  refinancePayment: number | null;
  refinanceDelta: number | null;
}

export function EquitySnapshot({
  estimatedValue,
  mortgageBalance,
  netEquity,
  currentEstimatedPayment,
  refinanceRate,
  refinancePayment,
  refinanceDelta,
}: EquitySnapshotProps) {
  const hasCoreValues =
    estimatedValue !== null &&
    mortgageBalance !== null &&
    netEquity !== null &&
    estimatedValue > 0;

  const mortgageShare = hasCoreValues
    ? Math.max(0, Math.min(100, (mortgageBalance / estimatedValue) * 100))
    : 0;
  const equityShare = hasCoreValues ? Math.max(0, 100 - mortgageShare) : 0;
  const ltv = hasCoreValues ? mortgageShare : null;
  const leverageBand =
    ltv === null
      ? null
      : ltv < 65
        ? { label: 'Low leverage', className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' }
        : ltv <= 80
          ? { label: 'Moderate leverage', className: 'border-amber-400/30 bg-amber-400/10 text-amber-300' }
          : { label: 'High leverage', className: 'border-red-400/30 bg-red-400/10 text-red-300' };
  const helocCapacity = hasCoreValues ? Math.max(0, estimatedValue * 0.8 - mortgageBalance) : null;

  return (
    <section className="rounded-[28px] border border-border bg-surface/85 p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h2 className="mt-1 text-2xl font-semibold text-foreground">Loan-to-Value (LTV)</h2>
        <p className="mt-2 text-sm text-muted-foreground">How much of your home you own vs owe</p>
      </div>

      {hasCoreValues ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-3xl font-semibold text-foreground">
              LTV: {ltv?.toFixed(1)}%
            </p>
            {leverageBand ? (
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${leverageBand.className}`}>
                {leverageBand.label}
              </span>
            ) : null}
          </div>
          {ltv !== null ? (
            <p className="mt-2 text-sm text-muted-foreground">
              At this level, most lenders allow refinancing and HELOC access.
            </p>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-full border border-border bg-background/40">
            <div className="flex h-5">
              <div
                className="bg-slate-600/80"
                style={{ width: `${mortgageShare}%` }}
                aria-label="Mortgage share"
              />
              <div
                className="bg-gradient-to-r from-accent-blue to-accent-cyan"
                style={{ width: `${equityShare}%` }}
                aria-label="Equity share"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span>Debt (Mortgage)</span>
            <span>Equity (Ownership)</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/30 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Debt</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(mortgageBalance)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/30 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Equity</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(netEquity)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm text-muted-foreground">
          Mortgage-based breakdown is unavailable until mortgage assumptions are loaded for this estimate.
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-background/20 p-5">
        <h3 className="text-sm font-semibold text-foreground">Smart position insights</h3>
        <div className="mt-4 space-y-4 text-sm text-muted-foreground">
          <div className="flex flex-col gap-1 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-foreground">Refinance snapshot</span>
            {refinancePayment !== null ? (
              <span className="text-right">
                <span className="block text-foreground">
                  Refinance at {refinanceRate.toFixed(2)}% -&gt; {formatCurrency(refinancePayment)}/mo
                </span>
                {refinanceDelta !== null ? (
                  <span className={refinanceDelta <= 0 ? 'text-emerald-300' : 'text-red-400'}>
                    {refinanceDelta >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(refinanceDelta))} vs current
                  </span>
                ) : null}
              </span>
            ) : (
              <span>Not available.</span>
            )}
          </div>
          <div className="flex flex-col gap-1 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-foreground">Available borrowing power</span>
            <span>
              {helocCapacity !== null
                ? `${formatCurrency(helocCapacity)}`
                : 'Not available.'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">(Subject to lender approval)</p>
        </div>
      </div>
    </section>
  );
}
