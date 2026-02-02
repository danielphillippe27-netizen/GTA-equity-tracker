/**
 * HPI (Home Price Index) calculation functions
 * Uses Supabase to fetch HPI data and calculate equity estimates
 */

import { createServerClient } from '@/lib/supabase/server';
import { getLookupKeys } from '@/lib/district-mapping';

// Types
export interface HPIDataPoint {
  reportMonth: string;
  hpiIndex: number;
  benchmarkPrice: number | null;
}

export interface HPIEstimateInput {
  region: string;
  propertyType: string;
  purchaseYear: number;
  purchaseMonth: number;
  purchasePrice: number;
}

export interface MarketScenario {
  value: number;
  equity: number;
  adjustment: number; // percentage adjustment (e.g., 4 for +4%, -8 for -8%)
  label: string;
}

export interface HPIEstimateResult {
  input: HPIEstimateInput;
  hpiAtPurchase: number;
  hpiCurrent: number;
  hpiCurrentDate: string;
  appreciationFactor: number;
  estimatedCurrentValue: number;
  equityGained: number;
  roiPercent: number;
  hpiTrend: HPIDataPoint[];
  calculatedAt: string;
  // Market scenarios
  scenarios: {
    hot: MarketScenario;
    balanced: MarketScenario;
    soft: MarketScenario;
  };
}

/**
 * Format year and month into 'YYYY-MM' string
 */
function formatReportMonth(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Get HPI index for a specific region, property type, and date
 */
export async function getHPI(
  areaName: string,
  propertyCategory: string,
  year: number,
  month: number
): Promise<number | null> {
  const supabase = createServerClient();
  const reportMonth = formatReportMonth(year, month);

  const { data, error } = await supabase
    .from('market_hpi')
    .select('hpi_index')
    .eq('area_name', areaName)
    .eq('property_category', propertyCategory)
    .eq('report_month', reportMonth)
    .single();

  if (error || !data) {
    // Try to find the closest available month
    const { data: closest, error: closestError } = await supabase
      .from('market_hpi')
      .select('hpi_index, report_month')
      .eq('area_name', areaName)
      .eq('property_category', propertyCategory)
      .lte('report_month', reportMonth)
      .order('report_month', { ascending: false })
      .limit(1)
      .single();

    if (closestError || !closest) {
      return null;
    }

    return closest.hpi_index;
  }

  return data.hpi_index;
}

/**
 * Get the most recent HPI index for a region and property type
 */
export async function getCurrentHPI(
  areaName: string,
  propertyCategory: string
): Promise<{ hpi: number; date: string } | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('market_hpi')
    .select('hpi_index, report_month')
    .eq('area_name', areaName)
    .eq('property_category', propertyCategory)
    .order('report_month', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    hpi: data.hpi_index,
    date: data.report_month,
  };
}

// Cache for getCurrentBenchmarkPrice - "current" is the same for any region/category combo
const currentBenchmarkCache = new Map<string, { price: number; date: string }>();

/**
 * Get benchmark price for a specific region, property type, and date
 * Uses district mapping to query both modern names and historic district codes
 * Falls back to nearest prior month, then nearest future month if exact match not found
 */
