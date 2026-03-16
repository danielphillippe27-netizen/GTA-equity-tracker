'use client';

import { Activity, Clock3, Home } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';

interface MarketPulseProps {
  averageSoldPrice: number | null;
  averageDaysOnMarket: number | null;
  monthsOfInventory: number | null;
  reportMonth: string | null;
  scopeAreaName: string | null;
  isFallback: boolean;
}

function formatMonth(period: string | null) {
  if (!period) {
    return null;
  }

  const [year, month] = period.split('-');
  if (!year || !month) {
    return period;
  }

  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function MetricTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-accent-cyan/10 p-2">
          <Icon className="h-4 w-4 text-accent-cyan" />
        </div>
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function MarketPulse({
  averageSoldPrice,
  averageDaysOnMarket,
  monthsOfInventory,
  reportMonth,
  scopeAreaName,
  isFallback,
}: MarketPulseProps) {
  const reportLabel = formatMonth(reportMonth);
  const unavailable = 'Not available for this area';

  return (
    <section className="rounded-[28px] border border-border bg-surface/85 p-6">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Market pulse</p>
        <h2 className="mt-1 text-2xl font-semibold text-foreground">What the market looks like now</h2>
      </div>

      <div className="grid gap-3">
        <MetricTile
          icon={Home}
          label="Average Sold Price"
          value={averageSoldPrice !== null ? formatCurrency(averageSoldPrice) : unavailable}
        />
        <MetricTile
          icon={Clock3}
          label="Average Days on Market"
          value={
            averageDaysOnMarket !== null
              ? `${averageDaysOnMarket.toFixed(0)} days`
              : unavailable
          }
        />
        <MetricTile
          icon={Activity}
          label="Months of Inventory"
          value={monthsOfInventory !== null ? `${monthsOfInventory.toFixed(1)} months` : unavailable}
        />
      </div>

      {(reportLabel || scopeAreaName || isFallback) && (
        <div className="mt-4 text-center text-sm leading-6 text-foreground">
          {scopeAreaName && reportLabel ? `${scopeAreaName}, ${reportLabel}. ` : null}
          {!scopeAreaName && reportLabel ? `${reportLabel}. ` : null}
          {scopeAreaName && !reportLabel ? `${scopeAreaName}. ` : null}
          {isFallback
            ? 'Municipality-level data was not available, so this uses the next broader regional area.'
            : null}
        </div>
      )}
    </section>
  );
}
