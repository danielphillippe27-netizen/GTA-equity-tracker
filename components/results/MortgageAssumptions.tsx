'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calculator, Info, TrendingDown, Minus, Plus } from 'lucide-react';
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
import { GradientText } from '@/components/shared';
import { formatCurrency } from '@/lib/constants';
import {
  calculateMortgageSummary,
  calculateNetEquity,
  calculateRefinanceScenario,
  MortgageSummary,
  RefinanceScenario,
} from '@/lib/calculation/mortgage-calculator';
import { getHistoricalRate } from '@/lib/data/historical-rates';

interface MortgageAssumptionsProps {
  purchasePrice: number;
  purchaseYear: number;
  purchaseMonth: number;
  estimatedCurrentValue: number;
  onRequestCMA?: () => void;
  className?: string;
}

export function MortgageAssumptions({
  purchasePrice,
  purchaseYear,
  purchaseMonth,
  estimatedCurrentValue,
  onRequestCMA,
  className,
}: MortgageAssumptionsProps) {
  // Editable assumptions
  const defaultRate = getHistoricalRate(purchaseYear);
  const [interestRate, setInterestRate] = useState(defaultRate);
  const [amortization, setAmortization] = useState('25');
  
  // Down payment with $ / % toggle - Always default to 20%
  const [downPaymentMode, setDownPaymentMode] = useState<'$' | '%'>('%');
  const defaultDownPaymentPercent = 20;
  const [downPaymentPercent, setDownPaymentPercent] = useState(defaultDownPaymentPercent);
  const [downPaymentAmount, setDownPaymentAmount] = useState(purchasePrice * (defaultDownPaymentPercent / 100));
  const [downPaymentOverride, setDownPaymentOverride] = useState('');
  
  // Refinance section
  const [showRefinance, setShowRefinance] = useState(false);
  const [refinanceAmount, setRefinanceAmount] = useState('');
  const [refinanceRate, setRefinanceRate] = useState(5.5);
  const [refinanceTerm, setRefinanceTerm] = useState('25');

  // Helpers for interest rate stepper
  const adjustRate = (delta: number) => {
    setInterestRate((prev) => Math.max(0.5, Math.min(12, Math.round((prev + delta) * 100) / 100)));
  };

  const adjustRefinanceRate = (delta: number) => {
    setRefinanceRate((prev) => Math.max(0.5, Math.min(12, Math.round((prev + delta) * 100) / 100)));
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
  const mortgageSummary: MortgageSummary = useMemo(() => {
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

  // Calculate refinance scenario
  const refinanceScenario: RefinanceScenario | null = useMemo(() => {
    if (!refinanceAmount || parseFloat(refinanceAmount) <= 0) return null;
    
    return calculateRefinanceScenario(
      mortgageSummary.remainingBalance,
      parseFloat(refinanceAmount),
      refinanceRate || 5.5,
      parseInt(refinanceTerm, 10) || 25
    );
  }, [mortgageSummary.remainingBalance, refinanceAmount, refinanceRate, refinanceTerm]);

  return (
    <motion.div
      className={`rounded-2xl bg-surface border border-border overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center flex-shrink-0">
            <Calculator className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Mortgage &amp; Equity Assumptions
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your equity is affected by both market movement and how your mortgage changes over time.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Editable Assumptions */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <span>Mortgage Terms</span>
            <span className="text-xs font-normal text-muted-foreground">(editable)</span>
          </h4>
          
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {/* Interest Rate with Slider + Steppers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  Interest Rate
                </Label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustRate(-0.25)}
                    className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center hover:bg-accent-cyan/10 hover:border-accent-cyan/50 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <span className="w-16 text-center font-mono text-sm font-medium text-foreground">
                    {interestRate.toFixed(2)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustRate(0.25)}
                    className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center hover:bg-accent-cyan/10 hover:border-accent-cyan/50 transition-colors"
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
              />
            </div>

            {/* Amortization */}
            <div>
              <Label htmlFor="amortization" className="text-xs text-muted-foreground">
                Amortization
              </Label>
              <Select value={amortization} onValueChange={setAmortization}>
                <SelectTrigger className="mt-1.5 bg-background border-border">
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

          {/* Mortgage Type - full width */}
          <div className="mb-3">
            <Label className="text-xs text-muted-foreground">Mortgage Type</Label>
            <div className="mt-1.5 px-3 py-2 rounded-md bg-background border border-border text-sm text-muted-foreground inline-block">
              5-Year Fixed
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Defaults are estimates based on common mortgage terms at the time of purchase.
          </p>
        </div>

        {/* Down Payment / Original Mortgage */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Down Payment &amp; Original Mortgage
          </h4>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Down Payment with $ / % Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  Down Payment
                </Label>
                <div className="flex items-center gap-1 bg-background rounded-md p-0.5 border border-border">
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
                    <span className="w-12 text-right font-mono text-sm font-medium text-foreground">
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
                    className="bg-background border-border"
                    placeholder={formatCurrency(purchasePrice * 0.2)}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                = {formatCurrency(effectiveDownPayment)} ({((effectiveDownPayment / purchasePrice) * 100).toFixed(0)}% of purchase price)
              </p>
            </div>

            <div className="p-4 rounded-lg bg-background">
              <p className="text-xs text-muted-foreground mb-1">Original Mortgage</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(mortgageSummary.originalMortgage)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Monthly payment: {formatCurrency(mortgageSummary.monthlyPayment)}
              </p>
            </div>
          </div>
        </div>

        {/* Mortgage Paydown Summary */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Estimated Mortgage Paydown
          </h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-background text-center">
              <p className="text-xs text-muted-foreground mb-1">Original Balance</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(mortgageSummary.originalMortgage)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-background text-center">
              <p className="text-xs text-muted-foreground mb-1">Remaining Balance</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(mortgageSummary.remainingBalance)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-background text-center">
              <p className="text-xs text-muted-foreground mb-1">Principal Paid</p>
              <p className="text-sm font-semibold text-green-400">
                {formatCurrency(mortgageSummary.principalPaidToDate)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-background text-center">
              <p className="text-xs text-muted-foreground mb-1">Years Elapsed</p>
              <p className="text-sm font-semibold text-foreground">
                {mortgageSummary.yearsElapsed} yrs
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Estimated Net Equity</p>
                <p className="text-2xl font-bold">
                  <GradientText>{formatCurrency(netEquity)}</GradientText>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Paid Off</p>
                <p className="text-lg font-semibold text-accent-cyan">
                  {mortgageSummary.percentPaidOff.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Estimated — not a lender statement. Actual balances may vary based on your specific mortgage terms.
          </p>
        </div>

        {/* Refinance Section (Collapsible) */}
        <div className="pt-4 border-t border-border">
          <button
            onClick={() => setShowRefinance(!showRefinance)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Refinance / Second Mortgage Scenario
              </span>
              <span className="text-xs text-muted-foreground">(advanced)</span>
            </div>
            <ChevronDown 
              className={`w-4 h-4 text-muted-foreground transition-transform ${showRefinance ? 'rotate-180' : ''}`} 
            />
          </button>

          <AnimatePresence>
            {showRefinance && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="refinance-amount" className="text-xs text-muted-foreground">
                        Additional Loan Amount
                      </Label>
                      <Input
                        id="refinance-amount"
                        type="number"
                        min="0"
                        placeholder="$0"
                        value={refinanceAmount}
                        onChange={(e) => setRefinanceAmount(e.target.value)}
                        className="mt-1.5 bg-background border-border"
                      />
                    </div>
                    <div>
                      <Label htmlFor="refinance-term" className="text-xs text-muted-foreground">
                        New Term (years)
                      </Label>
                      <Select value={refinanceTerm} onValueChange={setRefinanceTerm}>
                        <SelectTrigger className="mt-1.5 bg-background border-border">
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
                  
                  {/* Refinance Interest Rate with Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground">
                        Refinance Interest Rate
                      </Label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustRefinanceRate(-0.25)}
                          className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center hover:bg-accent-cyan/10 hover:border-accent-cyan/50 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <span className="w-16 text-center font-mono text-sm font-medium text-foreground">
                          {refinanceRate.toFixed(2)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustRefinanceRate(0.25)}
                          className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center hover:bg-accent-cyan/10 hover:border-accent-cyan/50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <Slider
                      value={[refinanceRate]}
                      min={0.5}
                      max={12}
                      step={0.25}
                      onValueChange={([v]) => setRefinanceRate(v)}
                    />
                  </div>

                  {refinanceScenario && (
                    <div className="p-4 rounded-lg bg-background">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">New Total Debt</p>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(refinanceScenario.totalNewDebt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">New Monthly Payment</p>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(refinanceScenario.newMonthlyPayment)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Impact on Equity</p>
                          <p className="text-sm font-semibold text-red-400">
                            {formatCurrency(refinanceScenario.impactOnEquity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Subtle CMA Link */}
      {onRequestCMA && (
        <div className="px-6 py-4 border-t border-border bg-background/50">
          <button
            onClick={onRequestCMA}
            className="text-sm text-muted-foreground hover:text-accent-cyan transition-colors"
          >
            Want a precise, street-level valuation using comparable sales? →
          </button>
        </div>
      )}
    </motion.div>
  );
}
