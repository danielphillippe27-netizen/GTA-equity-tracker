'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { HPITrendChart, EquityUnlockForm, MethodologyModal } from '@/components/results';
import { GlowButton, GradientText, InfoTooltip } from '@/components/shared';
import { formatCurrency } from '@/lib/constants';
import { HPIEstimateResult, MarketScenario } from '@/lib/estimation/hpi';

type MarketPhase = 'hot' | 'balanced' | 'soft';

// Extended result type with bridge calculator fields
interface BridgeEstimateResult extends HPIEstimateResult {
  dataEra?: 'historic' | 'hpi';
  dataSource?: string;
  bridgeNote?: string;
  // Regional benchmark prices from market_hpi table
  benchmarkAtPurchase?: number | null;
  benchmarkAtPurchaseDate?: string | null;
  benchmarkCurrent?: number | null;
  benchmarkCurrentDate?: string | null;
}

interface ApiHPIResult {
  estimateId: string;
  result: BridgeEstimateResult;
}

export default function ResultsPage() {
  const params = useParams();
  const estimateId = params.sessionId as string;

  const [result, setResult] = useState<BridgeEstimateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<MarketPhase>('balanced');

  // Ref to prevent double-fetch in React Strict Mode
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double-fetch in React Strict Mode
    if (hasFetchedRef.current) {
      console.log('[ResultsPage] Already fetched, skipping');
      return;
    }

    async function fetchEstimate() {
      hasFetchedRef.current = true;

      // First check sessionStorage for cached result
      if (typeof window !== 'undefined') {
        const cachedResult = sessionStorage.getItem(`estimate_${estimateId}`);
        if (cachedResult) {
          console.log('[ResultsPage] Found cached result in sessionStorage');
          try {
            const parsed = JSON.parse(cachedResult) as BridgeEstimateResult;
            setResult(parsed);
            setLoading(false);
            // Clear the cache after successful use
            sessionStorage.removeItem(`estimate_${estimateId}`);
            return;
          } catch (parseErr) {
            console.error('[ResultsPage] Failed to parse cached result:', parseErr);
          }
        }
      }

      // If no cache, try fetching from API
      console.log('[ResultsPage] No cache found, fetching from API');
      try {
        const response = await fetch(`/api/estimate?id=${estimateId}`);
        
        if (!response.ok) {
          throw new Error('Estimate not found');
        }

        const data: ApiHPIResult = await response.json();
        setResult(data.result);
      } catch (err) {
        console.error('[ResultsPage] Failed to fetch estimate:', err);
        setError('Unable to load your estimate. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (estimateId) {
      fetchEstimate();
    }
  }, [estimateId]);

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent-blue mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your estimate...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !result) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Estimate Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || "We couldn't find this estimate. It may have expired or the link is incorrect."}
          </p>
          <Link href="/">
            <GlowButton>Start a New Estimate</GlowButton>
          </Link>
        </div>
      </main>
    );
  }

  // Get current scenario data
  const currentScenario: MarketScenario = result.scenarios?.[selectedScenario] || {
    value: result.estimatedCurrentValue,
    equity: result.equityGained,
    adjustment: 0,
    label: 'Current Estimate',
  };

  // Format purchase date
  const purchaseDateFormatted = new Date(result.input.purchaseYear, result.input.purchaseMonth - 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <main className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-hero-gradient opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-foreground">
            GTA Equity Tracker
          </Link>
          <Link href="/">
            <GlowButton variant="ghost" size="sm">
              New Estimate
            </GlowButton>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-16">
        {/* Hero Section */}
        <section className="relative py-8 sm:py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm text-muted-foreground mb-2">
              Your Market-Indexed Equity Report
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
              {result.input.region} &bull; {result.input.propertyType}
            </h1>
            <p className="text-sm text-muted-foreground">
              Purchased {purchaseDateFormatted}
            </p>
          </motion.div>
        </section>

        {/* Main Estimate Card */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20">
            {/* Main Value Display */}
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mb-1">Estimated Current Value</p>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">
                <GradientText>{formatCurrency(currentScenario.value)}</GradientText>
              </div>
              
              {/* How is this calculated? Link */}
              <button
                onClick={() => setShowMethodology(true)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent-cyan transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How is this calculated?
              </button>
            </div>

            {/* Equity Display */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Original Purchase</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(result.input.purchasePrice)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Equity Gained</p>
                <p className={`text-xl font-bold ${currentScenario.equity >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {currentScenario.equity >= 0 ? '+' : ''}{formatCurrency(currentScenario.equity)}
                </p>
              </div>
            </div>

            {/* Scenario Toggles */}
            <div className="border-t border-accent-blue/20 pt-6">
              <p className="text-xs text-muted-foreground text-center mb-4">
                Market Scenario
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <ScenarioButton
                  scenario="hot"
                  label="Hot Market"
                  adjustment="+4%"
                  color="orange"
                  selected={selectedScenario === 'hot'}
                  onClick={() => setSelectedScenario('hot')}
                />
                <ScenarioButton
                  scenario="balanced"
                  label="Balanced"
                  adjustment="±0%"
                  color="blue"
                  selected={selectedScenario === 'balanced'}
                  onClick={() => setSelectedScenario('balanced')}
                />
                <ScenarioButton
                  scenario="soft"
                  label="Soft Market"
                  adjustment="-8%"
                  color="teal"
                  selected={selectedScenario === 'soft'}
                  onClick={() => setSelectedScenario('soft')}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                {selectedScenario === 'balanced' 
                  ? 'Current market conditions' 
                  : selectedScenario === 'hot'
                  ? 'If demand increases this spring'
                  : 'If inventory rises significantly'}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Key Metrics */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="p-4 rounded-xl bg-surface border border-border text-center">
            <p className="text-xs text-muted-foreground mb-1">ROI</p>
            <p className={`text-lg font-bold ${result.roiPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {result.roiPercent >= 0 ? '+' : ''}{result.roiPercent}%
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-xs text-muted-foreground">Your Growth</p>
              <InfoTooltip 
                content="Your growth reflects your specific property's estimated value change based on regional HPI movement. Individual results may vary from market averages based on purchase price timing and property characteristics."
              />
            </div>
            <p className="text-lg font-bold text-foreground">
              {result.appreciationFactor.toFixed(2)}x
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-xs text-muted-foreground">Market Growth (HPI)</p>
              <InfoTooltip 
                content="The Home Price Index tracks average market movement for this area. Your results may differ based on your specific purchase price, property condition, and timing."
              />
            </div>
            <p className={`text-lg font-bold ${result.hpiCurrent >= result.hpiAtPurchase ? 'text-green-400' : 'text-red-400'}`}>
              {result.hpiCurrent >= result.hpiAtPurchase ? '+' : ''}
              {((result.hpiCurrent / result.hpiAtPurchase - 1) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.hpiAtPurchase.toFixed(1)} → {result.hpiCurrent.toFixed(1)}
            </p>
          </div>
        </motion.div>

        {/* HPI Trend Chart */}
        {result.hpiTrend && result.hpiTrend.length > 0 && (
          <HPITrendChart
            data={result.hpiTrend}
            purchaseDate={`${result.input.purchaseYear}-${result.input.purchaseMonth.toString().padStart(2, '0')}`}
            purchaseHPI={result.hpiAtPurchase}
            currentHPI={result.hpiCurrent}
            className="mb-8"
          />
        )}

        {/* Equity Unlock Form */}
        <EquityUnlockForm
          purchasePrice={result.input.purchasePrice}
          purchaseYear={result.input.purchaseYear}
          purchaseMonth={result.input.purchaseMonth}
          estimatedCurrentValue={currentScenario.value}
          estimateId={estimateId}
          region={result.input.region}
          propertyType={result.input.propertyType}
          className="mb-8"
        />

      </div>

      {/* Methodology Modal */}
      <MethodologyModal
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        hpiAtPurchase={result.hpiAtPurchase}
        hpiCurrent={result.hpiCurrent}
        appreciationFactor={result.appreciationFactor}
      />
    </main>
  );
}

// Scenario Toggle Button Component
function ScenarioButton({
  scenario,
  label,
  adjustment,
  color,
  selected,
  onClick,
}: {
  scenario: string;
  label: string;
  adjustment: string;
  color: 'orange' | 'blue' | 'teal';
  selected: boolean;
  onClick: () => void;
}) {
  const colorClasses = {
    orange: selected 
      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' 
      : 'bg-transparent border-border hover:border-orange-500/30 text-muted-foreground',
    blue: selected 
      ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-cyan' 
      : 'bg-transparent border-border hover:border-accent-blue/30 text-muted-foreground',
    teal: selected 
      ? 'bg-teal-500/20 border-teal-500/50 text-teal-400' 
      : 'bg-transparent border-border hover:border-teal-500/30 text-muted-foreground',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${colorClasses[color]}`}
    >
      <span className="block">{label}</span>
      <span className="block text-xs opacity-70">{adjustment}</span>
    </button>
  );
}
