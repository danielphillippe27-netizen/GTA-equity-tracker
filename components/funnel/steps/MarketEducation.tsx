'use client';

import { motion } from 'framer-motion';
import { StepContent } from '../StepWrapper';
import { GradientText } from '@/components/shared';

export function MarketEducation() {
  const features = [
    {
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      title: 'Estimates, Not Evaluations',
      description:
        "We provide market-based estimates using historical data. For an official evaluation, speak with a licensed realtor.",
      link: { text: "Book a consultation", url: "https://calendly.com/daniel-phillippe/discovery-call" },
    },
    {
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      title: 'Ranges, Not Exact Numbers',
      description:
        "Real estate values fluctuate. We provide a likely value with conservative and optimistic ranges to give you the full picture.",
    },
    {
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: 'A Moment in Time',
      description:
        "Your estimate reflects today's market conditions. Values can change as the market evolves.",
    },
  ];

  return (
    <StepContent
      title="Understanding Home Value Estimates"
      description="Before we begin, here's what you should know about how our estimates work."
    >
      <div className="space-y-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            className="flex gap-4 p-4 rounded-xl bg-surface/50 border border-border"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center text-accent-cyan">
              {feature.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.description}
                {'link' in feature && feature.link && (
                  <>
                    {' '}
                    <a
                      href={feature.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-cyan hover:text-accent-blue underline transition-colors"
                    >
                      {feature.link.text}
                    </a>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom note */}
      <motion.p
        className="mt-8 text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        Your estimate is yours to keep.{' '}
        <GradientText>No pressure, no obligation.</GradientText>
      </motion.p>
    </StepContent>
  );
}
