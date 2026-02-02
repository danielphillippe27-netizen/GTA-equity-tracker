'use client';

import { motion } from 'framer-motion';
import { StepContent } from '../StepWrapper';
import { GradientText } from '@/components/shared';

export function TrustBuilding() {
  const trustPoints = [
    {
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      title: 'Official Board Data',
      description:
        'Our estimates are built on historical data from TRREB (Toronto Regional Real Estate Board) and other official sources.',
    },
    {
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      title: 'Transparent Methodology',
      description:
        "We'll show you exactly how your estimate was calculated. No black boxes, no mystery algorithms.",
    },
    {
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
      title: 'No Account Required',
      description:
        "Get your estimate without creating an account or providing personal information. It's your data.",
    },
  ];

  return (
    <StepContent
      title="Our Methodology"
      description="Here's how we build reliable estimates you can trust."
    >
      {/* Main trust points */}
      <div className="grid gap-6">
        {trustPoints.map((point, index) => (
          <motion.div
            key={point.title}
            className="flex gap-4 items-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center text-accent-cyan">
              {point.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{point.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {point.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Data coverage highlight */}
      <motion.div
        className="mt-8 p-6 rounded-xl bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <div className="text-center">
          <div className="flex justify-center gap-8 mb-4">
            <div>
              <div className="text-3xl font-bold">
                <GradientText>45+</GradientText>
              </div>
              <div className="text-xs text-muted-foreground">Years of Data</div>
            </div>
            <div className="w-px bg-border" />
            <div>
              <div className="text-3xl font-bold">
                <GradientText>GTA</GradientText>
              </div>
              <div className="text-xs text-muted-foreground">Wide Coverage</div>
            </div>
            <div className="w-px bg-border" />
            <div>
              <div className="text-3xl font-bold">
                <GradientText>Live</GradientText>
              </div>
              <div className="text-xs text-muted-foreground">Market Data</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Our database spans from 1980 to present, covering all major GTA regions.
          </p>
        </div>
      </motion.div>

      {/* Ready message */}
      <motion.p
        className="mt-8 text-center text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        Ready to see your estimate?{' '}
        <GradientText className="font-medium">
          Let&apos;s get your property details.
        </GradientText>
      </motion.p>
    </StepContent>
  );
}
