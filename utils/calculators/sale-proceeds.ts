import type {
  CommissionCalculation,
  CurrentHomeFormValues,
  SaleProceedsCalculation,
} from '@/types/sell-buy-calculator';

export function calculateSaleProceeds(
  values: CurrentHomeFormValues,
  commission: CommissionCalculation
): SaleProceedsCalculation {
  const grossSalePrice = Math.max(0, values.expectedSalePrice);
  const mortgagePayout = Math.max(0, values.currentMortgageBalance);
  const estimatedEquity = Math.max(0, values.estimatedCurrentValue - mortgagePayout);

  const totalSellingCosts =
    commission.totalCommission +
    Math.max(0, values.legalFeesOnSale) +
    Math.max(0, values.mortgageDischargeFee) +
    Math.max(0, values.mortgagePenalty);

  const netSaleProceeds = Math.max(0, grossSalePrice - mortgagePayout - totalSellingCosts);
  const totalNetCashFromSale = Math.max(
    0,
    netSaleProceeds - Math.max(0, values.bridgeFinancingEstimate)
  );

  return {
    estimatedEquity,
    grossSalePrice,
    mortgagePayout,
    totalSellingCosts,
    netSaleProceeds,
    totalNetCashFromSale,
  };
}
