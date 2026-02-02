'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Zap } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSessionId } from '@/lib/session';

// Month options
const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Generate years from 2025 down to 1980
const YEARS = Array.from({ length: 2025 - 1980 + 1 }, (_, i) => 2025 - i);

// Default regions (will be replaced with API data)
// Organized by region with Durham first as requested
const DEFAULT_REGIONS = [
  // Durham Region
  'Ajax',
  'Brock',
  'Clarington',
  'Oshawa',
  'Pickering',
  'Scugog',
  'Uxbridge',
  'Whitby',
  // Halton Region
  'Burlington',
  'Halton Hills',
  'Milton',
  'Oakville',
  // Peel Region
  'Brampton',
  'Caledon',
  'Mississauga',
  // Toronto West
  'Toronto W01',
  'Toronto W02',
  'Toronto W03',
  'Toronto W04',
  'Toronto W05',
  'Toronto W06',
  'Toronto W07',
  'Toronto W08',
  'Toronto W09',
  'Toronto W10',
  // Toronto Central
  'Toronto C01',
  'Toronto C02',
  'Toronto C03',
  'Toronto C04',
  'Toronto C06',
  'Toronto C07',
  'Toronto C08',
  'Toronto C09',
  'Toronto C10',
  'Toronto C11',
  'Toronto C12',
  'Toronto C13',
  'Toronto C14',
  'Toronto C15',
  // Toronto East
  'Toronto E01',
  'Toronto E02',
  'Toronto E03',
  'Toronto E04',
  'Toronto E05',
  'Toronto E06',
  'Toronto E07',
  'Toronto E08',
  'Toronto E09',
  'Toronto E10',
  'Toronto E11',
  // York Region
  'Aurora',
  'East Gwillimbury',
  'Georgina',
  'King',
  'Markham',
  'Newmarket',
  'Richmond Hill',
  'Vaughan',
  'Whitchurch-Stouffville',
  // Dufferin County
  'Orangeville',
  // Simcoe County
  'Adjala-Tosorontio',
  'Bradford West Gwillimbury',
  'Essa',
  'Innisfil',
  'New Tecumseth',
];

// Default property types
const DEFAULT_PROPERTY_TYPES = [
  'Detached',
  'Semi-Detached',
  'Townhouse',
  'Condo Apt',
];

