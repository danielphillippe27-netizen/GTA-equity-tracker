'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { Calculator, Info, Minus, Plus, ChevronDown, LineChart, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GlowButton, GradientText } from '@/components/shared';
import { formatCurrency } from '@/lib/constants';
import {
  calculateMortgageSummary,
  calculateNetEquity,
} from '@/lib/calculation/mortgage-calculator';
import { getHistoricalRate } from '@/lib/data/historical-rates';
// No auth provider needed - using simple subscribe API

interface EquityUnlockFormProps {
  purchasePrice: number;
  purchaseYear: number;
  purchaseMonth: number;
  estimatedCurrentValue: number;
  estimateId: string;
  region: string;
  propertyType: string;
  className?: string;
}

// Animated value component for count-up effect
function AnimatedValue({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasStartedRef = useRef(false);
  
  const springValue = useSpring(0, {
    stiffness: 50,
    damping: 20,
    duration: 1500,
  });

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      springValue.set(value);
    }
    
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
    
    return () => unsubscribe();
  }, [springValue, value]);

  return (
    <span className={className}>
      {formatCurrency(displayValue)}
    </span>
  );
}

export function EquityUnlockForm({
  purchasePrice,
  purchaseYear,
  purchaseMonth,
  estimatedCurrentValue,
  estimateId,
  region,
  propertyType,
  className,
}: EquityUnlockFormProps) {
  // Form state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contact info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Financial assumptions (editable)
  const defaultRate = getHistoricalRate(purchaseYear);
  const [interestRate, setInterestRate] = useState(defaultRate);
  const [amortization, setAmortization] = useState('25');
  
  // Down payment with $ / % toggle - Always default to 20%
  const [downPaymentMode, setDownPaymentMode] = useState<'$' | '%'>('%');
  const defaultDownPaymentPercent = 20;
  const [downPaymentPercent, setDownPaymentPercent] = useState(defaultDownPaymentPercent);
  const [downPaymentAmount, setDownPaymentAmount] = useState(purchasePrice * (defaultDownPaymentPercent / 100));
  const [downPaymentOverride, setDownPaymentOverride] = useState('');

  // Renovation investment tracking
  const [hasRenovations, setHasRenovations] = useState(false);
  const [renovationAmount, setRenovationAmount] = useState(0);

  // Helpers for interest rate stepper
  const adjustRate = (delta: number) => {
    setInterestRate((prev) => Math.max(0.5, Math.min(12, Math.round((prev + delta) * 100) / 100)));
  };

  // Calculate effective down payment based on mode
  const effectiveDownPayment = useMemo(() => {
    if (downPaymentOverride) return parseFloat(downPaymentOverride);
    if (downPaymentMode === '%') {
      return purchasePrice * (downPaymentPercent / 100);
    }
    return downPaymentAmount;
  }, [downPaymentMode, downPaymentPercent, downPaymentAmount, downPaymentOverride, purchasePrice]);

  // Calculate mortgage summary
  const mortgageSummary = useMemo(() => {
    const rate = interestRate || defaultRate;
    const years = parseInt(amortization, 10) || 25;

    return calculateMortgageSummary({
      purchasePrice,
      purchaseYear,
      purchaseMonth,
      interestRate: rate,
      amortizationYears: years,
      downPaymentAmount: effectiveDownPayment,
    });
  }, [purchasePrice, purchaseYear, purchaseMonth, interestRate, amortization, effectiveDownPayment, defaultRate]);

  // Calculate net equity
  const netEquity = useMemo(() => {
    return calculateNetEquity(estimatedCurrentValue, mortgageSummary.remainingBalance);
  }, [estimatedCurrentValue, mortgageSummary.remainingBalance]);

  // Calculate total invested (purchase + renovations)
  const totalInvested = useMemo(() => {
    return purchasePrice + (hasRenovations ? renovationAmount : 0);
  }, [purchasePrice, hasRenovations, renovationAmount]);

  // Calculate true ROI including renovations
  const trueROI = useMemo(() => {
    if (totalInvested <= 0) return 0;
    return ((estimatedCurrentValue - totalInvested) / totalInvested) * 100;
  }, [estimatedCurrentValue, totalInvested]);

  // Handle form submission - simple subscribe API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Capture property data to store with subscription
      const propertyData = {
        estimateId,
        region,
        propertyType,
        purchasePrice,
        purchaseYear,
        purchaseMonth,
        estimatedCurrentValue,
        mortgageAssumptions: {
          interestRate,
          amortization: parseInt(amortization, 10),
          downPayment: effectiveDownPayment,
        },
        renovations: hasRenovations ? {
          totalInvestment: renovationAmount,
        } : null,
        totalInvested,
        netEquity,
      };

      // Call the subscribe API
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          propertyData,
          estimateId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsUnlocked(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state - show subscription confirmed
  if (isUnlocked) {
    return (
      <motion.div
        className={`rounded-2xl bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20 overflow-hidden ${className}`}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Success Header */}
        <div className="p-8 sm:p-10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
          >
            <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h4 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">
            You&apos;re All Set!
          </h4>
          <p className="text-muted-foreground mb-2 max-w-sm mx-auto">
            Monthly equity reports will be sent to
          </p>
          <p className="font-medium text-foreground mb-6">{email}</p>
          
          {/* Reveal Net Equity */}
          <div className="p-4 rounded-xl bg-background/50 max-w-xs mx-auto">
            <p className="text-xs text-muted-foreground mb-1">Your Estimated Net Equity</p>
            <p className="text-2xl font-bold">
              <GradientText>{formatCurrency(netEquity)}</GradientText>
            </p>
            {hasRenovations && renovationAmount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Including {formatCurrency(renovationAmount)} in renovations
              </p>
            )}
          </div>
        </div>

        {/* What happens next */}
        <div className="px-6 sm:px-8 pb-8">
          <div className="p-4 rounded-xl bg-background/30 border border-border/50">
            <div className="flex items-start gap-3">
              <LineChart className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">What Happens Next</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✓ Your equity position is now being tracked</li>
                  <li>✓ You&apos;ll receive monthly market updates</li>
                  <li>✓ We&apos;ll alert you to significant market changes</li>
                </ul>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            Unsubscribe anytime with one click.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
    <motion.div
      className={`rounded-2xl bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20 overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Header */}
      <div className="p-6 sm:p-8 pb-4 sm:pb-6 text-center">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          Track Your <GradientText>Wealth Position</GradientText>
        </h3>
        <p className="text-sm text-muted-foreground">
          Property values in the GTA change every month.
        </p>
        <p className="text-sm text-muted-foreground">
          Don&apos;t lose track of your position.
        </p>
      </div>

      {/* Your Mortgage Assumptions - Collapsible, Expanded by Default */}
      <div className="px-6 sm:px-8 pb-4">
        <button
          type="button"
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-accent-cyan transition-colors mb-3"
        >
          <Calculator className="w-4 h-4" />
          <span className="font-medium text-foreground">Your Mortgage Assumptions</span>
          <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showAssumptions ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence initial={false}>
          {showAssumptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Interest Rate with Slider + Steppers */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground">
                        Interest Rate
                      </Label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustRate(-0.25)}
                          className="w-7 h-7 rounded-md bg-background/50 border border-border flex items-center justify-center hover:bg-accent-cyan/10 hover:border-accent-cyan/50 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <span className="w-16 text-center font-mono text-sm font-medium text-foreground">
                          {interestRate.toFixed(2)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustRate(0.25)}
                          className="w-7 h-7 rounded-md bg-background/50 border border-border flex items-center justify-center hover:bg-accent-cyan/10 hover:border-accent-cyan/50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <Slider
                      value={[interestRate]}
                      min={0.5}
                      max={12}
                      step={0.25}
                      onValueChange={([v]) => setInterestRate(v)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Avg. 5-year fixed rate in {purchaseYear}: {defaultRate.toFixed(2)}%
                    </p>
                  </div>

                  {/* Amortization */}
                  <div>
                    <Label htmlFor="amortization" className="text-xs text-muted-foreground">
                      Amortization
                    </Label>
                    <Select value={amortization} onValueChange={setAmortization}>
                      <SelectTrigger className="mt-1.5 bg-background/50 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 years</SelectItem>
                        <SelectItem value="20">20 years</SelectItem>
                        <SelectItem value="25">25 years</SelectItem>
                        <SelectItem value="30">30 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Down Payment with $ / % Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">
                      Down Payment
                    </Label>
                    <div className="flex items-center gap-1 bg-background/50 rounded-md p-0.5 border border-border">
                      <button
                        type="button"
                        onClick={() => setDownPaymentMode('%')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          downPaymentMode === '%'
                            ? 'bg-accent-cyan/20 text-accent-cyan'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setDownPaymentMode('$')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          downPaymentMode === '$'
                            ? 'bg-accent-cyan/20 text-accent-cyan'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        $
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {downPaymentMode === '%' ? (
                      <>
                        <Slider
                          value={[downPaymentPercent]}
                          min={5}
                          max={50}
                          step={1}
                          onValueChange={([v]) => {
                            setDownPaymentPercent(v);
                            setDownPaymentAmount(purchasePrice * (v / 100));
                            setDownPaymentOverride('');
                          }}
                          className="flex-1"
                        />
                        <span className="w-16 text-right font-mono text-sm font-medium text-foreground">
                          {downPaymentPercent}%
                        </span>
                      </>
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        value={downPaymentAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setDownPaymentAmount(val);
                          setDownPaymentPercent(Math.round((val / purchasePrice) * 100));
                          setDownPaymentOverride('');
                        }}
                        className="bg-background/50 border-border"
                        placeholder={formatCurrency(purchasePrice * 0.2)}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    = {formatCurrency(effectiveDownPayment)} ({((effectiveDownPayment / purchasePrice) * 100).toFixed(0)}% of purchase price)
                  </p>
                </div>

                {/* Renovation Investment Toggle */}
                <div className="pt-2 border-t border-border/50">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasRenovations}
                      onChange={(e) => setHasRenovations(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-background/50 text-accent-cyan focus:ring-accent-cyan/50"
                    />
                    <span className="text-sm text-foreground">
                      I&apos;ve invested in renovations
                    </span>
                  </label>
                  
                  <AnimatePresence>
                    {hasRenovations && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pl-7">
                          <Label className="text-xs text-muted-foreground">
                            Total Renovation Investment
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={renovationAmount || ''}
                            onChange={(e) => setRenovationAmount(parseFloat(e.target.value) || 0)}
                            className="mt-1.5 bg-background/50 border-border"
                            placeholder="$50,000"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Kitchen, bathroom, basement, etc.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Defaults based on common mortgage terms at time of purchase.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Values Display - Below Assumptions */}
      <div className="px-6 sm:px-8 pb-6">
        <div className={`grid gap-4 text-center ${hasRenovations ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {/* Estimated Value - Always visible */}
          <div className="p-4 rounded-xl bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(estimatedCurrentValue)}
            </p>
          </div>
          
          {/* Total Invested - Only show if renovations */}
          {hasRenovations && (
            <div className="p-4 rounded-xl bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Total Invested</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(totalInvested)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Purchase + Renos
              </p>
            </div>
          )}
          
          {/* Mortgage Balance - Always visible */}
          <div className="p-4 rounded-xl bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Est. Mortgage Balance</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(mortgageSummary.remainingBalance)}
            </p>
          </div>
          
          {/* Net Equity - BLURRED until email (no lock icon) */}
          <div className="p-4 rounded-xl bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Est. Net Equity</p>
            <p className="text-lg font-bold blur-md select-none pointer-events-none">
              <GradientText>{formatCurrency(netEquity)}</GradientText>
            </p>
          </div>
        </div>
      </div>

      {/* Email Capture Form */}
      <form onSubmit={handleSubmit} className="border-t border-accent-blue/20">
        <div className="p-6 sm:p-8">
          <p className="text-sm font-medium text-foreground mb-4">
            Get monthly updates as your wealth changes
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="name" className="text-xs text-muted-foreground">
                Your Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
                className="mt-1.5 bg-background/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="mt-1.5 bg-background/50 border-border"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <GlowButton
            type="submit"
            className="w-full"
            disabled={isSubmitting || !name || !email}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span className="ml-2">Activating...</span>
              </>
            ) : (
              <>
                Activate Monthly Wealth Monitoring
              </>
            )}
          </GlowButton>

          {/* 1. Security/Privacy - addresses anxiety */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            Your information is secure. We'll only use it to send your report.
          </p>

        </div>
      </form>
    </motion.div>
    
    {/* Free tagline - outside the box, prominent */}
    <div className="text-center mt-8">
      <p className="text-xl sm:text-2xl font-semibold text-white">
        Free to use — forever.
      </p>
      <p className="text-xl sm:text-2xl font-semibold text-white mt-1">
        One update per month.
      </p>
    </div>
    </>
  );
}
