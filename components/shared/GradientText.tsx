'use client';

import { HTMLAttributes, forwardRef, ElementType } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GradientTextElement = 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p';

interface GradientTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  as?: GradientTextElement;
  variant?: 'default' | 'subtle';
  animate?: boolean;
}

const GradientText = forwardRef<HTMLSpanElement, GradientTextProps>(
  (
    {
      className,
      children,
      as: Component = 'span',
      variant = 'default',
      animate = false,
      ...props
    },
    ref
  ) => {
    const gradientStyles = {
      default: 'from-accent-blue via-cyan-400 to-accent-cyan',
      subtle: 'from-blue-300 via-cyan-300 to-teal-300',
    };

    const baseStyles = cn(
      'bg-gradient-to-r bg-clip-text text-transparent',
      gradientStyles[variant],
      className
    );

    if (animate) {
      return (
        <motion.span
          ref={ref}
          className={baseStyles}
          initial={{ backgroundPosition: '0% 50%' }}
          animate={{ backgroundPosition: '100% 50%' }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{ backgroundSize: '200% 200%' }}
        >
          {children}
        </motion.span>
      );
    }

    // Use a simple approach for non-animated text
    const Element = Component as ElementType;
    
    return (
      <Element ref={ref} className={baseStyles} {...props}>
        {children}
      </Element>
    );
  }
);

GradientText.displayName = 'GradientText';

export { GradientText };
export type { GradientTextProps };
