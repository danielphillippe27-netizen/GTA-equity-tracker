'use client';

import { useState } from 'react';
import { GlowButton } from '@/components/shared';

interface RequestPreciseEvaluationFormProps {
  estimateId?: string | null;
  subscriberId?: string | null;
  initialName?: string | null;
  initialEmail?: string | null;
  region?: string | null;
  propertyType?: string | null;
}

export function RequestPreciseEvaluationForm({
  estimateId,
  subscriberId,
  initialName,
  initialEmail,
  region,
  propertyType,
}: RequestPreciseEvaluationFormProps) {
  const [formData, setFormData] = useState({
    name: initialName || '',
    email: initialEmail || '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const notes = [
      'Source: monthly home wealth email',
      subscriberId ? `Subscriber ID: ${subscriberId}` : null,
      estimateId ? `Estimate ID: ${estimateId}` : null,
      region ? `Region: ${region}` : null,
      propertyType ? `Property type: ${propertyType}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await fetch('/api/cma-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateId: estimateId || undefined,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          preferredContactMethod: formData.phone ? 'either' : 'email',
          notes,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'Failed to submit request');
      }

      setIsSuccess(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'An unexpected error occurred'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="rounded-[28px] border border-border/70 bg-surface/90 p-8 shadow-2xl shadow-black/20">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent-cyan">
          Request Received
        </p>
        <h2 className="mb-3 text-3xl font-semibold text-foreground">
          Daniel will reach out personally
        </h2>
        <p className="text-base leading-7 text-muted-foreground">
          We&apos;ve logged your precise home evaluation request and sent it to
          The Phillippe Group. Expect a follow-up at{' '}
          <span className="font-medium text-foreground">{formData.email}</span>
          {formData.phone ? ` or ${formData.phone}` : ''}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-border/70 bg-surface/90 p-8 shadow-2xl shadow-black/20">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent-cyan">
        Precise Home Evaluation
      </p>
      <h2 className="mb-3 text-3xl font-semibold text-foreground">
        Request a direct follow-up from The Phillippe Group
      </h2>
      <p className="mb-8 text-base leading-7 text-muted-foreground">
        This route is designed for email recipients. We preloaded your details so
        the button can create a real follow-up request instead of dropping you on
        a generic page.
      </p>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label
            className="mb-2 block text-sm font-medium text-foreground"
            htmlFor="precise-eval-name"
          >
            Name
          </label>
          <input
            id="precise-eval-name"
            type="text"
            value={formData.name}
            onChange={(event) =>
              setFormData((current) => ({ ...current, name: event.target.value }))
            }
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent-blue"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-foreground"
            htmlFor="precise-eval-email"
          >
            Email
          </label>
          <input
            id="precise-eval-email"
            type="email"
            value={formData.email}
            onChange={(event) =>
              setFormData((current) => ({ ...current, email: event.target.value }))
            }
            required
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent-blue"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-foreground"
            htmlFor="precise-eval-phone"
          >
            Phone
          </label>
          <input
            id="precise-eval-phone"
            type="tel"
            value={formData.phone}
            onChange={(event) =>
              setFormData((current) => ({ ...current, phone: event.target.value }))
            }
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent-blue"
            placeholder="Optional, if you want a call back"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <GlowButton
          type="submit"
          className="w-full justify-center"
          size="lg"
          disabled={isSubmitting || !formData.name || !formData.email}
        >
          {isSubmitting ? 'Submitting Request...' : 'Request Precise Home Evaluation'}
        </GlowButton>

        <p className="text-sm leading-6 text-muted-foreground">
          Submission creates a tagged evaluation request in your CRM table and
          sends an internal notification email so you can follow up directly.
        </p>
      </form>
    </div>
  );
}
