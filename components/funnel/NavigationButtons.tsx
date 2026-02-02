'use client';

import { GlowButton } from '@/components/shared';
import { useFunnel } from './FunnelProvider';
import { cn } from '@/lib/utils';

interface NavigationButtonsProps {
  onSubmit?: () => void;
  submitLabel?: string;
  className?: string;
  showBack?: boolean;
}

export function NavigationButtons({
  onSubmit,
  submitLabel = 'Continue',
  className,
  showBack = true,
}: NavigationButtonsProps) {
  const {
    nextStep,
    prevStep,
    isFirstStep,
    isLastStep,
    canProceed,
    isSubmitting,
  } = useFunnel();

  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
    } else {
      nextStep();
    }
  };

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Back button */}
      {showBack && !isFirstStep ? (
        <GlowButton
          variant="ghost"
          onClick={prevStep}
          disabled={isSubmitting}
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 17l-5-5m0 0l5-5m-5 5h12"
            />
          </svg>
          Back
        </GlowButton>
      ) : (
        <div /> // Spacer
      )}

      {/* Next/Submit button */}
      <GlowButton
        onClick={handleNext}
        disabled={!canProceed || isSubmitting}
        className="min-w-[140px]"
      >
        {isSubmitting ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span className="ml-2">Processing...</span>
          </>
        ) : (
          <>
            {isLastStep ? submitLabel : 'Continue'}
            <svg
              className="ml-2 h-4 w-4"
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
          </>
        )}
      </GlowButton>
    </div>
  );
}
