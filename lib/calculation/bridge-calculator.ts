/**
 * Bridge Calculator
 * 
 * Calculates equity using a dual-era strategy:
 * - Era 1 (Pre-2012): Uses Revel Realty INC Historic Annual Average Prices
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
  MarketDataScope,
  MarketScenario,
  calculateHPIEquity,
  getCurrentHPI,
  getHPITrend,
  getBenchmarkPrice,
  getCurrentBenchmarkPrice,
  getCurrentMarketStats,
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
  toYear: number,
  priceScale = 1
): HPIDataPoint[] {
  const trend: HPIDataPoint[] = [];
  
  for (let year = fromYear; year <= toYear; year++) {
    if (HISTORIC_AVERAGES[year]) {
      const scaledPrice = HISTORIC_AVERAGES[year] * priceScale;
      trend.push({
        reportMonth: `${year}-06`, // Use June as midpoint
        // Keep synthetic trend points on the same scale as the synthetic current/purchase HPI values.
        hpiIndex: scaledPrice / 10000,
        benchmarkPrice: Math.round(scaledPrice),
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
  input: HPIEstimateInput,
  scope?: MarketDataScope
): Promise<BridgeEstimateResult | { error: string }> {
  const { region, propertyType, purchaseYear, purchaseMonth, purchasePrice } = input;
  
  console.log('[Bridge Calculator] Input:', { region, propertyType, purchaseYear, purchaseMonth, purchasePrice });
  
  const era = getDataEra(purchaseYear);
  console.log('[Bridge Calculator] Detected era:', era, '(HPI_START_YEAR:', HPI_START_YEAR, ')');
  
  // For HPI era (2012+), use the existing calculation
  if (era === 'hpi') {
    console.log('[Bridge Calculator] Using HPI calculation for 2012+ purchase');
    const hpiResult = await calculateHPIEquity(input, scope);
    
    if ('error' in hpiResult) {
      console.log('[Bridge Calculator] HPI calculation failed, falling back to historic:', hpiResult.error);
      // If HPI data not available, fall back to historic calculation
      return calculateHistoricEquity(input, scope);
    }
    
    console.log('[Bridge Calculator] HPI calculation successful');
    
    // Fetch regional benchmark prices in parallel
    const [benchmarkAtPurchaseResult, benchmarkCurrentResult, currentMarketStats] = await Promise.all([
      getBenchmarkPrice(region, propertyType, purchaseYear, purchaseMonth, scope),
      getCurrentBenchmarkPrice(region, propertyType, scope),
      getCurrentMarketStats(region, propertyType, scope),
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
      currentMarketStats: currentMarketStats ?? undefined,
    };
  }
  
  // For historic era (pre-2012), use historic averages
  console.log('[Bridge Calculator] Using historic calculation for pre-2012 purchase');
  return calculateHistoricEquity(input, scope);
}

/**
 * Calculate equity using historic annual averages
 */
