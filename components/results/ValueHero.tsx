'use client';

import { motion } from 'framer-motion';
import { ValueDisplay } from '@/components/shared';
import { formatCurrency } from '@/lib/constants';

interface ValueHeroProps {
  value: {
    low: number;
    mid: number;
    high: number;
  };
  address: string;
}

export function ValueHero({ value, address }: ValueHeroProps) {
  return (
    <section className="relative py-12 sm:py-16 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-glow-blue opacity-30" />
      
      <div className="relative z-10 text-center">
        {/* Address */}
        <motion.p
          className="text-sm text-muted-foreground mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Estimated value for
        </motion.p>
        <motion.h2
          className="text-lg sm:text-xl font-medium text-foreground mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {address}
        </motion.h2>

        {/* Main value */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-sm text-muted-foreground mb-2">
            Estimated Home Value
          </p>
          <ValueDisplay
            value={value.mid}
            size="xl"
            animate={true}
            duration={1.5}
          />
        </motion.div>

        {/* Value range */}
        <motion.div
          className="mt-6 flex items-center justify-center gap-4 text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <div className="text-center">
            <p className="text-muted-foreground text-xs mb-1">Conservative</p>
            <p className="font-medium text-foreground">
              {formatCurrency(value.low)}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-muted-foreground text-xs mb-1">Optimistic</p>
            <p className="font-medium text-foreground">
              {formatCurrency(value.high)}
            </p>
          </div>
        </motion.div>

        {/* Confidence note */}
        <motion.p
          className="mt-6 text-xs text-muted-foreground max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        >
          This estimate reflects current market conditions and historical trends.
          The range accounts for market variability.
        </motion.p>
      </div>
    </section>
  );
}
