'use client';

import { motion } from 'framer-motion';
import { formatCurrency, formatPercent } from '@/lib/constants';

interface EstimationMethodProps {
  purchaseYear: number;
  marketAverageAtPurchase: number;
  currentMarketAverage: number;
  purchaseIndex: number;
  appreciationPercent: number;
  interestRateUsed: number;
}

export function EstimationMethod({
  purchaseYear,
  marketAverageAtPurchase,
  currentMarketAverage,
  purchaseIndex,
  appreciationPercent,
  interestRateUsed,
}: EstimationMethodProps) {
  const steps = [
    {
      title: 'Market Position at Purchase',
      description: `When you bought in ${purchaseYear}, your purchase price was ${
        purchaseIndex > 1 ? 'above' : purchaseIndex < 1 ? 'below' : 'at'
      } the GTA average (${formatCurrency(marketAverageAtPurchase)}).`,
      detail: `Your property represented ${(purchaseIndex * 100).toFixed(0)}% of the market average.`,
    },
    {
      title: 'Current Market Application',
      description: `We applied your property's relative market position to today's GTA average of ${formatCurrency(
        currentMarketAverage
      )}.`,
      detail: `This accounts for overall market appreciation while maintaining your property's relative position.`,
    },
    {
      title: 'Market Volatility Adjustment',
      description: `Based on current market conditions, we applied a confidence range to reflect realistic price variability.`,
      detail: `This creates the conservative to optimistic range in your estimate.`,
    },
    {
      title: 'Mortgage Calculation',
      description: `We estimated your remaining mortgage using standard 25-year amortization and historical interest rates.`,
      detail: `Based on ${interestRateUsed.toFixed(2)}% rate typical for ${purchaseYear} purchases.`,
    },
  ];

  return (
    <section className="py-10 sm:py-12">
      <motion.div
        className="p-6 sm:p-8 rounded-2xl bg-surface border border-border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-2">
          How This Was Estimated
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Here&apos;s a transparent look at our methodology. No black boxes.
        </p>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              className="flex gap-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
            >
              {/* Step number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center text-sm font-medium text-accent-cyan">
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4 border-b border-border last:border-b-0 last:pb-0">
                <h4 className="font-medium text-foreground">{step.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {step.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary stats */}
        <motion.div
          className="mt-6 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">
              {formatPercent(appreciationPercent, 1)}
            </p>
            <p className="text-xs text-muted-foreground">Est. Appreciation</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">
              {new Date().getFullYear() - purchaseYear}
            </p>
            <p className="text-xs text-muted-foreground">Years Owned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">
              {formatPercent(interestRateUsed, 2)}
            </p>
            <p className="text-xs text-muted-foreground">Rate Used</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">
              {(purchaseIndex * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Market Position</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
