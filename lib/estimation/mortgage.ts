import { getHistoricalRate } from './market-data';
import { MORTGAGE_DEFAULTS } from '../constants';

export interface MortgageDetails {
  originalLoanAmount: number;
  monthlyPayment: number;
  remainingBalance: number;
  interestRateUsed: number;
  paymentsMade: number;
  totalPayments: number;
  principalPaid: number;
  interestPaid: number;
}

/**
 * Calculate the monthly mortgage payment using the standard amortization formula.
 * 
 * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * Where:
 * - M = Monthly payment
 * - P = Principal (loan amount)
 * - r = Monthly interest rate
 * - n = Total number of payments
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  amortizationYears: number = MORTGAGE_DEFAULTS.amortizationYears
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) {
    // No interest - just divide principal by payments
    return principal / (amortizationYears * 12);
  }

  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = amortizationYears * 12;
  
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, totalPayments);
  const denominator = Math.pow(1 + monthlyRate, totalPayments) - 1;
  
  return principal * (numerator / denominator);
}

/**
 * Calculate the remaining mortgage balance after a given number of payments.
 * 
 * Formula: B = P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
 * Where:
 * - B = Remaining balance
 * - P = Original principal
 * - r = Monthly interest rate
 * - n = Total number of payments
 * - p = Payments made
 */
export function calculateRemainingBalance(
  principal: number,
  annualRate: number,
  paymentsMade: number,
  amortizationYears: number = MORTGAGE_DEFAULTS.amortizationYears
): number {
  if (principal <= 0) return 0;
  
  const totalPayments = amortizationYears * 12;
  
  // If all payments made, balance is 0
  if (paymentsMade >= totalPayments) return 0;
  
  // If no payments made, balance is principal
  if (paymentsMade <= 0) return principal;
  
  if (annualRate <= 0) {
    // No interest - linear paydown
    const monthlyPrincipal = principal / totalPayments;
    return Math.max(0, principal - monthlyPrincipal * paymentsMade);
  }
  
  const monthlyRate = annualRate / 100 / 12;
  
  // Standard remaining balance formula
  const factor1 = Math.pow(1 + monthlyRate, totalPayments);
  const factor2 = Math.pow(1 + monthlyRate, paymentsMade);
  
  const remainingBalance = principal * (factor1 - factor2) / (factor1 - 1);
  
  return Math.max(0, remainingBalance);
}

/**
 * Calculate full mortgage details including remaining balance.
 */
export function calculateMortgageDetails(
  purchasePrice: number,
  downPaymentPercent: number,
  purchaseYear: number,
  purchaseMonth: number = 6
): MortgageDetails {
  // Calculate original loan amount
  const downPaymentAmount = purchasePrice * (downPaymentPercent / 100);
  const originalLoanAmount = purchasePrice - downPaymentAmount;
  
  // Get historical interest rate for purchase year
  const interestRateUsed = getHistoricalRate(purchaseYear);
  
  // Calculate payments made (months since purchase)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  
  const paymentsMade = Math.max(
    0,
    (currentYear - purchaseYear) * 12 + (currentMonth - purchaseMonth)
  );
  
  const totalPayments = MORTGAGE_DEFAULTS.amortizationYears * 12;
  
  // Calculate monthly payment
  const monthlyPayment = calculateMonthlyPayment(
    originalLoanAmount,
    interestRateUsed,
    MORTGAGE_DEFAULTS.amortizationYears
  );
  
  // Calculate remaining balance
  const remainingBalance = calculateRemainingBalance(
    originalLoanAmount,
    interestRateUsed,
    paymentsMade,
    MORTGAGE_DEFAULTS.amortizationYears
  );
  
  // Calculate principal and interest paid to date
  const totalPaid = monthlyPayment * paymentsMade;
  const principalPaid = originalLoanAmount - remainingBalance;
  const interestPaid = Math.max(0, totalPaid - principalPaid);
  
  return {
    originalLoanAmount,
    monthlyPayment,
    remainingBalance,
    interestRateUsed,
    paymentsMade,
    totalPayments,
    principalPaid,
    interestPaid,
  };
}

/**
 * Calculate what percentage of the original loan has been paid off.
 */
export function calculatePayoffProgress(mortgageDetails: MortgageDetails): number {
  if (mortgageDetails.originalLoanAmount <= 0) return 100;
  return (mortgageDetails.principalPaid / mortgageDetails.originalLoanAmount) * 100;
}

/**
 * Calculate years remaining on mortgage.
 */
export function calculateYearsRemaining(mortgageDetails: MortgageDetails): number {
  const paymentsRemaining = mortgageDetails.totalPayments - mortgageDetails.paymentsMade;
  return Math.max(0, paymentsRemaining / 12);
}
