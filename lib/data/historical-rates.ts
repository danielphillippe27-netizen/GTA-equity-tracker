/**
 * Historical Canadian 5-Year Fixed Mortgage Rates
 * 
 * These are approximate average rates for each year, used as defaults
 * when estimating mortgage payments for historical purchases.
 * 
 * Sources: Bank of Canada, various Canadian mortgage rate historical data
 */

export const HISTORICAL_RATES: Record<number, number> = {
  // 1980s - High inflation era
  1980: 14.25,
  1981: 18.38,
  1982: 17.89,
  1983: 13.23,
  1984: 13.58,
  1985: 11.75,
  1986: 10.52,
  1987: 10.78,
  1988: 11.31,
  1989: 12.06,
  
  // 1990s - Rates declining
  1990: 13.40,
  1991: 11.12,
  1992: 9.56,
  1993: 8.62,
  1994: 9.52,
  1995: 9.21,
  1996: 7.94,
  1997: 7.07,
  1998: 6.80,
  1999: 7.08,
  
  // 2000s - Moderate rates
  2000: 7.87,
  2001: 7.02,
  2002: 6.60,
  2003: 5.94,
  2004: 5.77,
  2005: 5.49,
  2006: 5.95,
  2007: 6.25,
  2008: 5.75,
  2009: 5.19,
  
  // 2010s - Low rate environment
  2010: 5.25,
  2011: 5.14,
  2012: 5.14,
  2013: 5.14,
  2014: 4.79,
  2015: 4.64,
  2016: 4.64,
  2017: 4.84,
  2018: 5.14,
  2019: 5.19,
  
  // 2020s - COVID and recovery
  2020: 4.79,
  2021: 4.59,
  2022: 5.14,
  2023: 6.49,
  2024: 5.99,
  2025: 5.49,
};

// Earliest and latest years we have data for
export const EARLIEST_RATE_YEAR = 1980;
export const LATEST_RATE_YEAR = 2025;

/**
 * Get the historical mortgage rate for a given year
 * @param year - The year to look up
 * @returns The estimated 5-year fixed rate for that year
 */
export function getHistoricalRate(year: number): number {
  // If we have the exact year, return it
  if (HISTORICAL_RATES[year]) {
    return HISTORICAL_RATES[year];
  }

  // If before our earliest data, use earliest
  if (year < EARLIEST_RATE_YEAR) {
    return HISTORICAL_RATES[EARLIEST_RATE_YEAR];
  }

  // If after our latest data, use latest
  if (year > LATEST_RATE_YEAR) {
    return HISTORICAL_RATES[LATEST_RATE_YEAR];
  }

  // Find the nearest year
  const years = Object.keys(HISTORICAL_RATES).map(Number).sort((a, b) => a - b);
  let closest = years[0];
  for (const y of years) {
    if (Math.abs(y - year) < Math.abs(closest - year)) {
      closest = y;
    }
  }

  return HISTORICAL_RATES[closest];
}

/**
 * Get the rate with a fallback to a default value
 * @param year - The year to look up
 * @param defaultRate - Fallback rate if not found (default 5.5%)
 */
export function getHistoricalRateWithFallback(year: number, defaultRate = 5.5): number {
  return getHistoricalRate(year) ?? defaultRate;
}
