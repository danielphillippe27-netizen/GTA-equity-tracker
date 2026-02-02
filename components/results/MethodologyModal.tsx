'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientText } from '@/components/shared';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  hpiAtPurchase: number;
  hpiCurrent: number;
  appreciationFactor: number;
}

const SLIDES = [
  {
    id: 'understanding',
    title: 'Understanding Home Value Estimates',
    subtitle: 'What you should know about how this works',
  },
  {
    id: 'cycles',
    title: 'How GTA Market Cycles Work',
    subtitle: 'Market phases that affect home values',
  },
  {
    id: 'methodology',
    title: 'Our Data & Methodology',
    subtitle: 'The sources and math behind your estimate',
  },
];

export function MethodologyModal({
  isOpen,
  onClose,
  hpiAtPurchase,
  hpiCurrent,
  appreciationFactor,
}: MethodologyModalProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderSlideContent = () => {
    switch (activeSlide) {
      case 0:
        return <UnderstandingSlide />;
      case 1:
        return <MarketCyclesSlide />;
      case 2:
        return (
          <MethodologySlide
            hpiAtPurchase={hpiAtPurchase}
            hpiCurrent={hpiCurrent}
            appreciationFactor={appreciationFactor}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
      >
        <motion.div
          className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-surface border border-border"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {SLIDES[activeSlide].title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {SLIDES[activeSlide].subtitle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Slide indicators */}
            <div className="flex gap-2 mt-4">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => setActiveSlide(index)}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    index === activeSlide
                      ? 'bg-gradient-to-r from-accent-blue to-accent-cyan'
                      : 'bg-muted/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-160px)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderSlideContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer navigation */}
          <div className="sticky bottom-0 bg-surface/90 backdrop-blur-sm border-t border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                disabled={activeSlide === 0}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                {activeSlide + 1} of {SLIDES.length}
              </span>
              {activeSlide < SLIDES.length - 1 ? (
                <button
                  onClick={() => setActiveSlide(activeSlide + 1)}
                  className="px-4 py-2 text-sm font-medium text-accent-cyan hover:text-accent-blue transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-accent-blue to-accent-cyan text-white rounded-lg"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Slide 1: Understanding Estimates
function UnderstandingSlide() {
  const features = [
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Estimates, Not Evaluations',
      description: "We provide market-based estimates using historical HPI data. For an official evaluation, speak with a licensed realtor.",
      link: { text: "Book a consultation", url: "https://calendly.com/daniel-phillippe/discovery-call" },
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: 'Based on Home Price Index',
      description: "HPI tracks price changes for similar properties over time, providing a more accurate measure than raw sale prices.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'A Moment in Time',
      description: "Your estimate reflects today's market conditions. Values change as the market evolves.",
    },
  ];

  return (
    <div className="space-y-4">
      {features.map((feature, index) => (
        <motion.div
          key={feature.title}
          className="flex gap-4 p-4 rounded-xl bg-muted/20 border border-border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center text-accent-cyan">
            {feature.icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{feature.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {feature.description}
              {'link' in feature && feature.link && (
                <>
                  {' '}
                  <a
                    href={feature.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-cyan hover:text-accent-blue underline transition-colors"
                  >
                    {feature.link.text}
                  </a>
                </>
              )}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Slide 2: Market Cycles
function MarketCyclesSlide() {
  const phases = [
    {
      name: 'Hot Market',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      description: 'Strong demand, rising prices, homes sell quickly above asking.',
      adjustment: '+4%',
    },
    {
      name: 'Balanced Market',
      color: 'from-accent-blue to-accent-cyan',
      bgColor: 'bg-accent-blue/10',
      borderColor: 'border-accent-blue/30',
      description: 'Equilibrium between buyers and sellers. Homes sell near asking.',
      adjustment: '±0%',
    },
    {
      name: 'Soft Market',
      color: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/30',
      description: 'More inventory, longer selling times. Buyers have leverage.',
      adjustment: '-8%',
    },
  ];

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => (
        <motion.div
          key={phase.name}
          className={`p-4 rounded-xl border ${phase.borderColor} ${phase.bgColor}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${phase.color}`} />
                <h3 className="font-semibold text-foreground">{phase.name}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{phase.description}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="text-xs text-muted-foreground">Adjustment</span>
              <p className="font-mono font-semibold text-foreground">{phase.adjustment}</p>
            </div>
          </div>
        </motion.div>
      ))}

      <motion.div
        className="mt-6 p-4 rounded-xl bg-surface/50 border border-border text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-sm text-muted-foreground">
          Use the scenario toggles on your results to see how different market conditions could affect your home&apos;s value.
        </p>
      </motion.div>
    </div>
  );
}

// Slide 3: Methodology
function MethodologySlide({
  hpiAtPurchase,
  hpiCurrent,
  appreciationFactor,
}: {
  hpiAtPurchase: number;
  hpiCurrent: number;
  appreciationFactor: number;
}) {
  return (
    <div className="space-y-6">
      {/* Data sources */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Data Sources</h4>
        <div className="flex gap-4 p-4 rounded-xl bg-muted/20 border border-border">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">TRREB Official Data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Our HPI data comes from the Toronto Regional Real Estate Board, the authoritative source for GTA real estate statistics.
            </p>
          </div>
        </div>
      </div>

      {/* The math */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">The Calculation</h4>
        <div className="p-4 rounded-xl bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">{hpiAtPurchase.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">HPI at Purchase</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">→</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                <GradientText>{hpiCurrent.toFixed(1)}</GradientText>
              </div>
              <div className="text-xs text-muted-foreground">HPI Today</div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-accent-blue/20 text-center">
            <div className="text-sm text-muted-foreground mb-1">Appreciation Factor</div>
            <div className="text-3xl font-bold">
              <GradientText>{appreciationFactor.toFixed(3)}x</GradientText>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Your purchase price × {appreciationFactor.toFixed(3)} = Estimated current value
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <div className="text-xl font-bold"><GradientText>45+</GradientText></div>
          <div className="text-xs text-muted-foreground">Years of Data</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <div className="text-sm font-bold"><GradientText>Greater Toronto Area</GradientText></div>
          <div className="text-xs text-muted-foreground">Coverage</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <div className="text-xl font-bold"><GradientText>Live</GradientText></div>
          <div className="text-xs text-muted-foreground">Data</div>
        </div>
      </div>
    </div>
  );
}
