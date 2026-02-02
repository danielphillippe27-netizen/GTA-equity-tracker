'use client';

import { motion } from 'framer-motion';
import { GlowButton, GradientText } from '@/components/shared';

interface CTACardProps {
  onRequestCMA?: () => void;
  className?: string;
}

export function CTACard({ onRequestCMA, className }: CTACardProps) {
  return (
    <motion.div
      className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="text-center">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-accent-cyan"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-foreground mb-2">
          Want a More Precise Valuation?
        </h3>

        {/* Description */}
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          This is a <GradientText>market index estimate</GradientText> based on regional HPI data. 
          For a precise street-level valuation using comparable sales in your specific neighbourhood, 
          request a detailed comparables report.
        </p>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-accent-cyan"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Up to 24 comparable sales</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-accent-cyan"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Street-level accuracy</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-accent-cyan"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Personalized video analysis</span>
          </div>
        </div>

        {/* CTA Button */}
        <GlowButton onClick={onRequestCMA} size="lg">
          Request Comparables Report
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

        {/* Reassurance */}
        <p className="text-xs text-muted-foreground mt-4">
          No obligation. Your estimate is yours to keep.
        </p>
      </div>
    </motion.div>
  );
}
