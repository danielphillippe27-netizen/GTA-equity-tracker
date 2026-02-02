'use client';

import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export interface InfoTooltipProps {
  content: string;
  className?: string;
}

export function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible]);

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="p-0.5 rounded-full text-muted-foreground hover:text-accent-cyan transition-colors focus:outline-none focus:ring-2 focus:ring-accent-cyan/30"
        aria-label="More information"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 sm:w-72"
          role="tooltip"
        >
          <div className="relative p-3 rounded-lg bg-surface-elevated border border-border shadow-lg text-xs text-muted-foreground leading-relaxed">
            {content}
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-2 h-2 rotate-45 bg-surface-elevated border-r border-b border-border" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
