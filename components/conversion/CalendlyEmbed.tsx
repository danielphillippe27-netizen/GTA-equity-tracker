'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlowButton } from '@/components/shared';

interface CalendlyEmbedProps {
  estimateId: string;
  onClose: () => void;
}

export function CalendlyEmbed({ estimateId, onClose }: CalendlyEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  useEffect(() => {
    // Track that user clicked to book
    async function trackBookingClick() {
      try {
        // This could be sent to analytics or stored in database
        console.log('Booking initiated for estimate:', estimateId);
      } catch (error) {
        console.error('Failed to track booking click:', error);
      }
    }

    trackBookingClick();
  }, [estimateId]);

  // If no Calendly URL is configured, show a fallback
  if (!calendlyUrl) {
    return (
      <motion.div
        className="p-6 rounded-xl bg-surface border border-border text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-foreground">
            Schedule an Evaluation
          </h4>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="w-16 h-16 rounded-full bg-accent-blue/20 flex items-center justify-center mx-auto mb-4">
          <svg
            className="h-8 w-8 text-accent-cyan"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h5 className="text-lg font-semibold text-foreground mb-2">
          Contact Us to Schedule
        </h5>
        <p className="text-muted-foreground mb-4">
          To book your in-person strategic home evaluation, please reach out
          directly. We&apos;ll find a time that works for you.
        </p>

        <div className="space-y-3">
          <a
            href="mailto:contact@example.com"
            className="block"
          >
            <GlowButton variant="secondary" className="w-full">
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Email Us
            </GlowButton>
          </a>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          No obligation. Just a conversation about your property and goals.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-6 rounded-xl bg-surface border border-border"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-foreground">
          Book Your Evaluation
        </h4>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Select a time that works for you. This is a no-obligation conversation
        about your property and market conditions.
      </p>

      {/* Calendly iframe container */}
      <div className="relative rounded-lg overflow-hidden bg-white min-h-[500px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent-blue mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Loading calendar...
              </p>
            </div>
          </div>
        )}

        <iframe
          src={`${calendlyUrl}?hide_gdpr_banner=1&background_color=131920&text_color=f8fafc&primary_color=3b82f6`}
          width="100%"
          height="500"
          frameBorder="0"
          title="Schedule an Evaluation"
          onLoad={() => setIsLoading(false)}
          className="w-full"
        />
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Powered by Calendly. Your time is valuable — we&apos;ll be prepared.
      </p>
    </motion.div>
  );
}
