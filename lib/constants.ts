// GTA Equity Tracker Constants

// Market phases and their volatility bands
export const MARKET_PHASES = {
  hot: {
    name: 'hot',
    label: 'Hot Market',
    volatilityBand: 0.04,
    description: 'Strong seller\'s market with rapid price appreciation and high competition',
  },
  balanced: {
    name: 'balanced',
    label: 'Balanced Market',
    volatilityBand: 0.06,
    description: 'Equilibrium between buyers and sellers with stable pricing',
  },
  soft: {
    name: 'soft',
    label: 'Soft Market',
    volatilityBand: 0.09,
    description: 'Buyer\'s market with more inventory and price negotiation room',
  },
} as const;

export type MarketPhaseName = keyof typeof MARKET_PHASES;

// Mortgage calculation defaults
export const MORTGAGE_DEFAULTS = {
  amortizationYears: 25,
  defaultDownPaymentPercent: 20,
  minDownPaymentPercent: 5,
  maxDownPaymentPercent: 100,
} as const;

// Year ranges
export const YEAR_RANGE = {
  min: new Date().getFullYear() - 100, // Allow 100 years back
  max: new Date().getFullYear(),
} as const;

// Price formatting
export const CURRENCY_FORMAT = {
  locale: 'en-CA',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
} as const;

// Format price as currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_FORMAT.locale, {
    style: 'currency',
    currency: CURRENCY_FORMAT.currency,
    minimumFractionDigits: CURRENCY_FORMAT.minimumFractionDigits,
    maximumFractionDigits: CURRENCY_FORMAT.maximumFractionDigits,
  }).format(amount);
}

// Format large numbers with K/M suffix
export function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return formatCurrency(amount);
}

// Format percentage
export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// Funnel step configuration
export const FUNNEL_STEPS = [
  {
    id: 'education',
    title: 'Market Education',
    description: 'Understanding home value estimates',
  },
  {
    id: 'cycles',
    title: 'Market Cycles',
    description: 'How GTA markets evolve over time',
  },
  {
    id: 'trust',
    title: 'Our Methodology',
    description: 'Based on official board data',
  },
  {
    id: 'input',
    title: 'Your Property',
    description: 'Tell us about your home',
  },
] as const;

export type FunnelStepId = typeof FUNNEL_STEPS[number]['id'];

// Copy/tone guidelines (for reference)
export const COPY_GUIDELINES = {
  preferredTerms: {
    estimate: ['estimate', 'estimation', 'projected value'],
    analysis: ['analysis', 'evaluation', 'assessment', 'market context'],
    consultation: ['evaluation', 'consultation', 'strategic discussion'],
  },
  avoidTerms: {
    calculator: 'Use "estimate" instead',
    sales: 'Use "analysis" or "evaluation" instead',
    appointment: 'Use "consultation" or "evaluation" instead',
    exact: 'Values are always ranges, not exact figures',
  },
} as const;
