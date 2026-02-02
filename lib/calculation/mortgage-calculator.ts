/**
 * Mortgage Calculator
 * 
 * Provides functions for calculating mortgage payments, remaining balances,
 * and equity based on standard amortization formulas.
 */

import { getHistoricalRate } from '@/lib/data/historical-rates';

// Types
export interface MortgageInput {
  purchasePrice: number;
  purchaseYear: number;
  purchaseMonth: number;
  downPaymentPercent?: number; // Optional override
  downPaymentAmount?: number; // Optional override (takes precedence)
  interestRate?: number; // Optional override (annual %)
  amortizationYears?: number; // Default 25
}

export interface MortgageSummary {
  // Input values (with defaults applied)
  purchasePrice: number;
  downPaymentAmount: number;
  downPaymentPercent: number;
  originalMortgage: number;
  interestRate: number;
  amortizationYears: number;
  
  // Calculated at purchase
  monthlyPayment: number;
  totalInterestOverLife: number;
  totalPaymentsOverLife: number;
  
  // Current status
  monthsElapsed: number;
  yearsElapsed: number;
  remainingBalance: number;
  principalPaidToDate: number;
  interestPaidToDate: number;
  
  // Equity calculation
  percentPaidOff: number;
}

export interface RefinanceScenario {
  additionalLoanAmount: number;
  interestRate: number;
  termYears: number;
  newMonthlyPayment: number;
  totalNewDebt: number;
  impactOnEquity: number;
}

/**
 * Calculate the default down payment based on purchase price
 * Canadian rules:
 * - $1M+ requires minimum 20% down
 * - Under $1M: we assume 10% as a reasonable default
 */
export function calculateDefaultDownPayment(purchasePrice: number): {
  amount: number;
  percent: number;
} {
  if (purchasePrice >= 1000000) {
    return {
      amount: purchasePrice * 0.20,
      percent: 20,
    };
  }
  // Default to 10% for under $1M
  return {
    amount: purchasePrice * 0.10,
    percent: 10,
  };
}

/**
 * Calculate monthly mortgage payment using standard amortization formula
 * 
 * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * 
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate as percentage (e.g., 5.5 for 5.5%)
 * @param amortizationYears - Total years for amortization
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  amortizationYears: number
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / (amortizationYears * 12);
  
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = amortizationYears * 12;
  
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, totalMonths);
  const denominator = Math.pow(1 + monthlyRate, totalMonths) - 1;
  
  return principal * (numerator / denominator);
}

/**
 * Calculate remaining mortgage balance after N months
 * 
 * Formula: B = P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
 * 
 * @param principal - Original loan amount
 * @param annualRate - Annual interest rate as percentage
 * @param amortizationYears - Total years for amortization
 * @param monthsPaid - Number of months of payments made
 * @returns Remaining balance
 */
export function calculateRemainingBalance(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  monthsPaid: number
): number {
  if (principal <= 0) return 0;
  if (monthsPaid <= 0) return principal;
  
  const totalMonths = amortizationYears * 12;
  if (monthsPaid >= totalMonths) return 0;
  
  if (annualRate <= 0) {
    // Simple calculation for 0% interest
    const monthlyPayment = principal / totalMonths;
    return Math.max(0, principal - (monthlyPayment * monthsPaid));
  }
  
  const monthlyRate = annualRate / 100 / 12;
  const compoundTotal = Math.pow(1 + monthlyRate, totalMonths);
  const compoundPaid = Math.pow(1 + monthlyRate, monthsPaid);
  
  const balance = principal * (compoundTotal - compoundPaid) / (compoundTotal - 1);
  
  return Math.max(0, balance);
}

/**
 * Calculate total interest paid over the life of the mortgage
 */
export function calculateTotalInterest(
  principal: number,
  annualRate: number,
  amortizationYears: number
): number {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, amortizationYears);
  const totalPayments = monthlyPayment * amortizationYears * 12;
  return totalPayments - principal;
}

/**
 * Calculate interest paid to date
 */
export function calculateInterestPaidToDate(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  monthsPaid: number
): number {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, amortizationYears);
  const totalPaid = monthlyPayment * monthsPaid;
  const remainingBalance = calculateRemainingBalance(principal, annualRate, amortizationYears, monthsPaid);
  const principalPaid = principal - remainingBalance;
  
  return totalPaid - principalPaid;
}

