'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'default', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    default: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-muted border-t-accent-blue',
        sizeClasses[size],
        className
      )}
    />
  );
}

// Full page loading overlay
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <LoadingSpinner size="lg" />
      <motion.p
        className="mt-4 text-muted-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>
    </motion.div>
  );
}

// Skeleton loaders for content
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-lg bg-surface',
        className
      )}
    />
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-4 flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// Results page skeleton
export function ResultsSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero skeleton */}
      <div className="py-12 text-center">
        <Skeleton className="h-4 w-32 mx-auto mb-4" />
        <Skeleton className="h-8 w-64 mx-auto mb-8" />
        <Skeleton className="h-16 w-80 mx-auto" />
      </div>
      
      {/* Cards skeleton */}
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
