'use client';

import { motion } from 'framer-motion';
import { GradientText } from '@/components/shared';
import { formatCurrency } from '@/lib/constants';

interface EquitySnapshotProps {
  equity: {
    low: number;
    mid: number;
    high: number;
  };
  homeValue: number;
  remainingMortgage: number;
  originalLoan: number;
}

export function EquitySnapshot({
  equity,
  homeValue,
  remainingMortgage,
  originalLoan,
}: EquitySnapshotProps) {
  const equityPercent = (equity.mid / homeValue) * 100;
  const mortgagePercent = 100 - equityPercent;
  const principalPaid = originalLoan - remainingMortgage;
  const principalPaidPercent = (principalPaid / originalLoan) * 100;

  return (
    <section className="py-10 sm:py-12">
      <motion.div
        className="p-6 sm:p-8 rounded-2xl bg-surface border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-6">
          Equity Snapshot
        </h3>

        {/* Main equity display */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {/* Equity value */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Estimated Equity
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold">
                <GradientText>{formatCurrency(equity.mid)}</GradientText>
              </span>
              <span className="text-sm text-muted-foreground">
                ({equityPercent.toFixed(0)}%)
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Range: {formatCurrency(equity.low)} – {formatCurrency(equity.high)}
            </p>
          </div>

          {/* Remaining mortgage */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Est. Mortgage Balance
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-foreground">
                {formatCurrency(remainingMortgage)}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {principalPaidPercent.toFixed(0)}% of original loan paid down
            </p>
          </div>
        </div>

        {/* Visual equity bar */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Value Breakdown</p>
          
          {/* Stacked bar */}
          <div className="relative h-8 w-full rounded-lg overflow-hidden bg-muted">
            {/* Mortgage portion */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-muted-foreground/30"
              initial={{ width: 0 }}
              animate={{ width: `${mortgagePercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* Equity portion */}
            <motion.div
              className="absolute inset-y-0 right-0 bg-gradient-to-r from-accent-blue to-accent-cyan"
              initial={{ width: 0 }}
              animate={{ width: `${equityPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>

          {/* Legend */}
          <div className="flex justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-muted-foreground/30" />
              <span className="text-muted-foreground">
                Mortgage: {formatCurrency(remainingMortgage)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-gradient-to-r from-accent-blue to-accent-cyan" />
              <span className="text-muted-foreground">
                Equity: {formatCurrency(equity.mid)}
              </span>
            </div>
          </div>
        </div>

        {/* Positive equity note */}
        {equity.mid > 0 && (
          <motion.div
            className="mt-6 p-4 rounded-xl bg-accent-blue/10 border border-accent-blue/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-accent-cyan flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-foreground">
                You have built substantial equity in your home. This equity
                represents your ownership stake after accounting for any
                remaining mortgage balance.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
