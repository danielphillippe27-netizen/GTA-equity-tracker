/**
 * Feature flags for A/B testing different strategies
 */

export type GatingStrategy = 'optionA' | 'optionB' | 'partialLock';

/**
 * Gating Strategy for email capture:
 * - optionA: (Legacy) Blur Net Equity with lock icon, CTA "Unlock my Equity Position"
 * - optionB: (Legacy) Keep numbers visible, emphasize monthly monitoring, CTA "Activate Monthly Wealth Monitoring"
 * - partialLock: (Current) Show Value + Mortgage, lock only Net Equity with $•••,•••, CTA "Track My Equity Monthly"
 */
export const GATING_STRATEGY: GatingStrategy =
  (process.env.NEXT_PUBLIC_GATING_STRATEGY as GatingStrategy) || 'partialLock';
