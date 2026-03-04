'use client';

import type { HPIEstimateResult } from '@/lib/estimation/hpi';

export interface EstimatePropertyData {
  estimateId?: string;
  region: string;
  neighborhood?: string;
  propertyType: string;
  purchaseYear: number;
  purchaseMonth: number;
  purchasePrice: number;
  estimatedCurrentValue?: number;
  netEquity?: number;
  mortgageAssumptions: {
    interestRate: number;
    amortization: number;
    downPayment: number;
    secondaryMortgageBalance?: number;
    helocBalance?: number;
    hasRefinanced?: boolean;
    currentMortgageBalance?: number;
    currentInterestRate?: number;
    currentAmortization?: number;
    refinanceYear?: number;
  };
}

export interface PendingEstimateData {
  name: string;
  email: string;
  workspaceSlug?: string;
  propertyData: EstimatePropertyData;
}

export interface LatestEstimateResult {
  estimateId: string;
  result: HPIEstimateResult;
}

export const PENDING_ESTIMATE_STORAGE_KEY = 'gta_equity_pending_estimate';
export const LATEST_PROPERTY_DATA_STORAGE_KEY = 'gta_equity_latest_property_data';
export const LATEST_ESTIMATE_RESULT_STORAGE_KEY = 'gta_equity_latest_estimate_result';

function readFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.error(`Failed to parse storage key "${key}"`, error);
    window.localStorage.removeItem(key);
    return null;
  }
}

export function getPendingEstimate(): PendingEstimateData | null {
  return readFromStorage<PendingEstimateData>(PENDING_ESTIMATE_STORAGE_KEY);
}

export function setPendingEstimate(data: PendingEstimateData) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PENDING_ESTIMATE_STORAGE_KEY, JSON.stringify(data));
}

export function clearPendingEstimate() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(PENDING_ESTIMATE_STORAGE_KEY);
}

export function getLatestPropertyData(): EstimatePropertyData | null {
  return readFromStorage<EstimatePropertyData>(LATEST_PROPERTY_DATA_STORAGE_KEY);
}

export function setLatestPropertyData(data: EstimatePropertyData) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    LATEST_PROPERTY_DATA_STORAGE_KEY,
    JSON.stringify(data)
  );
}

export function getLatestEstimateResult(): LatestEstimateResult | null {
  return readFromStorage<LatestEstimateResult>(LATEST_ESTIMATE_RESULT_STORAGE_KEY);
}

export function setLatestEstimateResult(data: LatestEstimateResult) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    LATEST_ESTIMATE_RESULT_STORAGE_KEY,
    JSON.stringify(data)
  );
}
