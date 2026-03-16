import type {
  BudgetMetric,
  SellBuyCalculatorFormValues,
  SellBuyCalculatorResults,
  UpgradeCostMetric,
} from '@/types/sell-buy-calculator';
import { calculateCommission } from '@/utils/calculators/commission';
import { calculateMortgagePaymentBreakdown } from '@/utils/calculators/mortgage';
import { calculateSaleProceeds } from '@/utils/calculators/sale-proceeds';
import { calculateLandTransferTax } from '@/utils/tax/land-transfer-tax';

function clampCurrency(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getMonthlyPropertyTaxes(annualPropertyTaxes: number): number {
  return clampCurrency(annualPropertyTaxes) / 12;
}

function resolveEquityToUse(
  strategy: SellBuyCalculatorFormValues['purchase']['equityStrategy'],
  availableNetCash: number,
  customEquityAmount: number,
  reserveAmount: number
): number {
  switch (strategy) {
    case 'custom':
      return Math.min(clampCurrency(customEquityAmount), availableNetCash);
    case 'reserve':
      return Math.max(0, availableNetCash - clampCurrency(reserveAmount));
    case 'all':
    default:
      return availableNetCash;
  }
}

function determineMoveType(
  salePrice: number,
  purchasePrice: number
): 'upsizing' | 'downsizing' | 'lateral move' {
  if (salePrice <= 0 || purchasePrice <= 0) {
    return 'lateral move';
  }

  const variance = Math.abs(purchasePrice - salePrice) / salePrice;

  if (variance <= 0.05) {
    return 'lateral move';
  }

  return purchasePrice > salePrice ? 'upsizing' : 'downsizing';
}

function calculateScenarioAtPrice(
  formValues: SellBuyCalculatorFormValues,
  equityToUse: number,
  purchasePrice: number
) {
  const landTransferTax = calculateLandTransferTax({
    province: formValues.purchase.province,
    city: formValues.purchase.city,
    purchasePrice,
  });
  const totalClosingCosts =
    landTransferTax.totalTax +
    clampCurrency(formValues.purchase.purchaseLegalFees) +
    clampCurrency(formValues.purchase.titleInsuranceAndAdjustments);
  const totalCashContribution =
    equityToUse + clampCurrency(formValues.purchase.additionalCashAdded);
  const totalMortgageNeeded = Math.max(
    0,
    purchasePrice + totalClosingCosts - totalCashContribution
  );
  const mortgagePayment = calculateMortgagePaymentBreakdown({
    financing: formValues.financing,
    totalMortgageNeeded,
  });
  const condoFeesMonthly = clampCurrency(formValues.purchase.condoFeesMonthly);
  const totalMonthlyHousingCost =
    mortgagePayment.monthlyEquivalentPayment +
    getMonthlyPropertyTaxes(formValues.purchase.propertyTaxesAnnual) +
    condoFeesMonthly;

  return {
    landTransferTax,
    totalClosingCosts,
    totalCashContribution,
    totalMortgageNeeded,
    monthlyMortgagePayment: mortgagePayment.monthlyEquivalentPayment,
    totalMonthlyHousingCost,
  };
}

function binarySearchMaxPurchasePrice({
  min = 100_000,
  max = 4_000_000,
  iterations = 32,
  predicate,
}: {
  min?: number;
  max?: number;
  iterations?: number;
  predicate: (candidate: number) => boolean;
}): number {
  let low = min;
  let high = max;
  let best = 0;

  for (let index = 0; index < iterations; index += 1) {
    const candidate = (low + high) / 2;

    if (predicate(candidate)) {
      best = candidate;
      low = candidate;
    } else {
      high = candidate;
    }
  }

  return Math.round(best / 1_000) * 1_000;
}

function calculateReserveBudgetMetrics(
  formValues: SellBuyCalculatorFormValues,
  netSaleProceeds: number
): BudgetMetric[] {
  const reserveLevels = [0, 25_000, 50_000, 100_000];

  return reserveLevels.map((reserve) => {
    const usableCash = Math.max(0, netSaleProceeds - reserve);

    return {
      label: reserve === 0 ? 'Use all equity' : `Keep ${reserve / 1_000}k reserve`,
      reserve,
      purchasePrice: binarySearchMaxPurchasePrice({
        predicate: (candidate) => {
          const landTransferTax = calculateLandTransferTax({
            province: formValues.purchase.province,
            city: formValues.purchase.city,
            purchasePrice: candidate,
          });
          const totalClosingCosts =
            landTransferTax.totalTax +
            clampCurrency(formValues.purchase.purchaseLegalFees) +
            clampCurrency(formValues.purchase.titleInsuranceAndAdjustments);
          const requiredCash = candidate * 0.2 + totalClosingCosts;

          return usableCash >= requiredCash;
        },
      }),
    };
  });
}

function calculateUpgradeCosts(
  formValues: SellBuyCalculatorFormValues,
  baseEquityToUse: number,
  purchasePrice: number,
  currentMonthlyHousingCost: number
): UpgradeCostMetric[] {
  const increments = [50_000, 100_000, 150_000];

  return increments.map((increment) => {
    const targetPrice = purchasePrice + increment;
    const scenario = calculateScenarioAtPrice(
      formValues,
      baseEquityToUse,
      targetPrice
    );

    return {
      label: `Upgrade by ${increment / 1_000}k`,
      targetPrice,
      monthlyHousingCost: scenario.totalMonthlyHousingCost,
      monthlyDifference: scenario.totalMonthlyHousingCost - currentMonthlyHousingCost,
    };
  });
}

export function calculateSellBuyScenario(
  formValues: SellBuyCalculatorFormValues
): SellBuyCalculatorResults {
  const commission = calculateCommission(
    formValues.currentHome.expectedSalePrice,
    formValues.currentHome.realtorCommissionPercent,
    formValues.currentHome.commissionIncludesHst
  );
  const sale = calculateSaleProceeds(formValues.currentHome, commission);
  const availableSaleProceeds = sale.totalNetCashFromSale;
  const amountOfEquityUsed = resolveEquityToUse(
    formValues.purchase.equityStrategy,
    availableSaleProceeds,
    formValues.purchase.customEquityAmount,
    formValues.purchase.reserveAmount
  );
  const equityLeftOverAfterClosing = Math.max(0, availableSaleProceeds - amountOfEquityUsed);
  const landTransferTax = calculateLandTransferTax({
    province: formValues.purchase.province,
    city: formValues.purchase.city,
    purchasePrice: formValues.purchase.purchasePrice,
  });
  const totalClosingCosts =
    landTransferTax.totalTax +
    clampCurrency(formValues.purchase.purchaseLegalFees) +
    clampCurrency(formValues.purchase.titleInsuranceAndAdjustments);
  const totalCashContribution =
    amountOfEquityUsed + clampCurrency(formValues.purchase.additionalCashAdded);
  const totalMortgageNeeded = Math.max(
    0,
    clampCurrency(formValues.purchase.purchasePrice) + totalClosingCosts - totalCashContribution
  );
  const mortgagePayment = calculateMortgagePaymentBreakdown({
    financing: formValues.financing,
    totalMortgageNeeded,
  });
  const condoFeesMonthly = clampCurrency(formValues.purchase.condoFeesMonthly);
  const totalMonthlyHousingCost =
    mortgagePayment.monthlyEquivalentPayment +
    getMonthlyPropertyTaxes(formValues.purchase.propertyTaxesAnnual) +
    condoFeesMonthly;
  const currentMonthlyPayment = clampCurrency(formValues.currentHome.currentMonthlyPayment);
  const monthlyPaymentDifference = mortgagePayment.monthlyEquivalentPayment - currentMonthlyPayment;
  const moveType = determineMoveType(
    formValues.currentHome.expectedSalePrice,
    formValues.purchase.purchasePrice
  );
  const reserveBudgetMetrics = calculateReserveBudgetMetrics(formValues, availableSaleProceeds);
  // Closing costs vary with purchase price, so affordability caps use a small binary search
  // instead of a fixed ratio. That keeps the Toronto MLTT and legal assumptions in the loop.
  const maxPurchasePriceSamePayment =
    currentMonthlyPayment > 0
      ? binarySearchMaxPurchasePrice({
          predicate: (candidate) => {
            const scenario = calculateScenarioAtPrice(
              formValues,
              amountOfEquityUsed,
              candidate
            );
            return scenario.monthlyMortgagePayment <= currentMonthlyPayment;
          },
        })
      : null;
  const upgradeCosts = calculateUpgradeCosts(
    formValues,
    amountOfEquityUsed,
    formValues.purchase.purchasePrice,
    totalMonthlyHousingCost
  );
  const recommendedSafeBudgetHigh = Math.min(
    reserveBudgetMetrics[1]?.purchasePrice ?? formValues.purchase.purchasePrice,
    maxPurchasePriceSamePayment ?? reserveBudgetMetrics[1]?.purchasePrice ?? formValues.purchase.purchasePrice
  );
  const recommendedSafeBudgetLow =
    reserveBudgetMetrics[2]?.purchasePrice ??
    reserveBudgetMetrics[1]?.purchasePrice ??
    formValues.purchase.purchasePrice;
  const warnings: string[] = [];

  if (
    formValues.purchase.equityStrategy === 'custom' &&
    clampCurrency(formValues.purchase.customEquityAmount) > availableSaleProceeds
  ) {
    warnings.push('Custom equity was capped at the net sale proceeds available after selling costs.');
  }

  if (totalMortgageNeeded > clampCurrency(formValues.purchase.purchasePrice)) {
    warnings.push(
      'The projected mortgage exceeds the purchase price because closing costs are not fully covered by your cash contribution.'
    );
  }

  if (totalCashContribution < totalClosingCosts) {
    warnings.push(
      'Your cash contribution does not fully cover estimated closing costs, so you may need additional funds at closing.'
    );
  }

  if (totalMonthlyHousingCost >= 10_000) {
    warnings.push(
      'The projected monthly housing cost is very high. Treat this as a planning estimate and confirm lender affordability before relying on it.'
    );
  }

  if (
    formValues.financing.mode === 'port' &&
    formValues.financing.portExistingMortgage &&
    clampCurrency(formValues.financing.portedMortgageBalance) > totalMortgageNeeded
  ) {
    warnings.push('The ported balance was reduced to match the projected mortgage requirement.');
  }

  if (formValues.purchase.purchasePrice > 2_000_000) {
    warnings.push(
      'Land transfer tax is modeled using Ontario and Toronto single-family residential brackets for homes above $2M.'
    );
  }

  return {
    commission,
    sale,
    purchase: {
      amountOfEquityUsed,
      equityLeftOverAfterClosing,
      availableSaleProceeds,
      totalCashContribution,
      totalCashRequiredToClose: totalCashContribution,
      totalMortgageNeeded,
      downPaymentAmount: totalCashContribution,
      downPaymentPercent:
        formValues.purchase.purchasePrice > 0
          ? (totalCashContribution / formValues.purchase.purchasePrice) * 100
          : 0,
      landTransferTax,
      legalFeesOnPurchase: clampCurrency(formValues.purchase.purchaseLegalFees),
      titleInsuranceAndAdjustments: clampCurrency(
        formValues.purchase.titleInsuranceAndAdjustments
      ),
      totalClosingCosts,
      cashRemainingAfterClose: equityLeftOverAfterClosing,
      estimatedBorrowingRequired: totalMortgageNeeded,
    },
    financing: {
      mortgagePayment,
      monthlyMortgagePayment: mortgagePayment.monthlyEquivalentPayment,
      totalMonthlyHousingCost,
      monthlyPaymentDifference,
      propertyTaxesMonthly: getMonthlyPropertyTaxes(formValues.purchase.propertyTaxesAnnual),
      condoFeesMonthly,
      loanToValueRatio:
        formValues.purchase.purchasePrice > 0
          ? (totalMortgageNeeded / formValues.purchase.purchasePrice) * 100
          : 0,
      mortgageChangeFromCurrent:
        totalMortgageNeeded - clampCurrency(formValues.currentHome.currentMortgageBalance),
      equityRetainedAfterMove: equityLeftOverAfterClosing,
    },
    insights: {
      moveType,
      moveUpCost:
        clampCurrency(formValues.purchase.purchasePrice) -
        clampCurrency(formValues.currentHome.expectedSalePrice),
      maxPurchasePriceSamePayment,
      maxPurchasePriceUsingAllEquity: reserveBudgetMetrics[0]?.purchasePrice ?? 0,
      maxPurchasePriceKeeping25kReserve: reserveBudgetMetrics[1]?.purchasePrice ?? 0,
      maxPurchasePriceKeeping50kReserve: reserveBudgetMetrics[2]?.purchasePrice ?? 0,
      maxPurchasePriceKeeping100kReserve: reserveBudgetMetrics[3]?.purchasePrice ?? 0,
      recommendedSafeBudgetLow,
      recommendedSafeBudgetHigh: Math.max(recommendedSafeBudgetLow, recommendedSafeBudgetHigh),
      upgradeCosts,
      reserveBudgetMetrics,
    },
    warnings,
  };
}
