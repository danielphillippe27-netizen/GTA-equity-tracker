/**
 * TRREB Historic Annual Average Prices
 * Source: Toronto Regional Real Estate Board Historical Statistics
 * 
 * Used for purchase dates to calculate market growth over time.
 * For years before HPI data is available, this provides the bridge
 * to estimate property appreciation.
 */

export const HISTORIC_AVERAGES: Record<number, number> = {
  1980: 75694,
  1981: 90203,
  1982: 95496,
  1983: 101626,
  1984: 102318,
  1985: 109094,
  1986: 138925,
  1987: 189105,
  1988: 229635,
  1989: 273698,
  1990: 255020,
  1991: 234313,
  1992: 214971,
  1993: 206490,
  1994: 208921,
  1995: 203028,
  1996: 198150,
  1997: 211307,
  1998: 216815,
  1999: 228372,
  2000: 243255,
  2001: 251508,
  2002: 275231,
  2003: 293067,
  2004: 315231,
  2005: 335907,
  2006: 351941,
  2007: 376236,
  2008: 379347,
  2009: 395460,
  2010: 431276,
  2011: 465014,
  2012: 497298,
  2013: 523036,
  2014: 566726,
  2015: 622217,
  2016: 729922,
  2017: 822681,
  2018: 787300,
  2019: 819319,
  2020: 929699,
  2021: 1095475,
  2022: 1189850,
  2023: 1126604,
  2024: 1120241,
  2025: 1067968,
};

// The year where HPI data becomes available in our database
export const HPI_START_YEAR = 2012;

// Get the earliest year we have data for
export const EARLIEST_YEAR = 1980;

// Get the latest year we have data for
export const LATEST_YEAR = Math.max(...Object.keys(HISTORIC_AVERAGES).map(Number));

/**
 * Get the historic average price for a given year
 * @param year - The year to look up
 * @returns The average price or null if not found
 */
export function getHistoricAverage(year: number): number | null {
  return HISTORIC_AVERAGES[year] ?? null;
}

/**
 * Get the historic average price, with fallback to nearest year
 * @param year - The year to look up
 * @returns The average price (uses nearest available year if exact not found)
 */
export function getHistoricAverageWithFallback(year: number): number {
  // If we have the exact year, return it
  if (HISTORIC_AVERAGES[year]) {
    return HISTORIC_AVERAGES[year];
  }

  // Find the nearest year
  const years = Object.keys(HISTORIC_AVERAGES).map(Number).sort((a, b) => a - b);
  
  // If before earliest, use earliest
  if (year < years[0]) {
    return HISTORIC_AVERAGES[years[0]];
  }
  
  // If after latest, use latest
  if (year > years[years.length - 1]) {
    return HISTORIC_AVERAGES[years[years.length - 1]];
  }

  // Find closest year
  let closest = years[0];
  for (const y of years) {
    if (Math.abs(y - year) < Math.abs(closest - year)) {
      closest = y;
    }
  }
  
  return HISTORIC_AVERAGES[closest];
}

/**
 * Determine which data era a purchase year falls into
 * @param year - The purchase year
 * @returns 'historic' for pre-HPI data, 'hpi' for HPI-era data
 */
export function getDataEra(year: number): 'historic' | 'hpi' {
  return year < HPI_START_YEAR ? 'historic' : 'hpi';
}

/**
 * Calculate the growth ratio from a purchase year to a target year
 * using historic averages
 * @param fromYear - The purchase year
 * @param toYear - The target year (defaults to latest)
 * @returns The growth ratio
 */
export function calculateHistoricGrowthRatio(fromYear: number, toYear?: number): number {
  const targetYear = toYear ?? LATEST_YEAR;
  const fromAverage = getHistoricAverageWithFallback(fromYear);
  const toAverage = getHistoricAverageWithFallback(targetYear);
  
  return toAverage / fromAverage;
}