export async function getBenchmarkPrice(
  areaName: string,
  propertyCategory: string,
  year: number,
  month: number
): Promise<{ price: number; date: string } | null> {
  const supabase = createServerClient();
  const reportMonth = formatReportMonth(year, month);
  
  // Get all possible names for this area (modern + historic codes)
  const lookupKeys = getLookupKeys(areaName);
  
  console.log('[getBenchmarkPrice] Looking up:', { areaName, lookupKeys, propertyCategory, reportMonth });
  
  // Try exact match first
  const { data: exactMatch } = await supabase
    .from('market_hpi')
    .select('benchmark_price, report_month')
    .in('area_name', lookupKeys)
    .eq('property_category', propertyCategory)
    .eq('report_month', reportMonth)
    .not('benchmark_price', 'is', null)
    .limit(1)
    .single();
  
  if (exactMatch?.benchmark_price) {
    console.log('[getBenchmarkPrice] Found exact match:', exactMatch);
    return {
      price: Number(exactMatch.benchmark_price),
      date: exactMatch.report_month,
    };
  }
  
  // Try nearest prior month
  const { data: priorMatch } = await supabase
    .from('market_hpi')
    .select('benchmark_price, report_month')
    .in('area_name', lookupKeys)
    .eq('property_category', propertyCategory)
    .lte('report_month', reportMonth)
    .not('benchmark_price', 'is', null)
    .order('report_month', { ascending: false })
    .limit(1)
    .single();
  
  if (priorMatch?.benchmark_price) {
    console.log('[getBenchmarkPrice] Found prior match:', priorMatch);
    return {
      price: Number(priorMatch.benchmark_price),
      date: priorMatch.report_month,
    };
  }
  
  // Try nearest future month as last resort
  const { data: futureMatch } = await supabase
    .from('market_hpi')
    .select('benchmark_price, report_month')
    .in('area_name', lookupKeys)
    .eq('property_category', propertyCategory)
    .gte('report_month', reportMonth)
    .not('benchmark_price', 'is', null)
    .order('report_month', { ascending: true })
    .limit(1)
    .single();
  
  if (futureMatch?.benchmark_price) {
    console.log('[getBenchmarkPrice] Found future match:', futureMatch);
    return {
      price: Number(futureMatch.benchmark_price),
      date: futureMatch.report_month,
    };
  }
  
  console.log('[getBenchmarkPrice] No benchmark data found for:', { areaName, propertyCategory, reportMonth });
  return null;
}

/**
 * Get the most recent benchmark price for a region and property type
 * Results are cached since "current" doesn't change during a request cycle
 */
export async function getCurrentBenchmarkPrice(
  areaName: string,
  propertyCategory: string
): Promise<{ price: number; date: string } | null> {
  // Check cache first
  const cacheKey = `${areaName}:${propertyCategory}`;
  if (currentBenchmarkCache.has(cacheKey)) {
    console.log('[getCurrentBenchmarkPrice] Cache hit:', cacheKey);
    return currentBenchmarkCache.get(cacheKey)!;
  }
  
  const supabase = createServerClient();
  
  // Get all possible names for this area (modern + historic codes)
  const lookupKeys = getLookupKeys(areaName);
  
  console.log('[getCurrentBenchmarkPrice] Looking up:', { areaName, lookupKeys, propertyCategory });
  
  const { data, error } = await supabase
    .from('market_hpi')
    .select('benchmark_price, report_month')
    .in('area_name', lookupKeys)
    .eq('property_category', propertyCategory)
    .not('benchmark_price', 'is', null)
    .order('report_month', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data?.benchmark_price) {
    console.log('[getCurrentBenchmarkPrice] No data found:', { error, data });
    return null;
  }
  
  const result = {
    price: Number(data.benchmark_price),
    date: data.report_month,
  };
  
  // Cache the result
  currentBenchmarkCache.set(cacheKey, result);
  console.log('[getCurrentBenchmarkPrice] Found and cached:', result);
  
  return result;
}

/**
 * Clear the current benchmark cache (useful for testing or long-running processes)
 */
export function clearBenchmarkCache(): void {
  currentBenchmarkCache.clear();
}

/**
 * Get HPI trend data from a starting date to the most recent available
 */
export async function getHPITrend(
  areaName: string,
  propertyCategory: string,
  fromYear: number,
  fromMonth: number
): Promise<HPIDataPoint[]> {
  const supabase = createServerClient();
  const fromReportMonth = formatReportMonth(fromYear, fromMonth);

  const { data, error } = await supabase
    .from('market_hpi')
    .select('report_month, hpi_index, benchmark_price')
    .eq('area_name', areaName)
    .eq('property_category', propertyCategory)
    .gte('report_month', fromReportMonth)
    .order('report_month', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    reportMonth: row.report_month,
    hpiIndex: row.hpi_index,
    benchmarkPrice: row.benchmark_price,
  }));
}

