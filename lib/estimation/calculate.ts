import {
  getMarketAverage,
  getCurrentMarketAverage,
  getMarketPhase,
  getCurrentYear,
} from './market-data';
import { calculateMortgageDetails, MortgageDetails } from './mortgage';
import { MarketPhaseName, MORTGAGE_DEFAULTS } from '../constants';

export interface EstimateInput {
  address: string;
  addressComponents?: {
    street_number?: string;
    street_name?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  };
  purchaseYear: number;
  purchaseMonth?: number;
  purchasePrice: number;
  downPaymentPercent?: number;
}

export interface ValueRange {
  low: number;
  mid: number;
  high: number;
}

export interface EstimateResult {
  // Input echo
  input: EstimateInput;
  
  // Estimated home value
  value: ValueRange;
  
  // Estimated equity
  equity: ValueRange;
  
  // Mortgage details
  mortgage: MortgageDetails;
  
  // Market context
  marketPhase: {
    name: MarketPhaseName;
    label: string;
    volatilityBand: number;
    description: string;
  };
  
  // Calculation details
  purchaseIndex: number;
  marketAverageAtPurchase: number;
  currentMarketAverage: number;
  appreciationPercent: number;
  
  // Metadata
  calculatedAt: string;
  calculationVersion: string;
}

/**
 * Calculate the estimated home value and equity.
 * 
 * The estimation logic:
 * 1. Normalize purchase price to market average at time of purchase (purchase_index)
 * 2. Apply index to current market average to get estimated value
 * 3. Apply volatility band based on current market phase
 * 4. Calculate remaining mortgage balance
 * 5. Calculate equity (value - mortgage)
 */
export function calculateEstimate(input: EstimateInput): EstimateResult {
  // Normalize input with defaults
  const purchaseMonth = input.purchaseMonth ?? 6;
  const downPaymentPercent =
    input.downPaymentPercent ?? MORTGAGE_DEFAULTS.defaultDownPaymentPercent;
  
  // Step 1: Get market average at time of purchase
  const marketAverageAtPurchase = getMarketAverage(input.purchaseYear, purchaseMonth);
  
  // Step 2: Calculate purchase index (how property compares to market)
  // A purchase index > 1 means the property was above market average
  // A purchase index < 1 means it was below average
  const purchaseIndex = input.purchasePrice / marketAverageAtPurchase;
  
  // Step 3: Apply index to current market average
  const currentMarketAverage = getCurrentMarketAverage();
  const estimatedValueMid = currentMarketAverage * purchaseIndex;
  
  // Step 4: Get market phase and apply volatility band
  const marketPhase = getMarketPhase();
  const { volatilityBand } = marketPhase;
  
  const estimatedValueLow = estimatedValueMid * (1 - volatilityBand);
  const estimatedValueHigh = estimatedValueMid * (1 + volatilityBand);
  
  // Step 5: Calculate mortgage details
  const mortgage = calculateMortgageDetails(
    input.purchasePrice,
    downPaymentPercent,
    input.purchaseYear,
    purchaseMonth
  );
  
  // Step 6: Calculate equity ranges
  const equityLow = estimatedValueLow - mortgage.remainingBalance;
  const equityMid = estimatedValueMid - mortgage.remainingBalance;
  const equityHigh = estimatedValueHigh - mortgage.remainingBalance;
  
  // Calculate appreciation percentage
  const appreciationPercent =
    ((estimatedValueMid - input.purchasePrice) / input.purchasePrice) * 100;
  
  return {
    input: {
      ...input,
      purchaseMonth,
      downPaymentPercent,
    },
    value: {
      low: Math.round(estimatedValueLow),
      mid: Math.round(estimatedValueMid),
      high: Math.round(estimatedValueHigh),
    },
    equity: {
      low: Math.round(equityLow),
      mid: Math.round(equityMid),
      high: Math.round(equityHigh),
    },
    mortgage: {
      ...mortgage,
      originalLoanAmount: Math.round(mortgage.originalLoanAmount),
      monthlyPayment: Math.round(mortgage.monthlyPayment),
      remainingBalance: Math.round(mortgage.remainingBalance),
      principalPaid: Math.round(mortgage.principalPaid),
      interestPaid: Math.round(mortgage.interestPaid),
    },
    marketPhase,
    purchaseIndex,
    marketAverageAtPurchase: Math.round(marketAverageAtPurchase),
    currentMarketAverage: Math.round(currentMarketAverage),
    appreciationPercent: Math.round(appreciationPercent * 10) / 10,
    calculatedAt: new Date().toISOString(),
    calculationVersion: '1.0',
  };
}

/**
 * Validate estimate input before calculation.
 */
export function validateEstimateInput(input: Partial<EstimateInput>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const currentYear = getCurrentYear();
  
  if (!input.address || input.address.trim().length === 0) {
    errors.address = 'Address is required';
  }
  
  if (!input.purchaseYear) {
    errors.purchaseYear = 'Purchase year is required';
  } else if (input.purchaseYear < 1950) {
    errors.purchaseYear = 'Purchase year must be 1950 or later';
  } else if (input.purchaseYear > currentYear) {
    errors.purchaseYear = `Purchase year cannot be in the future`;
  }
  
  if (!input.purchasePrice) {
    errors.purchasePrice = 'Purchase price is required';
  } else if (input.purchasePrice <= 0) {
    errors.purchasePrice = 'Purchase price must be greater than 0';
  } else if (input.purchasePrice > 100000000) {
    errors.purchasePrice = 'Purchase price seems too high. Please verify.';
  }
  
  if (input.downPaymentPercent !== undefined) {
    if (input.downPaymentPercent < 0) {
      errors.downPaymentPercent = 'Down payment cannot be negative';
    } else if (input.downPaymentPercent > 100) {
      errors.downPaymentPercent = 'Down payment cannot exceed 100%';
    }
  }
  
  if (input.purchaseMonth !== undefined) {
    if (input.purchaseMonth < 1 || input.purchaseMonth > 12) {
      errors.purchaseMonth = 'Month must be between 1 and 12';
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Format estimate result for storage in database.
 */
export function formatEstimateForStorage(
  result: EstimateResult,
  sessionId: string
) {
  return {
    session_id: sessionId,
    address: result.input.address,
    address_components: result.input.addressComponents,
    purchase_year: result.input.purchaseYear,
    purchase_month: result.input.purchaseMonth,
    purchase_price: result.input.purchasePrice,
    down_payment_percent: result.input.downPaymentPercent,
    estimated_value_low: result.value.low,
    estimated_value_mid: result.value.mid,
    estimated_value_high: result.value.high,
    estimated_equity_low: result.equity.low,
    estimated_equity_mid: result.equity.mid,
    estimated_equity_high: result.equity.high,
    remaining_mortgage: result.mortgage.remainingBalance,
    original_loan_amount: result.mortgage.originalLoanAmount,
    interest_rate_used: result.mortgage.interestRateUsed,
    market_phase: result.marketPhase.name,
    purchase_index: result.purchaseIndex,
    calculation_version: result.calculationVersion,
  };
}
