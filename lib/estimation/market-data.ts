import marketData from '@/data/gta-market-averages.json';
import { MarketPhaseName, MARKET_PHASES } from '../constants';

export interface MonthlyMarketData {
  year: number;
  month: number;
  avgPrice: number;
  salesVolume?: number;
}

export interface MarketDataMetadata {
  source: string;
  lastUpdated: string;
  currentMarketPhase: MarketPhaseName;
  description?: string;
}

// Get all monthly data points
export function getMonthlyData(): MonthlyMarketData[] {
  return marketData.monthly as MonthlyMarketData[];
}

// Get metadata
export function getMarketMetadata(): MarketDataMetadata {
  return marketData.metadata as MarketDataMetadata;
}

// Get market average for a specific year and month
// Uses interpolation if exact month not available
export function getMarketAverage(year: number, month: number = 6): number {
  const data = getMonthlyData();
  
  // Find exact match first
  const exactMatch = data.find(d => d.year === year && d.month === month);
  if (exactMatch) {
    return exactMatch.avgPrice;
  }
  
  // Find closest data points in the same year
  const sameYearData = data.filter(d => d.year === year);
  if (sameYearData.length > 0) {
    // Find the closest month
    const closest = sameYearData.reduce((prev, curr) => {
      return Math.abs(curr.month - month) < Math.abs(prev.month - month) ? curr : prev;
    });
    return closest.avgPrice;
  }
  
  // Interpolate between years if no same-year data
  const sorted = [...data].sort((a, b) => {
    const dateA = a.year * 12 + a.month;
    const dateB = b.year * 12 + b.month;
    return dateA - dateB;
  });
  
  const targetDate = year * 12 + month;
  
  // Find surrounding data points
  let before: MonthlyMarketData | null = null;
  let after: MonthlyMarketData | null = null;
  
  for (const point of sorted) {
    const pointDate = point.year * 12 + point.month;
    if (pointDate <= targetDate) {
      before = point;
    }
    if (pointDate >= targetDate && !after) {
      after = point;
    }
  }
  
  // If we only have before or after, use that
  if (!before && after) return after.avgPrice;
  if (!after && before) return before.avgPrice;
  if (!before && !after) {
    throw new Error(`No market data available for ${year}-${month}`);
  }
  
  // Linear interpolation
  const beforeDate = before!.year * 12 + before!.month;
  const afterDate = after!.year * 12 + after!.month;
  const ratio = (targetDate - beforeDate) / (afterDate - beforeDate);
  
  return before!.avgPrice + (after!.avgPrice - before!.avgPrice) * ratio;
}

// Get the current (most recent) market average
export function getCurrentMarketAverage(): number {
  const data = getMonthlyData();
  
  // Find the most recent data point
  const sorted = [...data].sort((a, b) => {
    const dateA = a.year * 12 + a.month;
    const dateB = b.year * 12 + b.month;
    return dateB - dateA;
  });
  
  return sorted[0]?.avgPrice ?? 0;
}

// Get the current year's data or most recent available
export function getCurrentYear(): number {
  const data = getMonthlyData();
  const sorted = [...data].sort((a, b) => b.year - a.year);
  return sorted[0]?.year ?? new Date().getFullYear();
}

// Get the current market phase
export function getMarketPhase(): {
  name: MarketPhaseName;
  label: string;
  volatilityBand: number;
  description: string;
} {
  const metadata = getMarketMetadata();
  const phaseName = metadata.currentMarketPhase as MarketPhaseName;
  return MARKET_PHASES[phaseName] || MARKET_PHASES.balanced;
}

// Get historical interest rate for a given year
export function getHistoricalRate(year: number): number {
  const rates = marketData.historicalRates as Record<string, number>;
  
  // Direct match
  if (rates[year.toString()]) {
    return rates[year.toString()];
  }
  
  // Find closest year
  const years = Object.keys(rates).map(Number).sort((a, b) => a - b);
  
  // If before all data, use earliest
  if (year < years[0]) {
    return rates[years[0].toString()];
  }
  
  // If after all data, use latest
  if (year > years[years.length - 1]) {
    return rates[years[years.length - 1].toString()];
  }
  
  // Find surrounding years and interpolate
  let beforeYear = years[0];
  let afterYear = years[years.length - 1];
  
  for (const y of years) {
    if (y <= year) beforeYear = y;
    if (y >= year && !afterYear) afterYear = y;
  }
  
  if (beforeYear === afterYear) {
    return rates[beforeYear.toString()];
  }
  
  // Linear interpolation
  const beforeRate = rates[beforeYear.toString()];
  const afterRate = rates[afterYear.toString()];
  const ratio = (year - beforeYear) / (afterYear - beforeYear);
  
  return beforeRate + (afterRate - beforeRate) * ratio;
}

// Get market data for timeline chart (purchase year to current)
export function getMarketTimeline(purchaseYear: number): {
  year: number;
  month: number;
  avgPrice: number;
}[] {
  const data = getMonthlyData();
  const currentYear = getCurrentYear();
  
  return data
    .filter(d => d.year >= purchaseYear && d.year <= currentYear)
    .sort((a, b) => {
      const dateA = a.year * 12 + a.month;
      const dateB = b.year * 12 + b.month;
      return dateA - dateB;
    })
    .map(({ year, month, avgPrice }) => ({ year, month, avgPrice }));
}

// Calculate appreciation percentage from purchase to now
export function calculateAppreciation(purchaseYear: number, purchaseMonth: number = 6): number {
  const purchaseAvg = getMarketAverage(purchaseYear, purchaseMonth);
  const currentAvg = getCurrentMarketAverage();
  
  return ((currentAvg - purchaseAvg) / purchaseAvg) * 100;
}
