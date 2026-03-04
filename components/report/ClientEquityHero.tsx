'use client';

import { GradientText } from '@/components/shared';
import { formatCurrency } from '@/lib/constants';

interface ClientEquityHeroProps {
  area: string;
  propertyType: string;
  purchaseLabel: string;
  neighborhood?: string | null;
  estimatedValue: number | null;
  mortgageBalance: number | null;
  netEquity: number | null;
  monthOverMonthValuePercent: number | null;
  monthlyMortgagePaydown: number | null;
  monthlyEquityChange: number | null;
  interpretation: string;
}

function formatPrimaryValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return 'Unavailable';
  }

  return formatCurrency(value);
}

function TrendLine({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300'
      : tone === 'negative'
        ? 'text-red-400'
        : 'text-muted-foreground';

  return <p className={`mt-3 text-sm ${toneClass}`}>{children}</p>;
}

export function ClientEquityHero({
  estimatedValue,
  mortgageBalance,
  netEquity,
  monthOverMonthValuePercent,
  monthlyMortgagePaydown,
  monthlyEquityChange,
  interpretation,
}: ClientEquityHeroProps) {
  return (
    <section className="rounded-[28px] border border-accent-blue/20 bg-gradient-to-br from-slate-900/95 via-slate-900/92 to-cyan-950/35 p-6 shadow-[0_0_80px_rgba(34,211,238,0.08)] sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <div className="flex h-full flex-col">
          <h1 className="mb-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Your Equity Report
          </h1>
          <p className="mb-8 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Based on your purchase details and market movement.
          </p>

          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base lg:mt-auto">
            {interpretation}
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Estimated Home Value
            </p>
            <p className="text-3xl font-semibold text-foreground">
              {formatPrimaryValue(estimatedValue)}
            </p>
            {monthOverMonthValuePercent !== null ? (
              <TrendLine tone={monthOverMonthValuePercent >= 0 ? 'positive' : 'negative'}>
                {monthOverMonthValuePercent >= 0 ? '+' : ''}
                {monthOverMonthValuePercent.toFixed(1)}% vs last month
              </TrendLine>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Estimated Mortgage Balance
            </p>
            <p className="text-3xl font-semibold text-foreground">
              {formatPrimaryValue(mortgageBalance)}
            </p>
            {monthlyMortgagePaydown !== null ? (
              <TrendLine tone={monthlyMortgagePaydown >= 0 ? 'positive' : 'negative'}>
                {monthlyMortgagePaydown >= 0 ? '-' : '+'}
                {formatCurrency(Math.abs(monthlyMortgagePaydown))} vs last month
              </TrendLine>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Estimated Net Equity
            </p>
            <p className="text-3xl font-bold">
              <GradientText>{formatPrimaryValue(netEquity)}</GradientText>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
