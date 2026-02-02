'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useFunnel } from './FunnelProvider';

interface StepWrapperProps {
  children: ReactNode;
  className?: string;
}

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

export function StepWrapper({ children, className }: StepWrapperProps) {
  const { currentStep } = useFunnel();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={currentStep}
        custom={1}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className={cn('w-full', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Individual step content wrapper with consistent styling
interface StepContentProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function StepContent({
  title,
  description,
  children,
  className,
}: StepContentProps) {
  return (
    <div className={cn('mx-auto max-w-2xl px-4 py-8 sm:py-12', className)}>
      {/* Step header */}
      <motion.div
        className="text-center mb-8 sm:mb-12"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
        {description && (
          <p className="mt-3 text-muted-foreground">{description}</p>
        )}
      </motion.div>

      {/* Step content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
