'use client';

import { motion } from 'framer-motion';
import { StepContent } from '../StepWrapper';
import { GradientText } from '@/components/shared';

export function MarketCycles() {
  const phases = [
    {
      name: 'Hot Market',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      description:
        'Strong demand, rising prices, homes sell quickly above asking. Sellers have the advantage.',
      range: '±4%',
    },
    {
      name: 'Balanced Market',
      color: 'from-accent-blue to-accent-cyan',
      bgColor: 'bg-accent-blue/10',
      borderColor: 'border-accent-blue/30',
      description:
        'Equilibrium between buyers and sellers. Homes sell near asking price with reasonable timelines.',
      range: '±6%',
    },
    {
      name: 'Soft Market',
      color: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/30',
      description:
        'More inventory, longer selling times. Buyers have negotiating power, prices may adjust.',
      range: '±8-10%',
    },
  ];

  return (
    <StepContent
      title="How GTA Market Cycles Work"
      description="The Greater Toronto Area real estate market moves through distinct phases that affect home values."
    >
      <div className="space-y-4">
        {phases.map((phase, index) => (
          <motion.div
            key={phase.name}
            className={`p-4 rounded-xl border ${phase.borderColor} ${phase.bgColor}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full bg-gradient-to-r ${phase.color}`}
                  />
                  <h3 className="font-semibold text-foreground">{phase.name}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {phase.description}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs text-muted-foreground">
                  Value Range
                </span>
                <p className="font-mono font-semibold text-foreground">
                  {phase.range}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeline illustration */}
      <motion.div
        className="mt-8 p-4 rounded-xl bg-surface/50 border border-border"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <h4 className="text-sm font-medium text-foreground mb-3">
          GTA Market History (1980–Present)
        </h4>
        <div className="relative h-12">
          {/* Timeline bar */}
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-teal-500 via-accent-blue via-orange-500 to-accent-blue" />
          
          {/* Key events */}
          <div className="absolute left-0 top-0 text-[10px] text-muted-foreground">
            1980
          </div>
          <div className="absolute left-1/4 top-0 text-[10px] text-muted-foreground">
            2008 Crisis
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-0 text-[10px] text-muted-foreground">
            2017 Peak
          </div>
          <div className="absolute right-1/4 top-0 text-[10px] text-muted-foreground">
            2022 Peak
          </div>
          <div className="absolute right-0 top-0 text-[10px] text-muted-foreground">
            Today
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Markets are cyclical. Understanding the current phase helps set realistic expectations.
        </p>
      </motion.div>

      {/* Current market status */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <span className="text-sm text-muted-foreground">
          Current GTA Market:{' '}
        </span>
        <GradientText className="font-semibold">Balanced</GradientText>
      </motion.div>
    </StepContent>
  );
}
