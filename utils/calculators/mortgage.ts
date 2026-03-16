import type {
  FinancingFormValues,
  MortgagePaymentBreakdown,
  PaymentFrequency,
} from '@/types/sell-buy-calculator';

function getPaymentsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'weekly':
      return 52;
    case 'bi-weekly':
      return 26;
    case 'monthly':
    default:
      return 12;
  }
}

export function calculatePeriodicMortgagePayment(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  paymentFrequency: PaymentFrequency
): number {
  const sanitizedPrincipal = Math.max(0, principal);
  const sanitizedRate = Math.max(0, annualRate);
  const sanitizedAmortizationYears = Math.max(1, amortizationYears);
  const paymentsPerYear = getPaymentsPerYear(paymentFrequency);
  const totalPayments = sanitizedAmortizationYears * paymentsPerYear;

  if (sanitizedPrincipal <= 0) {
    return 0;
  }

  if (sanitizedRate <= 0) {
    return sanitizedPrincipal / totalPayments;
  }

  const periodicRate = sanitizedRate / 100 / paymentsPerYear;
  const compoundFactor = Math.pow(1 + periodicRate, totalPayments);

  return sanitizedPrincipal * ((periodicRate * compoundFactor) / (compoundFactor - 1));
}

export function toMonthlyEquivalent(
  scheduledPayment: number,
  paymentFrequency: PaymentFrequency
): number {
  const paymentsPerYear = getPaymentsPerYear(paymentFrequency);
  return (scheduledPayment * paymentsPerYear) / 12;
}

export function calculateMortgagePaymentBreakdown({
  financing,
  totalMortgageNeeded,
}: {
  financing: FinancingFormValues;
  totalMortgageNeeded: number;
}): MortgagePaymentBreakdown {
  const sanitizedMortgageNeeded = Math.max(0, totalMortgageNeeded);
  const paymentFrequency = financing.paymentFrequency;
  const paymentsPerYear = getPaymentsPerYear(paymentFrequency);

  if (financing.mode === 'port' && financing.portExistingMortgage) {
    const portedBalanceUsed = Math.min(
      Math.max(0, financing.portedMortgageBalance),
      sanitizedMortgageNeeded
    );
    const topUpAmount = Math.max(0, sanitizedMortgageNeeded - portedBalanceUsed);
    const manualBlendedRate = Math.max(0, financing.manualBlendedRate);

    if (manualBlendedRate > 0) {
      const scheduledPayment = calculatePeriodicMortgagePayment(
        sanitizedMortgageNeeded,
        manualBlendedRate,
        financing.amortizationYears,
        paymentFrequency
      );

      return {
        paymentFrequency,
        paymentsPerYear,
        monthlyEquivalentPayment: toMonthlyEquivalent(scheduledPayment, paymentFrequency),
        scheduledPayment,
        totalMortgageNeeded: sanitizedMortgageNeeded,
        effectiveRate: manualBlendedRate,
        mode: 'port',
        portedPayment: 0,
        topUpPayment: scheduledPayment,
        portedBalanceUsed,
        topUpAmount,
      };
    }

    const portedPayment = calculatePeriodicMortgagePayment(
      portedBalanceUsed,
      financing.portedInterestRate,
      financing.amortizationYears,
      paymentFrequency
    );
    const topUpPayment = calculatePeriodicMortgagePayment(
      topUpAmount,
      financing.topUpInterestRate,
      financing.amortizationYears,
      paymentFrequency
    );
    // When no lender-provided blended rate exists, we surface the ported and top-up
    // payment lines separately and report a weighted effective rate for planning only.
    const scheduledPayment = portedPayment + topUpPayment;
    const effectiveRate =
      sanitizedMortgageNeeded > 0
        ? ((portedBalanceUsed * Math.max(0, financing.portedInterestRate)) +
            (topUpAmount * Math.max(0, financing.topUpInterestRate))) /
          sanitizedMortgageNeeded
        : 0;

    return {
      paymentFrequency,
      paymentsPerYear,
      monthlyEquivalentPayment: toMonthlyEquivalent(scheduledPayment, paymentFrequency),
      scheduledPayment,
      totalMortgageNeeded: sanitizedMortgageNeeded,
      effectiveRate,
      mode: 'port',
      portedPayment,
      topUpPayment,
      portedBalanceUsed,
      topUpAmount,
    };
  }

  const scheduledPayment = calculatePeriodicMortgagePayment(
    sanitizedMortgageNeeded,
    financing.simpleInterestRate,
    financing.amortizationYears,
    paymentFrequency
  );

  return {
    paymentFrequency,
    paymentsPerYear,
    monthlyEquivalentPayment: toMonthlyEquivalent(scheduledPayment, paymentFrequency),
    scheduledPayment,
    totalMortgageNeeded: sanitizedMortgageNeeded,
    effectiveRate: Math.max(0, financing.simpleInterestRate),
    mode: 'simple',
    portedPayment: 0,
    topUpPayment: scheduledPayment,
    portedBalanceUsed: 0,
    topUpAmount: sanitizedMortgageNeeded,
  };
}
