'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/constants';

interface ValueDisplayProps {
  value: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  size?: 'default' | 'lg' | 'xl';
  animate?: boolean;
  duration?: number;
}

export function ValueDisplay({
  value,
  label,
  prefix = '$',
  suffix,
  className,
  size = 'default',
  animate = true,
  duration = 1.5,
}: ValueDisplayProps) {
  // Track animated value for spring animation
  const [animatedValue, setAnimatedValue] = useState(0);
  const hasStartedRef = useRef(false);

  // Animated spring value
  const springValue = useSpring(0, {
    stiffness: 50,
    damping: 20,
    duration: duration * 1000,
  });

  // Set the spring target and subscribe to changes when animating
  useEffect(() => {
    if (!animate) return;
    
    // Start animation
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      springValue.set(value);
    }
    
    const unsubscribe = springValue.on('change', (latest) => {
      setAnimatedValue(Math.round(latest));
    });
    
    return () => unsubscribe();
  }, [springValue, animate, value]);

  // Update spring target when value changes
  useEffect(() => {
    if (animate && hasStartedRef.current) {
      springValue.set(value);
    }
  }, [value, animate, springValue]);

  const sizeStyles = {
    default: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl',
    xl: 'text-5xl sm:text-6xl md:text-7xl',
  };

  // Use actual value when not animating, animated value otherwise
  const displayValue = animate ? animatedValue : value;
  const formattedValue = displayValue.toLocaleString('en-CA');

  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <span className="text-sm text-muted-foreground mb-1">{label}</span>
      )}
      <motion.div
        className={cn(
          'font-bold tracking-tight value-display',
          sizeStyles[size]
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <span className="gradient-text">
          {prefix}
          {formattedValue}
          {suffix}
        </span>
      </motion.div>
    </div>
  );
}

// Compact value range display
interface ValueRangeProps {
  low: number;
  mid: number;
  high: number;
  label?: string;
  className?: string;
}

export function ValueRange({ low, mid, high, label, className }: ValueRangeProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
      <div className="flex items-baseline gap-4">
        {/* Primary value */}
        <span className="text-2xl sm:text-3xl font-bold gradient-text">
          {formatCurrency(mid)}
        </span>
        
        {/* Range */}
        <span className="text-sm text-muted-foreground">
          {formatCurrency(low)} – {formatCurrency(high)}
        </span>
      </div>
    </div>
  );
}

// Equity snapshot with visual indicator
interface EquityDisplayProps {
  equity: {
    low: number;
    mid: number;
    high: number;
  };
  homeValue: number;
  mortgage: number;
  className?: string;
}

export function EquityDisplay({
  equity,
  homeValue,
  mortgage,
  className,
}: EquityDisplayProps) {
  const equityPercent = (equity.mid / homeValue) * 100;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main equity value */}
      <div>
        <span className="text-sm text-muted-foreground">Estimated Equity</span>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-3xl sm:text-4xl font-bold gradient-text">
            {formatCurrency(equity.mid)}
          </span>
          <span className="text-sm text-muted-foreground">
            ({equityPercent.toFixed(0)}% of value)
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Range: {formatCurrency(equity.low)} – {formatCurrency(equity.high)}
        </span>
      </div>

      {/* Visual equity bar */}
      <div className="space-y-2">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface">
          {/* Mortgage portion */}
          <motion.div
            className="h-full bg-muted"
            initial={{ width: 0 }}
            animate={{ width: `${100 - equityPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          {/* Equity portion */}
          <motion.div
            className="h-full bg-gradient-to-r from-accent-blue to-accent-cyan"
            initial={{ width: 0 }}
            animate={{ width: `${equityPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Mortgage: {formatCurrency(mortgage)}</span>
          <span>Equity: {formatCurrency(equity.mid)}</span>
        </div>
      </div>
    </div>
  );
}
