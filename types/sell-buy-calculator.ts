export type ProvinceCode = 'ON';

export type EquityStrategy = 'all' | 'custom' | 'reserve';

export type MortgageMode = 'simple' | 'port';

export type PaymentFrequency = 'monthly' | 'bi-weekly' | 'weekly';

export interface CurrentHomeFormValues {
  estimatedCurrentValue: number;
  expectedSalePrice: number;
  currentMortgageBalance: number;
  currentInterestRate: number;
  currentMonthlyPayment: number;
  realtorCommissionPercent: number;
  commissionIncludesHst: boolean;
  legalFeesOnSale: number;
  mortgageDischargeFee: number;
  mortgagePenalty: number;
  bridgeFinancingEstimate: number;
}

export interface PurchaseFormValues {
  purchasePrice: number;
  province: ProvinceCode;
  city: string;
  propertyTaxesAnnual: number;
  condoFeesMonthly: number;
  purchaseLegalFees: number;
  titleInsuranceAndAdjustments: number;
  additionalCashAdded: number;
  equityStrategy: EquityStrategy;
  customEquityAmount: number;
  reserveAmount: number;
}

export interface FinancingFormValues {
  mode: MortgageMode;
  simpleInterestRate: number;
  amortizationYears: number;
  paymentFrequency: PaymentFrequency;
  portExistingMortgage: boolean;
  portedMortgageBalance: number;
  portedInterestRate: number;
  topUpInterestRate: number;
  manualBlendedRate: number;
}

export interface SellBuyCalculatorFormValues {
  currentHome: CurrentHomeFormValues;
  purchase: PurchaseFormValues;
  financing: FinancingFormValues;
}

export interface CommissionCalculation {
  baseCommission: number;
  hstAmount: number;
  totalCommission: number;
}

export interface SaleProceedsCalculation {
  estimatedEquity: number;
  grossSalePrice: number;
  mortgagePayout: number;
  totalSellingCosts: number;
  netSaleProceeds: number;
  totalNetCashFromSale: number;
}

export interface LandTransferTaxBreakdown {
  province: ProvinceCode;
  city: string;
  propertyClass: 'single-family';
  provincialTax: number;
  municipalTax: number;
  totalTax: number;
  appliesTorontoTax: boolean;
  effectiveDate: string;
}

export interface MortgagePaymentBreakdown {
  paymentFrequency: PaymentFrequency;
  paymentsPerYear: number;
  monthlyEquivalentPayment: number;
  scheduledPayment: number;
  totalMortgageNeeded: number;
  effectiveRate: number;
  mode: MortgageMode;
  portedPayment: number;
  topUpPayment: number;
  portedBalanceUsed: number;
  topUpAmount: number;
}

export interface BudgetMetric {
  label: string;
  purchasePrice: number;
  reserve: number;
}

export interface UpgradeCostMetric {
  label: string;
  targetPrice: number;
  monthlyHousingCost: number;
  monthlyDifference: number;
}

export interface SellBuyCalculatorResults {
  commission: CommissionCalculation;
  sale: SaleProceedsCalculation;
  purchase: {
    amountOfEquityUsed: number;
    equityLeftOverAfterClosing: number;
    availableSaleProceeds: number;
    totalCashContribution: number;
    totalCashRequiredToClose: number;
    totalMortgageNeeded: number;
    downPaymentAmount: number;
    downPaymentPercent: number;
    landTransferTax: LandTransferTaxBreakdown;
    legalFeesOnPurchase: number;
    titleInsuranceAndAdjustments: number;
    totalClosingCosts: number;
    cashRemainingAfterClose: number;
    estimatedBorrowingRequired: number;
  };
  financing: {
    mortgagePayment: MortgagePaymentBreakdown;
    monthlyMortgagePayment: number;
    totalMonthlyHousingCost: number;
    monthlyPaymentDifference: number;
    propertyTaxesMonthly: number;
    condoFeesMonthly: number;
    loanToValueRatio: number;
    mortgageChangeFromCurrent: number;
    equityRetainedAfterMove: number;
  };
  insights: {
    moveType: 'upsizing' | 'downsizing' | 'lateral move';
    moveUpCost: number;
    maxPurchasePriceSamePayment: number | null;
    maxPurchasePriceUsingAllEquity: number;
    maxPurchasePriceKeeping25kReserve: number;
    maxPurchasePriceKeeping50kReserve: number;
    maxPurchasePriceKeeping100kReserve: number;
    recommendedSafeBudgetLow: number;
    recommendedSafeBudgetHigh: number;
    upgradeCosts: UpgradeCostMetric[];
    reserveBudgetMetrics: BudgetMetric[];
  };
  warnings: string[];
}
