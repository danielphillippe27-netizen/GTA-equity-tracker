'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlowButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'type'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'lg' | 'sm';
  glow?: boolean;
}

const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'default',
      glow = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      'relative inline-flex items-center justify-center font-medium transition-all duration-300',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:pointer-events-none disabled:opacity-50',
      {
        // Size variants
        'px-6 py-3 text-base rounded-xl': size === 'default',
        'px-8 py-4 text-lg rounded-xl': size === 'lg',
        'px-4 py-2 text-sm rounded-lg': size === 'sm',
      }
    );

    const variantStyles = {
      primary: cn(
        'bg-gradient-to-r from-accent-blue to-accent-cyan text-white',
        'hover:from-blue-600 hover:to-cyan-500',
        'focus-visible:ring-accent-blue',
        glow && 'shadow-lg shadow-accent-blue/25 hover:shadow-xl hover:shadow-accent-blue/30'
      ),
      secondary: cn(
        'bg-surface border border-border text-foreground',
        'hover:bg-surface-elevated hover:border-accent-blue/50',
        'focus-visible:ring-accent-blue'
      ),
      ghost: cn(
        'text-muted-foreground hover:text-foreground hover:bg-surface',
        'focus-visible:ring-accent-blue'
      ),
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], className)}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        {...props}
      >
        {/* Glow effect overlay for primary variant */}
        {variant === 'primary' && glow && !disabled && (
          <motion.span
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent-blue/20 to-accent-cyan/20 blur-xl"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </motion.button>
    );
  }
);

GlowButton.displayName = 'GlowButton';

export { GlowButton };
export type { GlowButtonProps };
