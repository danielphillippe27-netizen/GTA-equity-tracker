'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearPendingEstimate,
  setLatestEstimateResult,
  getPendingEstimate,
  setLatestPropertyData,
} from '@/lib/estimate-storage';
import {
  calculateMortgageSummary,
  calculateNetEquity,
} from '@/lib/calculation/mortgage-calculator';

interface EstimateResponse {
  estimateId: string;
  result: {
    estimatedCurrentValue: number;
  };
}

export default function EstimatePage() {
  const router = useRouter();
  const hasStartedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    async function createEstimate() {
      try {
        const pendingEstimate = getPendingEstimate();
        const basePayload = pendingEstimate?.propertyData;

        if (
          !basePayload?.region ||
          !basePayload.propertyType ||
          !basePayload.purchaseYear ||
          !basePayload.purchaseMonth ||
          !basePayload.purchasePrice
        ) {
          router.replace('/');
          return;
        }

        const response = await fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            region: basePayload.region,
            propertyType: basePayload.propertyType,
            purchaseYear: basePayload.purchaseYear,
            purchaseMonth: basePayload.purchaseMonth,
            purchasePrice: basePayload.purchasePrice,
          }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || 'Failed to calculate your estimate.');
        }

        const { estimateId, result } = responseData as EstimateResponse;
        const mortgageSummary = calculateMortgageSummary({
          purchasePrice: basePayload.purchasePrice,
          purchaseYear: basePayload.purchaseYear,
          purchaseMonth: basePayload.purchaseMonth,
          interestRate: basePayload.mortgageAssumptions.interestRate,
          amortizationYears: basePayload.mortgageAssumptions.amortization,
          downPaymentAmount: basePayload.mortgageAssumptions.downPayment,
        });

        const propertyData = {
          ...basePayload,
          estimateId,
          estimatedCurrentValue: result.estimatedCurrentValue,
          netEquity: calculateNetEquity(
            result.estimatedCurrentValue,
            mortgageSummary.remainingBalance
          ),
        };

        setLatestPropertyData(propertyData);
        setLatestEstimateResult({
          estimateId,
          result: responseData.result,
        });
        clearPendingEstimate();

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(
            `estimate_${estimateId}`,
            JSON.stringify(responseData.result)
          );
        }

        const subscribeResponse = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pendingEstimate?.email || '',
            name: pendingEstimate?.name || '',
            propertyData,
            estimateId,
          }),
        });

        if (!subscribeResponse.ok) {
          console.error('Failed to sync subscriber record');
        }

        router.replace(`/results/${estimateId}`);
      } catch (createError) {
        console.error(createError);
        setError(
          createError instanceof Error
            ? createError.message
            : 'Failed to prepare your estimate.'
        );
      }
    }

    void createEstimate();
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            We couldn&apos;t prepare your estimate
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.replace('/')}
            className="inline-flex items-center justify-center rounded-xl bg-accent-blue px-5 py-3 text-sm font-medium text-white"
          >
            Start Over
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent-blue mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Building your equity report
        </h1>
        <p className="text-muted-foreground">
          We&apos;re applying your mortgage assumptions and loading the results.
        </p>
      </div>
    </main>
  );
}
