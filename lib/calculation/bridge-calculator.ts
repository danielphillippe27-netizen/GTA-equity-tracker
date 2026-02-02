/**
 * Bridge Calculator
 * 
 * Calculates equity using a dual-era strategy:
 * - Era 1 (Pre-2012): Uses TRREB Historic Annual Average Prices
 * - Era 2 (2012-Present): Uses HPI Index data from Supabase
 * 
 * This allows accurate equity calculations for properties purchased
 * before HPI data became available.
 */

import {
  HISTORIC_AVERAGES,
  HPI_START_YEAR,
  getHistoricAverageWithFallback,
  getDataEra,
  LATEST_YEAR,
} from '@/src/data/historic-averages';
import {
  HPIEstimateInput,
  HPIEstimateResult,
  HPIDataPoint,
  MarketScenario,
  calculateHPIEquity,
  getCurrentHPI,
  getHPITrend,
  getBenchmarkPrice,
  getCurrentBenchmarkPrice,
} from '@/lib/estimation/hpi';

// Extended result type with data era information
export interface BridgeEstimateResult extends HPIEstimateResult {
  dataEra: 'historic' | 'hpi';
  dataSource: string;
  bridgeNote?: string;
  // Regional benchmark prices from market_hpi table
  benchmarkAtPurchase: number | null;
  benchmarkAtPurchaseDate: string | null;
  benchmarkCurrent: number | null;
  benchmarkCurrentDate: string | null;
}

// Market scenario adjustments
const MARKET_ADJUSTMENTS = {
  hot: { adjustment: 4, label: 'If Market Heats Up' },
  balanced: { adjustment: 0, label: 'Current Estimate' },
  soft: { adjustment: -8, label: 'If Market Softens' },
} as const;

/**
 * Calculate scenario value and equity
 */
function calculateScenario(
  baseValue: number,
  purchasePrice: number,
  adjustment: number,
  label: string
): MarketScenario {
  const multiplier = 1 + adjustment / 100;
  const value = Math.round(baseValue * multiplier);
  const equity = value - purchasePrice;
  return { value, equity, adjustment, label };
}

/**
 * Generate synthetic HPI trend data from historic averages
 * for purchases before 2012
 */
function generateHistoricTrend(
  fromYear: number,
  toYear: number
): HPIDataPoint[] {
  const trend: HPIDataPoint[] = [];
  
  for (let year = fromYear; year <= toYear; year++) {
    if (HISTORIC_AVERAGES[year]) {
      trend.push({
        reportMonth: `${year}-06`, // Use June as midpoint
        hpiIndex: HISTORIC_AVERAGES[year] / 1000, // Normalize to index-like scale
        benchmarkPrice: HISTORIC_AVERAGES[year],
      });
    }
  }
  
  return trend;
}

/**
 * Calculate equity using the bridge strategy
 * 
 * For pre-2012 purchases:
 * 1. Get the historic average for the purchase year
 * 2. Get the current year's average (or latest available)
 * 3. Calculate appreciation based on the ratio
 * 
 * For 2012+ purchases:
 * - Delegate to the existing HPI calculation
 */
export async function calculateEquityBridge(
  input: HPIEstimateInput
): Promise<BridgeEstimateResult | { error: string }> {
  const { region, propertyType, purchaseYear, purchaseMonth, purchasePrice } = input;
  
  console.log('[Bridge Calculator] Input:', { region, propertyType, purchaseYear, purchaseMonth, purchasePrice });
  
  const era = getDataEra(purchaseYear);
  console.log('[Bridge Calculator] Detected era:', era, '(HPI_START_YEAR:', HPI_START_YEAR, ')');
  
  // For HPI era (2012+), use the existing calculation
  if (era === 'hpi') {
    console.log('[Bridge Calculator] Using HPI calculation for 2012+ purchase');
    const hpiResult = await calculateHPIEquity(input);
    
    if ('error' in hpiResult) {
      console.log('[Bridge Calculator] HPI calculation failed, falling back to historic:', hpiResult.error);
      // If HPI data not available, fall back to historic calculation
      return calculateHistoricEquity(input);
    }
    
    console.log('[Bridge Calculator] HPI calculation successful');
    
    // Fetch regional benchmark prices in parallel
    const [benchmarkAtPurchaseResult, benchmarkCurrentResult] = await Promise.all([
      getBenchmarkPrice(region, propertyType, purchaseYear, purchaseMonth),
      getCurrentBenchmarkPrice(region, propertyType),
    ]);
    
    console.log('[Bridge Calculator] Benchmark prices:', {
      atPurchase: benchmarkAtPurchaseResult,
      current: benchmarkCurrentResult,
    });
    
    return {
      ...hpiResult,
      // Use real HPI values from hpiResult (don't override)
      dataEra: 'hpi',
      dataSource: 'TRREB HPI Index',
      // Regional benchmark prices
      benchmarkAtPurchase: benchmarkAtPurchaseResult?.price ?? null,
      benchmarkAtPurchaseDate: benchmarkAtPurchaseResult?.date ?? null,
      benchmarkCurrent: benchmarkCurrentResult?.price ?? null,
      benchmarkCurrentDate: benchmarkCurrentResult?.date ?? null,
    };
  }
  
  // For historic era (pre-2012), use historic averages
  console.log('[Bridge Calculator] Using historic calculation for pre-2012 purchase');
  return calculateHistoricEquity(input);
}

/**
 * Calculate equity using historic annual averages
 */
