'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlowButton, GradientText } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSessionId } from '@/lib/session';

interface CMARequestFormProps {
  estimateId: string;
  onClose: () => void;
}

export function CMARequestForm({ estimateId, onClose }: CMARequestFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/cma-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateId,
          sessionId: getSessionId(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        className="p-6 rounded-xl bg-surface border border-border text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-16 h-16 rounded-full bg-accent-cyan/20 flex items-center justify-center mx-auto mb-4">
          <svg
            className="h-8 w-8 text-accent-cyan"
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
        </div>
        <h4 className="text-lg font-semibold text-foreground mb-2">
          Request Submitted
        </h4>
        <p className="text-muted-foreground mb-4">
          Thank you, {formData.name.split(' ')[0]}! We&apos;ll prepare your personalized
          market analysis and send it to {formData.email} within 24-48 hours.
        </p>
        <GlowButton variant="ghost" onClick={onClose}>
          Close
        </GlowButton>
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
          Request Your <GradientText>Personalized Analysis</GradientText>
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

      <p className="text-sm text-muted-foreground mb-6">
        We&apos;ll analyze up to 24 recent comparable sales in your area and deliver
        a personalized video analysis to your inbox.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <Label htmlFor="cma-name" className="text-foreground">
            Your Name
          </Label>
          <Input
            id="cma-name"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="John Smith"
            required
            className="mt-1.5 bg-surface-elevated border-border"
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="cma-email" className="text-foreground">
            Email Address
          </Label>
          <Input
            id="cma-email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="john@example.com"
            required
            className="mt-1.5 bg-surface-elevated border-border"
          />
        </div>

        {/* Phone (optional) */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="cma-phone" className="text-foreground">
              Phone Number
            </Label>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <Input
            id="cma-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phone: e.target.value }))
            }
            placeholder="(416) 555-0123"
            className="mt-1.5 bg-surface-elevated border-border"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        <GlowButton
          type="submit"
          className="w-full"
          disabled={isSubmitting || !formData.name || !formData.email}
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span className="ml-2">Submitting...</span>
            </>
          ) : (
            'Request My Analysis'
          )}
        </GlowButton>

        {/* Privacy note */}
        <p className="text-xs text-muted-foreground text-center">
          Your information is secure and will only be used to deliver your
          analysis.
        </p>
      </form>
    </motion.div>
  );
}