async function calculateHistoricEquity(
  input: HPIEstimateInput,
  scope?: MarketDataScope
): Promise<BridgeEstimateResult | { error: string }> {
  const { region, propertyType, purchaseYear, purchaseMonth, purchasePrice } = input;
  
  console.log('[Historic Equity] Calculating for:', { purchaseYear, purchasePrice });
  
  // Get the historic average for the purchase year
  const purchaseAverage = getHistoricAverageWithFallback(purchaseYear);
  console.log('[Historic Equity] Purchase year average:', purchaseAverage);
  
  // Use the HPI handover year as a local benchmark anchor for pre-2012 purchases.
  const anchorAverage = getHistoricAverageWithFallback(HPI_START_YEAR);
  console.log('[Historic Equity] Anchor average (year', HPI_START_YEAR, '):', anchorAverage);

  // Get the current/latest average
  const currentAverage = getHistoricAverageWithFallback(LATEST_YEAR);
  console.log('[Historic Equity] Current average (year', LATEST_YEAR, '):', currentAverage);
  
  // Fetch regional benchmark prices in parallel with HPI trend.
  // For pre-2012 purchases, do not let the benchmark lookup walk forward and mislabel
  // the first 2012 benchmark as if it were the original purchase month.
  const [
    benchmarkAtPurchaseResult,
    benchmarkCurrentResult,
    benchmarkAtAnchorResult,
    hpiTrendRecent,
    currentMarketStats,
  ] = await Promise.all([
    getBenchmarkPrice(region, propertyType, purchaseYear, purchaseMonth, {
      workspaceId: scope?.workspaceId,
      allowFutureFallback: false,
    }),
    getCurrentBenchmarkPrice(region, propertyType, scope),
    getBenchmarkPrice(region, propertyType, HPI_START_YEAR, purchaseMonth, scope),
    getHPITrend(region, propertyType, HPI_START_YEAR, 1, scope).catch(() => []),
    getCurrentMarketStats(region, propertyType, scope),
  ]);
  
  console.log('[Historic Equity] Benchmark prices:', {
    atPurchase: benchmarkAtPurchaseResult,
    atAnchor: benchmarkAtAnchorResult,
    current: benchmarkCurrentResult,
  });

  const hasLocalAnchor = Boolean(benchmarkAtAnchorResult?.price && anchorAverage > 0);
  const localScale = hasLocalAnchor
    ? (benchmarkAtAnchorResult?.price ?? anchorAverage) / anchorAverage
    : 1;

  // Build a localized synthetic pre-2012 baseline; fallback remains GTA-wide if local
  // anchor data is unavailable.
  const localizedPurchaseBaseline = purchaseAverage * localScale;
  const fallbackCurrentBaseline = currentAverage * localScale;
  const currentBenchmarkEquivalent = benchmarkCurrentResult?.price ?? fallbackCurrentBaseline;
  const appreciationFactor = currentBenchmarkEquivalent / localizedPurchaseBaseline;
  console.log('[Historic Equity] Appreciation factor:', appreciationFactor);

  // Generate synthetic trend data after we know whether we can localize the historic series.
  let hpiTrend = generateHistoricTrend(purchaseYear, LATEST_YEAR, localScale);
  
  // Calculate estimated current value
  const estimatedCurrentValue = Math.round(purchasePrice * appreciationFactor);
  const equityGained = estimatedCurrentValue - purchasePrice;
  const roiPercent = Math.round((appreciationFactor - 1) * 100 * 10) / 10;
  
  // Merge recent benchmark points (converted to synthetic index scale) so the
  // series stays consistent with historic synthetic points.
  if (hpiTrendRecent.length > 0) {
    const mergedTrend = [...hpiTrend];
    for (const point of hpiTrendRecent) {
      const year = parseInt(point.reportMonth.split('-')[0], 10);
      if (year >= HPI_START_YEAR && point.benchmarkPrice !== null) {
        // Only add if we don't already have this year
        if (!mergedTrend.find(p => p.reportMonth.startsWith(point.reportMonth.substring(0, 4)))) {
          mergedTrend.push({
            reportMonth: point.reportMonth,
            hpiIndex: point.benchmarkPrice / 10000,
            benchmarkPrice: point.benchmarkPrice,
          });
        }
      }
    }
    // Sort by date
    mergedTrend.sort((a, b) => a.reportMonth.localeCompare(b.reportMonth));
    hpiTrend = mergedTrend;
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
  const syntheticLocalizedPurchase = localizedPurchaseBaseline / 10000;
  const syntheticHpiCurrent = currentBenchmarkEquivalent / 10000;
  const currentValueDate = benchmarkCurrentResult?.date
    ? benchmarkCurrentResult.date.slice(0, 7)
    : `${LATEST_YEAR}-12`;
  const usedMonthlyBridge = benchmarkCurrentResult?.price !== undefined;
  const usedLocalizedBridge = Boolean(
    benchmarkCurrentResult?.price !== undefined && benchmarkAtAnchorResult?.price !== undefined
  );
  
  return {
    input,
    hpiAtPurchase: usedLocalizedBridge ? syntheticLocalizedPurchase : syntheticHpiAtPurchase,
    hpiCurrent: syntheticHpiCurrent,
    hpiCurrentDate: currentValueDate,
    appreciationFactor: Math.round(appreciationFactor * 1000) / 1000,
    estimatedCurrentValue,
    equityGained,
    roiPercent,
    hpiTrend,
    calculatedAt: new Date().toISOString(),
    scenarios,
    dataEra: 'historic',
    dataSource: usedLocalizedBridge
      ? 'Revel Realty INC Local Benchmark Bridge + Historic Ratio Scaler'
      : usedMonthlyBridge
      ? 'Revel Realty INC Historic Annual Averages + Current Local Benchmark'
      : 'Revel Realty INC Historic Annual Averages',
    bridgeNote: purchaseYear < HPI_START_YEAR 
      ? usedLocalizedBridge
        ? `Using ${HPI_START_YEAR} local benchmark anchor to localize pre-${HPI_START_YEAR} values before mapping to the latest local benchmark.`
        : usedMonthlyBridge
        ? 'Using latest local benchmark with GTA historic ratio fallback because local handover anchor is unavailable.'
        : `Using synthetic index based on TRREB average price trends for years prior to ${HPI_START_YEAR}.`
      : undefined,
    // Regional benchmark prices
    benchmarkAtPurchase: benchmarkAtPurchaseResult?.price ?? null,
    benchmarkAtPurchaseDate: benchmarkAtPurchaseResult?.date ?? null,
    benchmarkCurrent: benchmarkCurrentResult?.price ?? null,
    benchmarkCurrentDate: benchmarkCurrentResult?.date ?? null,
    currentMarketStats: currentMarketStats ?? undefined,
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
    source: 'Revel Realty INC Historic Average',
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