async function calculateHistoricEquity(
  input: HPIEstimateInput
): Promise<BridgeEstimateResult | { error: string }> {
  const { region, propertyType, purchaseYear, purchaseMonth, purchasePrice } = input;
  
  console.log('[Historic Equity] Calculating for:', { purchaseYear, purchasePrice });
  
  // Get the historic average for the purchase year
  const purchaseAverage = getHistoricAverageWithFallback(purchaseYear);
  console.log('[Historic Equity] Purchase year average:', purchaseAverage);
  
  // Get the current/latest average
  const currentAverage = getHistoricAverageWithFallback(LATEST_YEAR);
  console.log('[Historic Equity] Current average (year', LATEST_YEAR, '):', currentAverage);
  
  // Calculate the appreciation factor
  const appreciationFactor = currentAverage / purchaseAverage;
  console.log('[Historic Equity] Appreciation factor:', appreciationFactor);
  
  // Calculate estimated current value
  const estimatedCurrentValue = Math.round(purchasePrice * appreciationFactor);
  const equityGained = estimatedCurrentValue - purchasePrice;
  const roiPercent = Math.round((appreciationFactor - 1) * 100 * 10) / 10;
  
  // Generate synthetic trend data
  const hpiTrend = generateHistoricTrend(purchaseYear, LATEST_YEAR);
  
  // Fetch regional benchmark prices in parallel with HPI trend
  const [benchmarkAtPurchaseResult, benchmarkCurrentResult, hpiTrendRecent] = await Promise.all([
    getBenchmarkPrice(region, propertyType, purchaseYear, purchaseMonth),
    getCurrentBenchmarkPrice(region, propertyType),
    getHPITrend(region, propertyType, HPI_START_YEAR, 1).catch(() => []),
  ]);
  
  console.log('[Historic Equity] Benchmark prices:', {
    atPurchase: benchmarkAtPurchaseResult,
    current: benchmarkCurrentResult,
  });
  
  // Merge historic and HPI trends if we have recent data
  if (hpiTrendRecent.length > 0) {
    const mergedTrend = [...hpiTrend];
    for (const point of hpiTrendRecent) {
      const year = parseInt(point.reportMonth.split('-')[0], 10);
      if (year >= HPI_START_YEAR) {
        // Only add if we don't already have this year
        if (!mergedTrend.find(p => p.reportMonth.startsWith(point.reportMonth.substring(0, 4)))) {
          mergedTrend.push(point);
        }
      }
    }
    // Sort by date
    mergedTrend.sort((a, b) => a.reportMonth.localeCompare(b.reportMonth));
  }
  
  // Calculate market scenarios
  const scenarios = {
    hot: calculateScenario(
      estimatedCurrentValue,
      purchasePrice,
      MARKET_ADJUSTMENTS.hot.adjustment,
      MARKET_ADJUSTMENTS.hot.label
    ),
    balanced: calculateScenario(
      estimatedCurrentValue,
      purchasePrice,
      MARKET_ADJUSTMENTS.balanced.adjustment,
      MARKET_ADJUSTMENTS.balanced.label
    ),
    soft: calculateScenario(
      estimatedCurrentValue,
      purchasePrice,
      MARKET_ADJUSTMENTS.soft.adjustment,
      MARKET_ADJUSTMENTS.soft.label
    ),
  };
  
  // Create synthetic HPI values for display
  const syntheticHpiAtPurchase = purchaseAverage / 10000; // Normalize to ~index scale
  const syntheticHpiCurrent = currentAverage / 10000;
  
  return {
    input,
    hpiAtPurchase: syntheticHpiAtPurchase,
    hpiCurrent: syntheticHpiCurrent,
    hpiCurrentDate: `${LATEST_YEAR}-12`,
    appreciationFactor: Math.round(appreciationFactor * 1000) / 1000,
    estimatedCurrentValue,
    equityGained,
    roiPercent,
    hpiTrend,
    calculatedAt: new Date().toISOString(),
    scenarios,
    dataEra: 'historic',
    dataSource: 'TRREB Historic Annual Averages',
    bridgeNote: purchaseYear < HPI_START_YEAR 
      ? `Using synthetic index based on TRREB average price trends for years prior to ${HPI_START_YEAR}.`
      : undefined,
    // Regional benchmark prices
    benchmarkAtPurchase: benchmarkAtPurchaseResult?.price ?? null,
    benchmarkAtPurchaseDate: benchmarkAtPurchaseResult?.date ?? null,
    benchmarkCurrent: benchmarkCurrentResult?.price ?? null,
    benchmarkCurrentDate: benchmarkCurrentResult?.date ?? null,
  };
}

/**
 * Get the current market benchmark from either HPI or historic data
 */
export async function getCurrentBenchmark(
  region: string,
  propertyType: string
): Promise<{ price: number; date: string; source: string } | null> {
  // First, try to get current HPI benchmark
  const currentHPI = await getCurrentHPI(region, propertyType);
  
  if (currentHPI) {
    return {
      price: currentHPI.hpi * 10000, // Convert index to approximate price
      date: currentHPI.date,
      source: 'HPI Index',
    };
  }
  
  // Fall back to historic averages
  const currentAverage = getHistoricAverageWithFallback(LATEST_YEAR);
  return {
    price: currentAverage,
    date: `${LATEST_YEAR}-12`,
    source: 'TRREB Historic Average',
  };
}

/**
 * Validate if we have data for a given year
 */
export function hasDataForYear(year: number): boolean {
  return year >= 1980 && year <= LATEST_YEAR;
}

/**
 * Get the data era label for display
 */
export function getDataEraLabel(year: number): string {
  const era = getDataEra(year);
  if (era === 'historic') {
    return 'Historic TRREB Averages';
  }
  return 'TRREB HPI Index';
}