// Known valid GTA regions (for validation and fallback)
// Organized by region with Durham first
const VALID_GTA_REGIONS = [
  // Durham Region
  'Ajax',
  'Brock',
  'Clarington',
  'Oshawa',
  'Pickering',
  'Scugog',
  'Uxbridge',
  'Whitby',
  // Halton Region
  'Burlington',
  'Halton Hills',
  'Milton',
  'Oakville',
  // Peel Region
  'Brampton',
  'Caledon',
  'Mississauga',
  // Toronto West
  'Toronto W01',
  'Toronto W02',
  'Toronto W03',
  'Toronto W04',
  'Toronto W05',
  'Toronto W06',
  'Toronto W07',
  'Toronto W08',
  'Toronto W09',
  'Toronto W10',
  // Toronto Central
  'Toronto C01',
  'Toronto C02',
  'Toronto C03',
  'Toronto C04',
  'Toronto C06',
  'Toronto C07',
  'Toronto C08',
  'Toronto C09',
  'Toronto C10',
  'Toronto C11',
  'Toronto C12',
  'Toronto C13',
  'Toronto C14',
  'Toronto C15',
  // Toronto East
  'Toronto E01',
  'Toronto E02',
  'Toronto E03',
  'Toronto E04',
  'Toronto E05',
  'Toronto E06',
  'Toronto E07',
  'Toronto E08',
  'Toronto E09',
  'Toronto E10',
  'Toronto E11',
  // York Region
  'Aurora',
  'East Gwillimbury',
  'Georgina',
  'King',
  'Markham',
  'Newmarket',
  'Richmond Hill',
  'Vaughan',
  'Whitchurch-Stouffville',
  // Dufferin County
  'Orangeville',
  // Simcoe County
  'Adjala-Tosorontio',
  'Bradford West Gwillimbury',
  'Essa',
  'Innisfil',
  'New Tecumseth',
];

// Create a Set for fast lookup
const VALID_REGIONS_SET = new Set(VALID_GTA_REGIONS.map(r => r.toLowerCase()));

// Valid property categories for display (canonical names)
const VALID_PROPERTY_TYPES = [
  'Detached',
  'Semi-Detached',
  'Townhouse',
  'Condo Apt',
  'Condo Townhouse',
  'Link',
];

// Create a Set for fast lookup (including variations)
const VALID_PROPERTY_TYPES_SET = new Set([
  'detached',
  'semi-detached',
  'semi-detached',
  'townhouse',
  'att/row/twnhouse',
  'condo apt',
  'condo apartment',
  'condo townhouse',
  'co-op apt',
  'link',
  'det condo',
]);

// Normalized display names for property types
const PROPERTY_TYPE_DISPLAY: Record<string, string> = {
  'Semi-detached': 'Semi-Detached',
  'Att/Row/Twnhouse': 'Townhouse',
  'Condo Apartment': 'Condo Apt',
};

/**
 * Check if a string is a valid region name using whitelist
 */
function isValidRegionName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  // Use whitelist - only accept known valid regions
  return VALID_REGIONS_SET.has(name.toLowerCase());
}

/**
 * Get all available regions
 * Returns the full list of valid GTA regions (not filtered by database)
 */
export async function getAvailableRegions(): Promise<string[]> {
  // Always return the full list of valid regions
  // This ensures all communities show up even if they don't have HPI data yet
  return VALID_GTA_REGIONS;
}

/**
 * Get all available property types
 * Returns the full list of valid property types (not filtered by database)
 */
export async function getAvailablePropertyTypes(): Promise<string[]> {
  // Always return the full list of valid property types
  // This ensures all types show up even if they don't have HPI data yet
  return VALID_PROPERTY_TYPES;
}

/**
 * Get the date range of available HPI data for a region/property type
 */
