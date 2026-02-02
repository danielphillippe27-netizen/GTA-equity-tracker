'use client';

import { motion } from 'framer-motion';
import { GradientText } from '@/components/shared';
import { MARKET_PHASES, MarketPhaseName } from '@/lib/constants';

interface MarketContextProps {
  marketPhase: MarketPhaseName;
}

export function MarketContext({ marketPhase }: MarketContextProps) {
  const phase = MARKET_PHASES[marketPhase] || MARKET_PHASES.balanced;

  const phaseColors = {
    hot: 'from-orange-500 to-red-500',
    balanced: 'from-accent-blue to-accent-cyan',
    soft: 'from-teal-500 to-emerald-500',
  };

  const indicators = [
    {
      label: 'Market Temperature',
      value: phase.label,
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      label: 'Price Variability',
      value: `±${(phase.volatilityBand * 100).toFixed(0)}%`,
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
    },
    {
      label: 'Buyer Activity',
      value:
        marketPhase === 'hot'
          ? 'High'
          : marketPhase === 'soft'
          ? 'Moderate'
          : 'Steady',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Inventory Level',
      value:
        marketPhase === 'hot'
          ? 'Low'
          : marketPhase === 'soft'
          ? 'High'
          : 'Normal',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-10 sm:py-12">
      <motion.div
        className="p-6 sm:p-8 rounded-2xl bg-surface border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Current Market Context
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Understanding today&apos;s market conditions helps set realistic expectations.
        </p>

        {/* Market phase indicator */}
        <motion.div
          className="mb-6 p-4 rounded-xl bg-gradient-to-br from-surface-elevated to-surface"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-4 w-4 rounded-full bg-gradient-to-r ${phaseColors[marketPhase]}`}
            />
            <div>
              <p className="font-semibold text-foreground">
                <GradientText>{phase.label}</GradientText>
              </p>
              <p className="text-sm text-muted-foreground">
                {phase.description}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Market indicators grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {indicators.map((indicator, index) => (
            <motion.div
              key={indicator.label}
              className="text-center p-3 rounded-lg bg-surface-elevated"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 text-accent-cyan mb-2">
                {indicator.icon}
              </div>
              <p className="font-semibold text-foreground">{indicator.value}</p>
              <p className="text-xs text-muted-foreground">{indicator.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Market insight */}
        <motion.div
          className="mt-6 p-4 rounded-xl bg-muted/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Market insight: </span>
            {marketPhase === 'hot' &&
              'In a hot market, properties often sell above asking price. Your estimate may be conservative.'}
            {marketPhase === 'balanced' &&
              'In a balanced market, your estimate likely reflects realistic selling conditions with room for negotiation.'}
            {marketPhase === 'soft' &&
              'In a soft market, there may be more negotiation room. Consider the lower range when planning.'}
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
