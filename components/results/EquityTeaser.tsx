'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Calculator, LineChart } from 'lucide-react';
import { GlowButton, GradientText } from '@/components/shared';

interface EquityTeaserProps {
  onContinue?: () => void;
  className?: string;
}

export function EquityTeaser({ onContinue, className }: EquityTeaserProps) {
  return (
    <motion.div
      className={`p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20 text-center ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Headline */}
      <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
        See Your <GradientText>True Home Equity</GradientText>
      </h3>

      {/* Subtext */}
      <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
        Your equity comes from two things: market growth and mortgage paydown.
        <br className="hidden sm:block" />
        We'll combine both and track it over time.
      </p>

      {/* CTA Button */}
      <GlowButton onClick={onContinue} size="lg" className="mb-6">
        Unlock My Equity Tracker
        <svg
          className="ml-2 h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </GlowButton>

      {/* What you'll get - soft bullets */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent-cyan" />
          <span>Market-indexed value</span>
        </div>
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-accent-cyan" />
          <span>Mortgage balance over time</span>
        </div>
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-accent-cyan" />
          <span>Net equity tracker</span>
        </div>
      </div>

      {/* Micro-line */}
      <p className="text-xs text-muted-foreground mt-6">
        Takes less than 30 seconds. No obligation.
      </p>
    </motion.div>
  );
}