export function HeroSection() {
  const router = useRouter();

  // Form state
  const [region, setRegion] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [purchaseMonth, setPurchaseMonth] = useState('');
  const [purchaseYear, setPurchaseYear] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  // Options from API
  const [regions, setRegions] = useState<string[]>(DEFAULT_REGIONS);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(DEFAULT_PROPERTY_TYPES);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch options from API
  useEffect(() => {
    async function fetchOptions() {
      try {
        const response = await fetch('/api/hpi-options');
        if (response.ok) {
          const data = await response.json();
          if (data.regions?.length > 0) setRegions(data.regions);
          if (data.propertyTypes?.length > 0) setPropertyTypes(data.propertyTypes);
        }
      } catch (err) {
        console.error('Failed to fetch options:', err);
      } finally {
        setIsLoadingOptions(false);
      }
    }
    fetchOptions();
  }, []);

  // Format price input
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setPurchasePrice(value);
  };

  const formatPrice = (value: string): string => {
    if (!value) return '';
    return parseInt(value, 10).toLocaleString('en-CA');
  };

  // Check if form is valid
  const isFormValid =
    region !== '' &&
    propertyType !== '' &&
    purchaseMonth !== '' &&
    purchaseYear !== '' &&
    purchasePrice !== '' &&
    parseInt(purchasePrice, 10) > 0;

  // Handle form submission
  const handleSubmit = async () => {
    console.log('[HeroSection] Form submit clicked');
    console.log('[HeroSection] isFormValid:', isFormValid);
    console.log('[HeroSection] Form values:', {
      region,
      propertyType,
      purchaseMonth,
      purchaseYear,
      purchasePrice,
    });

    if (!isFormValid) {
      console.log('[HeroSection] Form is not valid, returning');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const sessionId = getSessionId();
      console.log('[HeroSection] Session ID:', sessionId);

      const requestBody = {
        sessionId,
        region,
        propertyType,
        purchaseYear: parseInt(purchaseYear, 10),
        purchaseMonth: parseInt(purchaseMonth, 10),
        purchasePrice: parseInt(purchasePrice, 10),
      };
      console.log('[HeroSection] Sending request:', requestBody);

      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('[HeroSection] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[HeroSection] Error response:', errorData);
        throw new Error(errorData.error || 'Failed to generate estimate');
      }

      const result = await response.json();
      console.log('[HeroSection] Success result:', result);

      // Cache the result in sessionStorage for the results page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `estimate_${result.estimateId}`,
          JSON.stringify(result.result)
        );
        console.log('[HeroSection] Cached result in sessionStorage');
      }

      // Navigate to results page
      router.push(`/results/${result.estimateId}`);
    } catch (err) {
      console.error('[HeroSection] Estimation error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Top Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
            <span className="text-sm text-slate-300 font-medium">
              Historical Market Data: 1980 – Present
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center leading-tight mb-6">
          <span className="text-white">See Exactly </span>
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            How Much Your Home Has Earned
          </span>
          <span className="text-white"> Since You Bought It.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-slate-400 text-center max-w-xl mx-auto mb-10">
          Stop guessing with average stats. Track your specific home&apos;s market performance using official TRREB Index data.
        </p>

        {/* Calculator Card */}
        <div className="relative">
          {/* Card glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-50" />
          
          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="space-y-5">
              {/* Region */}
              <div>
                <Label className="text-slate-300 text-sm font-medium mb-2 block">
                  Region
                </Label>
                <Select value={region} onValueChange={setRegion} disabled={isLoadingOptions}>
                  <SelectTrigger className="w-full h-12 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50">
                    <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select your region'} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                    {regions.map((r) => (
                      <SelectItem 
                        key={r} 
                        value={r}
                        className="text-slate-200 focus:bg-slate-700 focus:text-white"
                      >
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property Type */}
              <div>
                <Label className="text-slate-300 text-sm font-medium mb-2 block">
                  Property Type
                </Label>
                <Select value={propertyType} onValueChange={setPropertyType} disabled={isLoadingOptions}>
                  <SelectTrigger className="w-full h-12 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50">
                    <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select property type'} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {propertyTypes.map((type) => (
                      <SelectItem 
                        key={type} 
                        value={type}
                        className="text-slate-200 focus:bg-slate-700 focus:text-white"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Purchase Date - Month & Year side by side */}
              <div>
                <Label className="text-slate-300 text-sm font-medium mb-2 block">
                  Purchase Date
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={purchaseMonth} onValueChange={setPurchaseMonth}>
                    <SelectTrigger className="w-full h-12 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                      {MONTHS.map((month) => (
                        <SelectItem 
                          key={month.value} 
                          value={month.value}
                          className="text-slate-200 focus:bg-slate-700 focus:text-white"
                        >
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={purchaseYear} onValueChange={setPurchaseYear}>
                    <SelectTrigger className="w-full h-12 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                      {YEARS.map((year) => (
                        <SelectItem 
                          key={year} 
                          value={year.toString()}
                          className="text-slate-200 focus:bg-slate-700 focus:text-white"
                        >
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Purchase Price */}
              <div>
                <Label className="text-slate-300 text-sm font-medium mb-2 block">
                  Purchase Price
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatPrice(purchasePrice)}
                    onChange={handlePriceChange}
                    placeholder="750,000"
                    className="w-full h-12 pl-8 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full h-14 mt-2 relative group overflow-hidden rounded-xl font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Button gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 transition-all duration-300 group-hover:scale-105" />
                
                {/* Button hover glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                
                {/* Button content */}
                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      Reveal My Equity Position
                      <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Trust Signals */}
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Official TRREB Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>No Account Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Results in Seconds</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