/**
 * Calculate months elapsed since purchase
 */
export function calculateMonthsElapsed(purchaseYear: number, purchaseMonth: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth is 0-indexed
  
  const yearsDiff = currentYear - purchaseYear;
  const monthsDiff = currentMonth - purchaseMonth;
  
  return Math.max(0, yearsDiff * 12 + monthsDiff);
}

/**
 * Calculate complete mortgage summary
 */
export function calculateMortgageSummary(input: MortgageInput): MortgageSummary {
  const {
    purchasePrice,
    purchaseYear,
    purchaseMonth,
    downPaymentPercent,
    downPaymentAmount,
    interestRate,
    amortizationYears = 25,
  } = input;
  
  // Determine down payment
  let finalDownPaymentAmount: number;
  let finalDownPaymentPercent: number;
  
  if (downPaymentAmount !== undefined) {
    // Use explicit amount
    finalDownPaymentAmount = downPaymentAmount;
    finalDownPaymentPercent = (downPaymentAmount / purchasePrice) * 100;
  } else if (downPaymentPercent !== undefined) {
    // Use explicit percent
    finalDownPaymentPercent = downPaymentPercent;
    finalDownPaymentAmount = purchasePrice * (downPaymentPercent / 100);
  } else {
    // Use defaults
    const defaults = calculateDefaultDownPayment(purchasePrice);
    finalDownPaymentAmount = defaults.amount;
    finalDownPaymentPercent = defaults.percent;
  }
  
  // Calculate original mortgage
  const originalMortgage = purchasePrice - finalDownPaymentAmount;
  
  // Determine interest rate
  const finalInterestRate = interestRate ?? getHistoricalRate(purchaseYear);
  
  // Calculate monthly payment
  const monthlyPayment = calculateMonthlyPayment(
    originalMortgage,
    finalInterestRate,
    amortizationYears
  );
  
  // Calculate totals over life
  const totalPaymentsOverLife = monthlyPayment * amortizationYears * 12;
  const totalInterestOverLife = totalPaymentsOverLife - originalMortgage;
  
  // Calculate current status
  const monthsElapsed = calculateMonthsElapsed(purchaseYear, purchaseMonth);
  const yearsElapsed = Math.floor(monthsElapsed / 12);
  
  const remainingBalance = calculateRemainingBalance(
    originalMortgage,
    finalInterestRate,
    amortizationYears,
    monthsElapsed
  );
  
  const principalPaidToDate = originalMortgage - remainingBalance;
  const interestPaidToDate = calculateInterestPaidToDate(
    originalMortgage,
    finalInterestRate,
    amortizationYears,
    monthsElapsed
  );
  
  const percentPaidOff = originalMortgage > 0 
    ? (principalPaidToDate / originalMortgage) * 100 
    : 0;
  
  return {
    purchasePrice,
    downPaymentAmount: finalDownPaymentAmount,
    downPaymentPercent: finalDownPaymentPercent,
    originalMortgage,
    interestRate: finalInterestRate,
    amortizationYears,
    monthlyPayment,
    totalInterestOverLife,
    totalPaymentsOverLife,
    monthsElapsed,
    yearsElapsed,
    remainingBalance,
    principalPaidToDate,
    interestPaidToDate,
    percentPaidOff,
  };
}

/**
 * Calculate refinance scenario impact
 */
export function calculateRefinanceScenario(
  currentRemainingBalance: number,
  additionalLoanAmount: number,
  newInterestRate: number,
  newTermYears: number
): RefinanceScenario {
  const totalNewDebt = currentRemainingBalance + additionalLoanAmount;
  const newMonthlyPayment = calculateMonthlyPayment(
    totalNewDebt,
    newInterestRate,
    newTermYears
  );
  
  return {
    additionalLoanAmount,
    interestRate: newInterestRate,
    termYears: newTermYears,
    newMonthlyPayment,
    totalNewDebt,
    impactOnEquity: -additionalLoanAmount, // Reduces equity
  };
}

/**
 * Calculate net equity (estimated value minus remaining mortgage)
 */
export function calculateNetEquity(
  estimatedValue: number,
  remainingMortgage: number
): number {
  return estimatedValue - remainingMortgage;
}
