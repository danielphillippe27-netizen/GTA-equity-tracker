'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
  showStepIndicators?: boolean;
  labels?: string[];
}

export function ProgressBar({
  currentStep,
  totalSteps,
  className,
  showStepIndicators = true,
  labels,
}: ProgressBarProps) {
  const progress = ((currentStep) / (totalSteps)) * 100;

  return (
    <div className={cn('w-full', className)}>
      {/* Progress bar container */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface">
        {/* Animated progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        
        {/* Glow effect */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan blur-sm opacity-50"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Step indicators */}
      {showStepIndicators && (
        <div className="relative mt-4 flex justify-between">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1;
            const isCompleted = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;

            return (
              <div
                key={index}
                className="flex flex-col items-center"
              >
                {/* Step dot */}
                <motion.div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                    {
                      'bg-gradient-to-r from-accent-blue to-accent-cyan text-white':
                        isCompleted || isCurrent,
                      'bg-surface text-muted-foreground': !isCompleted && !isCurrent,
                    }
                  )}
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
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
                  ) : (
                    stepNumber
                  )}
                </motion.div>

                {/* Step label */}
                {labels && labels[index] && (
                  <span
                    className={cn(
                      'mt-2 text-xs transition-colors hidden sm:block',
                      {
                        'text-foreground': isCurrent,
                        'text-muted-foreground': !isCurrent,
                      }
                    )}
                  >
                    {labels[index]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Simple linear progress without step indicators
export function SimpleProgressBar({
  progress,
  className,
}: {
  progress: number;
  className?: string;
}) {
  return (
    <div className={cn('h-1 w-full overflow-hidden rounded-full bg-surface', className)}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}
