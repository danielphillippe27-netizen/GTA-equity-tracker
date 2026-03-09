function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function resolveRenovationValueAdd(
  propertyData:
    | {
        renovationValueAdd?: unknown;
        estimatedCurrentValue?: unknown;
        modelEstimatedCurrentValue?: unknown;
        currentValueOverride?: unknown;
        mortgageAssumptions?: {
          renovationValueAdd?: unknown;
        };
      }
    | null
    | undefined,
  modelEstimatedCurrentValue?: number | null
): number {
  if (!propertyData || typeof propertyData !== 'object') {
    return 0;
  }

  const explicitValue = parseFiniteNumber(propertyData.renovationValueAdd);
  const explicitMortgageValue = parseFiniteNumber(
    propertyData.mortgageAssumptions?.renovationValueAdd
  );
  const explicitResolved = explicitValue ?? explicitMortgageValue;
  if (explicitResolved !== null) {
    return Math.max(0, Math.round(explicitResolved));
  }

  const overrideValue = parseFiniteNumber(propertyData.currentValueOverride);
  const storedModelValue = parseFiniteNumber(propertyData.modelEstimatedCurrentValue);
  const fallbackModelValue =
    typeof modelEstimatedCurrentValue === 'number' && Number.isFinite(modelEstimatedCurrentValue)
      ? modelEstimatedCurrentValue
      : null;
  const baselineModelValue = storedModelValue ?? fallbackModelValue;

  if (overrideValue !== null && baselineModelValue !== null) {
    return Math.max(0, Math.round(overrideValue - baselineModelValue));
  }

  const storedEstimatedValue = parseFiniteNumber(propertyData.estimatedCurrentValue);
  if (storedEstimatedValue !== null && baselineModelValue !== null) {
    return Math.max(0, Math.round(storedEstimatedValue - baselineModelValue));
  }

  return 0;
}

export function applyRenovationValueAdd(
  baseEstimatedValue: number,
  renovationValueAdd: number
): number {
  return Math.round(baseEstimatedValue + Math.max(0, renovationValueAdd));
}
