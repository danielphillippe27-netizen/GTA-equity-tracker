import type { LandTransferTaxBreakdown, ProvinceCode } from '@/types/sell-buy-calculator';

interface TaxBracket {
  threshold: number;
  rate: number;
}

interface TaxSchedule {
  effectiveFrom: string;
  brackets: TaxBracket[];
}

const ONTARIO_SINGLE_FAMILY_BRACKETS: TaxBracket[] = [
  { threshold: 55_000, rate: 0.005 },
  { threshold: 250_000, rate: 0.01 },
  { threshold: 400_000, rate: 0.015 },
  { threshold: 2_000_000, rate: 0.02 },
  { threshold: Number.POSITIVE_INFINITY, rate: 0.025 },
];

const TORONTO_SINGLE_FAMILY_SCHEDULES: TaxSchedule[] = [
  {
    effectiveFrom: '2023-09-06',
    brackets: [
      { threshold: 55_000, rate: 0.005 },
      { threshold: 250_000, rate: 0.01 },
      { threshold: 400_000, rate: 0.015 },
      { threshold: 2_000_000, rate: 0.02 },
      { threshold: 3_000_000, rate: 0.025 },
      { threshold: 4_000_000, rate: 0.035 },
      { threshold: 5_000_000, rate: 0.045 },
      { threshold: 10_000_000, rate: 0.055 },
      { threshold: 20_000_000, rate: 0.065 },
      { threshold: Number.POSITIVE_INFINITY, rate: 0.075 },
    ],
  },
  {
    effectiveFrom: '2026-04-01',
    brackets: [
      { threshold: 55_000, rate: 0.005 },
      { threshold: 250_000, rate: 0.01 },
      { threshold: 400_000, rate: 0.015 },
      { threshold: 2_000_000, rate: 0.02 },
      { threshold: 3_000_000, rate: 0.025 },
      { threshold: 4_000_000, rate: 0.044 },
      { threshold: 5_000_000, rate: 0.0545 },
      { threshold: 10_000_000, rate: 0.065 },
      { threshold: 20_000_000, rate: 0.0755 },
      { threshold: Number.POSITIVE_INFINITY, rate: 0.086 },
    ],
  },
];

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
}

function getApplicableTorontoSchedule(date: Date): TaxSchedule {
  const sortedSchedules = [...TORONTO_SINGLE_FAMILY_SCHEDULES].sort((left, right) =>
    left.effectiveFrom.localeCompare(right.effectiveFrom)
  );

  let schedule = sortedSchedules[0];

  // Toronto has date-based rate tables, so the calculator picks the latest
  // schedule that is already in effect on the calculation date.
  for (const candidate of sortedSchedules) {
    if (date >= new Date(`${candidate.effectiveFrom}T00:00:00`)) {
      schedule = candidate;
    }
  }

  return schedule;
}

function calculateBracketTax(amount: number, brackets: TaxBracket[]): number {
  const sanitizedAmount = Math.max(0, amount);

  let total = 0;
  let previousThreshold = 0;

  for (const bracket of brackets) {
    if (sanitizedAmount <= previousThreshold) {
      break;
    }

    const taxableAmount = Math.min(sanitizedAmount, bracket.threshold) - previousThreshold;

    if (taxableAmount > 0) {
      total += taxableAmount * bracket.rate;
    }

    previousThreshold = bracket.threshold;
  }

  return total;
}

export function calculateLandTransferTax({
  province,
  city,
  purchasePrice,
  calculationDate = new Date(),
}: {
  province: ProvinceCode;
  city: string;
  purchasePrice: number;
  calculationDate?: Date;
}): LandTransferTaxBreakdown {
  const sanitizedPrice = Math.max(0, purchasePrice);
  const provincialTax = calculateBracketTax(sanitizedPrice, ONTARIO_SINGLE_FAMILY_BRACKETS);
  const appliesTorontoTax = province === 'ON' && normalizeCity(city) === 'toronto';
  const torontoSchedule = getApplicableTorontoSchedule(calculationDate);
  const municipalTax = appliesTorontoTax
    ? calculateBracketTax(sanitizedPrice, torontoSchedule.brackets)
    : 0;

  return {
    province,
    city,
    propertyClass: 'single-family',
    provincialTax,
    municipalTax,
    totalTax: provincialTax + municipalTax,
    appliesTorontoTax,
    effectiveDate: appliesTorontoTax ? torontoSchedule.effectiveFrom : '2017-01-01',
  };
}