export async function getHPIDateRange(
  areaName: string,
  propertyCategory: string
): Promise<{ earliest: string; latest: string } | null> {
  const supabase = createServerClient();

  // Get earliest
  const { data: earliest } = await supabase
    .from('market_hpi')
    .select('report_month')
    .eq('area_name', areaName)
    .eq('property_category', propertyCategory)
    .order('report_month', { ascending: true })
    .limit(1)
    .single();

  // Get latest
  const { data: latest } = await supabase
    .from('market_hpi')
    .select('report_month')
    .eq('area_name', areaName)
    .eq('property_category', propertyCategory)
    .order('report_month', { ascending: false })
    .limit(1)
    .single();

  if (!earliest || !latest) {
    return null;
  }

  return {
    earliest: earliest.report_month,
    latest: latest.report_month,
  };
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
 * Calculate HPI-based equity estimate
 */
export async function calculateHPIEquity(
  input: HPIEstimateInput
): Promise<HPIEstimateResult | { error: string }> {
  const { region, propertyType, purchaseYear, purchaseMonth, purchasePrice } = input;

  console.log('[HPI Equity] Calculating for:', { region, propertyType, purchaseYear, purchaseMonth, purchasePrice });

  // Get HPI at purchase date
  const hpiAtPurchase = await getHPI(region, propertyType, purchaseYear, purchaseMonth);
  console.log('[HPI Equity] HPI at purchase:', hpiAtPurchase);
  
  if (!hpiAtPurchase) {
    console.log('[HPI Equity] No HPI data at purchase date');
    return {
      error: `No HPI data available for ${region} - ${propertyType} at ${purchaseYear}-${purchaseMonth}. Please check your inputs.`,
    };
  }

  // Get current HPI
  const currentHPI = await getCurrentHPI(region, propertyType);
  console.log('[HPI Equity] Current HPI:', currentHPI);
  
  if (!currentHPI) {
    console.log('[HPI Equity] No current HPI data');
    return {
      error: `No current HPI data available for ${region} - ${propertyType}.`,
    };
  }

  // Calculate appreciation
  const appreciationFactor = currentHPI.hpi / hpiAtPurchase;
  const estimatedCurrentValue = Math.round(purchasePrice * appreciationFactor);
  const equityGained = estimatedCurrentValue - purchasePrice;
  const roiPercent = Math.round((appreciationFactor - 1) * 100 * 10) / 10;

  // Get HPI trend for chart
  const hpiTrend = await getHPITrend(region, propertyType, purchaseYear, purchaseMonth);

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

  return {
    input,
    hpiAtPurchase,
    hpiCurrent: currentHPI.hpi,
    hpiCurrentDate: currentHPI.date,
    appreciationFactor: Math.round(appreciationFactor * 1000) / 1000,
    estimatedCurrentValue,
    equityGained,
    roiPercent,
    hpiTrend,
    calculatedAt: new Date().toISOString(),
    scenarios,
  };
}

/**
 * Validate HPI estimate input
 */
export function validateHPIInput(input: Partial<HPIEstimateInput>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.region || input.region.trim().length === 0) {
    errors.region = 'Region is required';
  }

  if (!input.propertyType || input.propertyType.trim().length === 0) {
    errors.propertyType = 'Property type is required';
  }

  if (!input.purchaseYear) {
    errors.purchaseYear = 'Purchase year is required';
  } else if (input.purchaseYear < 1980 || input.purchaseYear > new Date().getFullYear()) {
    errors.purchaseYear = 'Purchase year must be between 1980 and current year';
  }

  if (!input.purchaseMonth) {
    errors.purchaseMonth = 'Purchase month is required';
  } else if (input.purchaseMonth < 1 || input.purchaseMonth > 12) {
    errors.purchaseMonth = 'Month must be between 1 and 12';
  }

  if (!input.purchasePrice) {
    errors.purchasePrice = 'Purchase price is required';
  } else if (input.purchasePrice <= 0) {
    errors.purchasePrice = 'Purchase price must be greater than 0';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
