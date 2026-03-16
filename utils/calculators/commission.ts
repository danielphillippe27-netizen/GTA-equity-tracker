import type { CommissionCalculation } from '@/types/sell-buy-calculator';

const DEFAULT_HST_RATE = 0.13;

export function calculateCommission(
  salePrice: number,
  commissionPercent: number,
  includesHst: boolean,
  hstRate: number = DEFAULT_HST_RATE
): CommissionCalculation {
  const sanitizedSalePrice = Math.max(0, salePrice);
  const sanitizedCommissionPercent = Math.max(0, commissionPercent);
  const commissionValue = sanitizedSalePrice * (sanitizedCommissionPercent / 100);

  if (includesHst) {
    const baseCommission = commissionValue / (1 + hstRate);
    const hstAmount = commissionValue - baseCommission;

    return {
      baseCommission,
      hstAmount,
      totalCommission: commissionValue,
    };
  }

  const hstAmount = commissionValue * hstRate;

  return {
    baseCommission: commissionValue,
    hstAmount,
    totalCommission: commissionValue + hstAmount,
  };
}
