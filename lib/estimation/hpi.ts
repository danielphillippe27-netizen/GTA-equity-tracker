/**
 * HPI (Home Price Index) calculation functions
 * Uses Supabase to fetch HPI data and calculate equity estimates
 */

import { createServerClient } from '@/lib/supabase/server';
import {
  getAreaIdForMarketData,
  getAreaTaxonomy,
  getAreaTaxonomyById,
  getPropertyTypeIdForMarketData,
} from '@/lib/trreb-taxonomy';

// Types
export interface HPIDataPoint {
  reportMonth: string;
  hpiIndex: number;
  benchmarkPrice: number | null;
}

export interface CurrentMarketStats {
  sales: number | null;
  newListings: number | null;
  activeListings: number | null;
  averageSoldPrice: number | null;
  medianPrice: number | null;
  averageDaysOnMarket: number | null;
  salesToNewListingsRatio: number | null;
  monthsOfInventory: number | null;
  reportMonth: string | null;
  scopeAreaName: string | null;
  scopeLevel: 'zone' | 'municipality' | 'neighborhood' | null;
  isFallback: boolean;
}

export interface MarketSnapshot {
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

export interface MarketDataScope {
  workspaceId?: string | null;
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
  currentMarketStats?: CurrentMarketStats;
}

/**
 * Format year and month into 'YYYY-MM' string
 */
function formatReportMonth(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

function formatPeriod(year: number, month: number): string {
  return `${formatReportMonth(year, month)}-01`;
}

function normalizeLookupInputs(areaName: string, propertyCategory: string) {
  return {
    areaId: getAreaIdForMarketData(areaName),
    propertyTypeId: getPropertyTypeIdForMarketData(propertyCategory),
  };
}

function getFallbackAreaIds(areaName: string, primaryAreaId: string): string[] {
  const fallbackAreaIds: string[] = [];
  const seenAreaIds = new Set<string>();

  function addFallbackAreaId(areaId: string | null | undefined) {
    if (!areaId || seenAreaIds.has(areaId)) {
      return;
    }

    seenAreaIds.add(areaId);
    fallbackAreaIds.push(areaId);
  }

  const startingArea = getAreaTaxonomy(areaName);
  addFallbackAreaId(primaryAreaId);

  if (startingArea?.parent_id) {
    addFallbackAreaId(startingArea.parent_id);
    const parentArea = getAreaTaxonomyById(startingArea.parent_id);
    if (parentArea?.parent_id) {
      addFallbackAreaId(parentArea.parent_id);
    }
  }

  return fallbackAreaIds;
}

function selectWithWorkspaceScope(
  supabase: ReturnType<typeof createServerClient>,
  table: 'market_hpi' | 'market_watch_monthly',
  columns: string,
  workspaceId?: string | null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = supabase.from(table).select(columns);
  return workspaceId ? query.eq('workspace_id', workspaceId) : query;
}

/**
 * Get HPI index for a specific region, property type, and date
 */
export async function getHPI(
  areaName: string,
  propertyCategory: string,
  year: number,
  month: number,
  scope?: MarketDataScope
): Promise<number | null> {
  const supabase = createServerClient();
  const period = formatPeriod(year, month);
  const normalized = normalizeLookupInputs(areaName, propertyCategory);
  if (!normalized.areaId || !normalized.propertyTypeId) {
    return null;
  }

  const { data, error } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'hpi_index',
    scope?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .eq('period', period)
    .single();

  if (error || !data) {
    // Try to find the closest available month
    const { data: closest, error: closestError } = await selectWithWorkspaceScope(
      supabase,
      'market_hpi',
      'hpi_index, period',
      scope?.workspaceId
    )
      .eq('area_id', normalized.areaId)
      .eq('property_type_id', normalized.propertyTypeId)
      .lte('period', period)
      .order('period', { ascending: false })
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
  propertyCategory: string,
  scope?: MarketDataScope
): Promise<{ hpi: number; date: string } | null> {
  const supabase = createServerClient();
  const normalized = normalizeLookupInputs(areaName, propertyCategory);
  if (!normalized.areaId || !normalized.propertyTypeId) {
    return null;
  }

  const { data, error } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'hpi_index, period',
    scope?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .order('period', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    hpi: data.hpi_index,
    date: data.period,
  };
}

// Cache for getCurrentBenchmarkPrice - "current" is the same for any region/category combo
const currentBenchmarkCache = new Map<string, { price: number; date: string }>();
const currentMarketStatsCache = new Map<string, CurrentMarketStats>();

function parseNumericField(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readFirstNumericField(
  row: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = parseNumericField(row[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

/**
 * Get benchmark price for a specific region, property type, and date
 * Uses district mapping to query both modern names and historic district codes
 * Falls back to nearest prior month, then nearest future month if exact match not found
 */
export async function getBenchmarkPrice(
  areaName: string,
  propertyCategory: string,
  year: number,
  month: number,
  options?: MarketDataScope & {
    allowFutureFallback?: boolean;
  }
): Promise<{ price: number; date: string } | null> {
  const supabase = createServerClient();
  const period = formatPeriod(year, month);
  const allowFutureFallback = options?.allowFutureFallback ?? true;
  const normalized = normalizeLookupInputs(areaName, propertyCategory);
  if (!normalized.areaId || !normalized.propertyTypeId) {
    return null;
  }
  
  console.log('[getBenchmarkPrice] Looking up:', { areaId: normalized.areaId, propertyTypeId: normalized.propertyTypeId, period });
  
  // Try exact match first
  const { data: exactMatch } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'benchmark_price, period',
    options?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .eq('period', period)
    .not('benchmark_price', 'is', null)
    .limit(1)
    .single();
  
  if (exactMatch?.benchmark_price) {
    console.log('[getBenchmarkPrice] Found exact match:', exactMatch);
    return {
      price: Number(exactMatch.benchmark_price),
      date: exactMatch.period,
    };
  }
  
  // Try nearest prior month
  const { data: priorMatch } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'benchmark_price, period',
    options?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .lte('period', period)
    .not('benchmark_price', 'is', null)
    .order('period', { ascending: false })
    .limit(1)
    .single();
  
  if (priorMatch?.benchmark_price) {
    console.log('[getBenchmarkPrice] Found prior match:', priorMatch);
    return {
      price: Number(priorMatch.benchmark_price),
      date: priorMatch.period,
    };
  }
  
  if (!allowFutureFallback) {
    console.log('[getBenchmarkPrice] Future fallback disabled:', {
      areaId: normalized.areaId,
      propertyTypeId: normalized.propertyTypeId,
      period,
    });
    return null;
  }

  // Try nearest future month as last resort
  const { data: futureMatch } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'benchmark_price, period',
    options?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .gte('period', period)
    .not('benchmark_price', 'is', null)
    .order('period', { ascending: true })
    .limit(1)
    .single();
  
  if (futureMatch?.benchmark_price) {
    console.log('[getBenchmarkPrice] Found future match:', futureMatch);
    return {
      price: Number(futureMatch.benchmark_price),
      date: futureMatch.period,
    };
  }
  
  console.log('[getBenchmarkPrice] No benchmark data found for:', { areaId: normalized.areaId, propertyTypeId: normalized.propertyTypeId, period });
  return null;
}

/**
 * Get the most recent benchmark price for a region and property type
 * Results are cached since "current" doesn't change during a request cycle
 */
export async function getCurrentBenchmarkPrice(
  areaName: string,
  propertyCategory: string,
  scope?: MarketDataScope
): Promise<{ price: number; date: string } | null> {
  const normalized = normalizeLookupInputs(areaName, propertyCategory);
  if (!normalized.areaId || !normalized.propertyTypeId) {
    return null;
  }

  // Check cache first
  const cacheKey = `${scope?.workspaceId ?? 'global'}:${normalized.areaId}:${normalized.propertyTypeId}`;
  if (currentBenchmarkCache.has(cacheKey)) {
    console.log('[getCurrentBenchmarkPrice] Cache hit:', cacheKey);
    return currentBenchmarkCache.get(cacheKey)!;
  }
  
  const supabase = createServerClient();
  console.log('[getCurrentBenchmarkPrice] Looking up:', { areaId: normalized.areaId, propertyTypeId: normalized.propertyTypeId });
  
  const { data, error } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'benchmark_price, period',
    scope?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .not('benchmark_price', 'is', null)
    .order('period', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data?.benchmark_price) {
    console.log('[getCurrentBenchmarkPrice] No data found:', { error, data });
    return null;
  }
  
  const result = {
    price: Number(data.benchmark_price),
    date: data.period,
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

export async function getRecentMarketSnapshots(
  areaName: string,
  propertyCategory: string,
  limit: number = 2,
  scope?: MarketDataScope
): Promise<MarketSnapshot[]> {
  const supabase = createServerClient();
  const normalized = normalizeLookupInputs(areaName, propertyCategory);
  if (!normalized.areaId || !normalized.propertyTypeId) {
    return [];
  }

  const { data, error } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'period, hpi_index, benchmark_price',
    scope?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .order('period', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    reportMonth: row.period,
    hpiIndex: row.hpi_index,
    benchmarkPrice: row.benchmark_price,
  }));
}

export async function getRecentMarketStats(
  areaName: string,
  propertyCategory: string,
  limit: number = 2,
  scope?: MarketDataScope
): Promise<CurrentMarketStats[]> {
  const normalized = normalizeLookupInputs(areaName, propertyCategory);
  if (!normalized.areaId || !normalized.propertyTypeId) {
    return [];
  }

  const supabase = createServerClient();
  const fallbackAreaIds = getFallbackAreaIds(areaName, normalized.areaId);

  for (const [index, areaId] of fallbackAreaIds.entries()) {
    const { data, error } = await selectWithWorkspaceScope(
      supabase,
      'market_watch_monthly',
      'sales, new_listings, active_listings, avg_sold_price, dom, snlr, moi, period',
      scope?.workspaceId
    )
      .eq('area_id', areaId)
      .eq('property_type_id', normalized.propertyTypeId)
      .order('period', { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      continue;
    }

    const area = getAreaTaxonomyById(areaId);
    return data.map((row: any) => ({
      sales: parseNumericField(row.sales),
      newListings: parseNumericField(row.new_listings),
      activeListings: parseNumericField(row.active_listings),
      averageSoldPrice: parseNumericField(row.avg_sold_price),
      medianPrice: null,
      averageDaysOnMarket: parseNumericField(row.dom),
      salesToNewListingsRatio: parseNumericField(row.snlr),
      monthsOfInventory: parseNumericField(row.moi),
      reportMonth: typeof row.period === 'string' ? row.period : null,
      scopeAreaName: area?.display_name ?? null,
      scopeLevel: (area?.area_level as CurrentMarketStats['scopeLevel']) ?? null,
      isFallback: index > 0,
    }));
  }

  return [];
}

export async function getCurrentMarketStats(
  areaName: string,
  propertyCategory: string,
  scope?: MarketDataScope
): Promise<CurrentMarketStats | null> {
  const normalized = normalizeLookupInputs(areaName, propertyCategory);
  if (!normalized.areaId || !normalized.propertyTypeId) {
    return null;
  }

  const cacheKey = `${scope?.workspaceId ?? 'global'}:${normalized.areaId}:${normalized.propertyTypeId}`;
  if (currentMarketStatsCache.has(cacheKey)) {
    return currentMarketStatsCache.get(cacheKey)!;
  }

  const [currentStats] = await getRecentMarketStats(areaName, propertyCategory, 1, scope);
  if (currentStats) {
    currentMarketStatsCache.set(cacheKey, currentStats);
    return currentStats;
  }

  return null;
}

/**
 * Get HPI trend data from a starting date to the most recent available
 */
export async function getHPITrend(
  areaName: string,
  propertyCategory: string,
  fromYear: number,
  fromMonth: number,
  scope?: MarketDataScope
): Promise<HPIDataPoint[]> {
  const supabase = createServerClient();
  const fromPeriod = formatPeriod(fromYear, fromMonth);
  const normalized = normalizeLookupInputs(areaName, propertyCategory);
  if (!normalized.areaId || !normalized.propertyTypeId) {
    return [];
  }

  const { data, error } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'period, hpi_index, benchmark_price',
    scope?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .gte('period', fromPeriod)
    .order('period', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    reportMonth: row.period,
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
  propertyCategory: string,
  scope?: MarketDataScope
): Promise<{ earliest: string; latest: string } | null> {
  const supabase = createServerClient();
  const normalized = normalizeLookupInputs(areaName, propertyCategory);
  if (!normalized.areaId || !normalized.propertyTypeId) {
    return null;
  }

  // Get earliest
  const { data: earliest } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'period',
    scope?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .order('period', { ascending: true })
    .limit(1)
    .single();

  // Get latest
  const { data: latest } = await selectWithWorkspaceScope(
    supabase,
    'market_hpi',
    'period',
    scope?.workspaceId
  )
    .eq('area_id', normalized.areaId)
    .eq('property_type_id', normalized.propertyTypeId)
    .order('period', { ascending: false })
    .limit(1)
    .single();

  if (!earliest || !latest) {
    return null;
  }

  return {
    earliest: earliest.period,
    latest: latest.period,
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
  input: HPIEstimateInput,
  scope?: MarketDataScope
): Promise<HPIEstimateResult | { error: string }> {
  const { region, propertyType, purchaseYear, purchaseMonth, purchasePrice } = input;

  console.log('[HPI Equity] Calculating for:', { region, propertyType, purchaseYear, purchaseMonth, purchasePrice });

  // Get HPI at purchase date
  const hpiAtPurchase = await getHPI(region, propertyType, purchaseYear, purchaseMonth, scope);
  console.log('[HPI Equity] HPI at purchase:', hpiAtPurchase);
  
  if (!hpiAtPurchase) {
    console.log('[HPI Equity] No HPI data at purchase date');
    return {
      error: `No HPI data available for ${region} - ${propertyType} at ${purchaseYear}-${purchaseMonth}. Please check your inputs.`,
    };
  }

  // Get current HPI
  const currentHPI = await getCurrentHPI(region, propertyType, scope);
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
  const hpiTrend = await getHPITrend(region, propertyType, purchaseYear, purchaseMonth, scope);

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
