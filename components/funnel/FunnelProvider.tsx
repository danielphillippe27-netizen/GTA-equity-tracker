'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
// Router import removed - navigation is handled in page components
import { FUNNEL_STEPS, FunnelStepId } from '@/lib/constants';
import { getSessionId } from '@/lib/session';

// Funnel data shape (HPI-based)
export interface FunnelData {
  region: string;
  propertyType: string;
  purchaseYear: number | null;
  purchaseMonth: number | null;
  purchasePrice: number | null;
}

// Funnel state
export interface FunnelState {
  currentStep: number;
  totalSteps: number;
  sessionId: string | null;
  data: FunnelData;
  isSubmitting: boolean;
  error: string | null;
}

// Actions
type FunnelAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'UPDATE_DATA'; payload: Partial<FunnelData> }
  | { type: 'SET_SESSION_ID'; sessionId: string }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' };

// Initial state
const initialState: FunnelState = {
  currentStep: 1,
  totalSteps: FUNNEL_STEPS.length,
  sessionId: null,
  data: {
    region: '',
    propertyType: '',
    purchaseYear: null,
    purchaseMonth: null,
    purchasePrice: null,
  },
  isSubmitting: false,
  error: null,
};

// Reducer
function funnelReducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, state.totalSteps),
        error: null,
      };
    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 1),
        error: null,
      };
    case 'GO_TO_STEP':
      return {
        ...state,
        currentStep: Math.max(1, Math.min(action.step, state.totalSteps)),
        error: null,
      };
    case 'UPDATE_DATA':
      return {
        ...state,
        data: { ...state.data, ...action.payload },
        error: null,
      };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.sessionId };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.isSubmitting };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET':
      return { ...initialState, sessionId: state.sessionId };
    default:
      return state;
  }
}

// Context type
interface FunnelContextType extends FunnelState {
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  updateData: (data: Partial<FunnelData>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  canProceed: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStepConfig: (typeof FUNNEL_STEPS)[number];
}

// Create context
const FunnelContext = createContext<FunnelContextType | null>(null);

// Provider component
export function FunnelProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(funnelReducer, initialState);

  // Initialize session ID on mount
  useEffect(() => {
    const sessionId = getSessionId();
    dispatch({ type: 'SET_SESSION_ID', sessionId });
  }, []);

  // Actions
  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'GO_TO_STEP', step });
  }, []);

  const updateData = useCallback((data: Partial<FunnelData>) => {
    dispatch({ type: 'UPDATE_DATA', payload: data });
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Computed values
  const isFirstStep = state.currentStep === 1;
  const isLastStep = state.currentStep === state.totalSteps;
  const currentStepConfig = FUNNEL_STEPS[state.currentStep - 1];

  // Can proceed to next step (input validation)
  const canProceed = (() => {
    // For education steps (1-3), always allow proceeding
    if (state.currentStep < 4) return true;

    // For input step (4), validate required HPI fields
    const { region, propertyType, purchaseYear, purchaseMonth, purchasePrice } = state.data;
    return (
      region.trim().length > 0 &&
      propertyType.trim().length > 0 &&
      purchaseYear !== null &&
      purchaseMonth !== null &&
      purchasePrice !== null &&
      purchasePrice > 0
    );
  })();

  const value: FunnelContextType = {
    ...state,
    nextStep,
    prevStep,
    goToStep,
    updateData,
    setSubmitting,
    setError,
    reset,
    canProceed,
    isFirstStep,
    isLastStep,
    currentStepConfig,
  };

  return (
    <FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>
  );
}

// Hook to use funnel context
export function useFunnel() {
  const context = useContext(FunnelContext);
  if (!context) {
    throw new Error('useFunnel must be used within a FunnelProvider');
  }
  return context;
}

// Hook to get current step ID
export function useCurrentStepId(): FunnelStepId {
  const { currentStep } = useFunnel();
  return FUNNEL_STEPS[currentStep - 1]?.id ?? 'education';
}
