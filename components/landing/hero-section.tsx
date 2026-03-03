'use client';

import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Info, Lock, Minus, Plus, Shield, Zap } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { formatCurrency } from '@/lib/constants';
import { getHistoricalRate } from '@/lib/data/historical-rates';
import {
  calculateMortgageSummary,
} from '@/lib/calculation/mortgage-calculator';
import { setPendingEstimate } from '@/lib/estimate-storage';

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

const YEARS = Array.from({ length: 2025 - 1980 + 1 }, (_, i) => 2025 - i);

const DEFAULT_REGIONS = [
  'Ajax',
  'Brock',
  'Clarington',
  'Oshawa',
  'Pickering',
  'Scugog',
  'Uxbridge',
  'Whitby',
  'Burlington',
  'Halton Hills',
  'Milton',
  'Oakville',
  'Brampton',
  'Caledon',
  'Mississauga',
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
  'Aurora',
  'East Gwillimbury',
  'Georgina',
  'King',
  'Markham',
  'Newmarket',
  'Richmond Hill',
  'Vaughan',
  'Whitchurch-Stouffville',
  'Orangeville',
  'Adjala-Tosorontio',
  'Bradford West Gwillimbury',
  'Essa',
  'Innisfil',
  'New Tecumseth',
];

const DEFAULT_PROPERTY_TYPES = [
  'Detached',
  'Semi-Detached',
  'Townhouse',
  'Condo Apt',
];

type NeighborhoodOption = {
  id: string;
  display_name: string;
  parent_display_name: string;
};

export function HeroSection() {
  const router = useRouter();

  const [region, setRegion] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [purchaseMonth, setPurchaseMonth] = useState('');
  const [purchaseYear, setPurchaseYear] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [regions, setRegions] = useState<string[]>(DEFAULT_REGIONS);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(DEFAULT_PROPERTY_TYPES);
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<NeighborhoodOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const [interestRate, setInterestRate] = useState(4.79);
  const [amortization, setAmortization] = useState('25');
  const [downPaymentMode, setDownPaymentMode] = useState<'$' | '%'>('%');
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [downPaymentAmount, setDownPaymentAmount] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedPurchasePrice = purchasePrice ? parseInt(purchasePrice, 10) : 0;
  const parsedPurchaseYear = purchaseYear ? parseInt(purchaseYear, 10) : 0;
  const parsedPurchaseMonth = purchaseMonth ? parseInt(purchaseMonth, 10) : 0;
  const defaultRate = parsedPurchaseYear ? getHistoricalRate(parsedPurchaseYear) : 4.79;
  const filteredNeighborhoods = useMemo(
    () => neighborhoodOptions.filter((option) => option.parent_display_name === region),
    [neighborhoodOptions, region]
  );

  useEffect(() => {
    async function fetchOptions() {
      try {
        const response = await fetch('/api/hpi-options');
        if (response.ok) {
          const data = await response.json();
          if (data.regions?.length > 0) {
            setRegions(data.regions);
          }
          if (data.propertyTypes?.length > 0) {
            setPropertyTypes(data.propertyTypes);
          }
          if (data.neighborhoodOptions?.length > 0) {
            setNeighborhoodOptions(data.neighborhoodOptions);
          }
        }
      } catch (fetchError) {
        console.error('Failed to fetch options:', fetchError);
      } finally {
        setIsLoadingOptions(false);
      }
    }

    fetchOptions();
  }, []);

  useEffect(() => {
    if (
      neighborhood &&
      !filteredNeighborhoods.some((option) => option.display_name === neighborhood)
    ) {
      setNeighborhood('');
    }
  }, [filteredNeighborhoods, neighborhood]);

  useEffect(() => {
    if (!parsedPurchaseYear) {
      return;
    }

    setInterestRate(defaultRate);
  }, [defaultRate, parsedPurchaseYear]);

  useEffect(() => {
    if (!parsedPurchasePrice) {
      setDownPaymentAmount(0);
      return;
    }

    if (downPaymentMode === '%') {
      setDownPaymentAmount(parsedPurchasePrice * (downPaymentPercent / 100));
    }
  }, [downPaymentMode, downPaymentPercent, parsedPurchasePrice]);

  const effectiveDownPayment = useMemo(() => {
    if (!parsedPurchasePrice) {
      return 0;
    }

    if (downPaymentMode === '%') {
      return parsedPurchasePrice * (downPaymentPercent / 100);
    }

    return downPaymentAmount;
  }, [
    downPaymentAmount,
    downPaymentMode,
    downPaymentPercent,
    parsedPurchasePrice,
  ]);

  const mortgageSummary = useMemo(() => {
    if (!parsedPurchasePrice || !parsedPurchaseYear || !parsedPurchaseMonth) {
      return null;
    }

    return calculateMortgageSummary({
      purchasePrice: parsedPurchasePrice,
      purchaseYear: parsedPurchaseYear,
      purchaseMonth: parsedPurchaseMonth,
      interestRate,
      amortizationYears: parseInt(amortization, 10),
      downPaymentAmount: effectiveDownPayment,
    });
  }, [
    amortization,
    effectiveDownPayment,
    interestRate,
    parsedPurchaseMonth,
    parsedPurchasePrice,
    parsedPurchaseYear,
  ]);

  const isPropertyFormValid =
    region !== '' &&
    propertyType !== '' &&
    purchaseMonth !== '' &&
    purchaseYear !== '' &&
    parsedPurchasePrice > 0;

  const isContactValid = name.trim() !== '' && email.includes('@');
  const isFormValid = isPropertyFormValid && isContactValid;

  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setPurchasePrice(value);
  };

  const formatPriceInput = (value: string): string => {
    if (!value) {
      return '';
    }

    return parseInt(value, 10).toLocaleString('en-CA');
  };

  const adjustRate = (delta: number) => {
    setInterestRate((previous) =>
      Math.max(0.5, Math.min(12, Math.round((previous + delta) * 100) / 100))
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const pendingEstimate = {
      name: name.trim(),
      email: email.trim(),
        propertyData: {
          region,
          neighborhood: neighborhood || undefined,
          propertyType,
          purchaseYear: parsedPurchaseYear,
          purchaseMonth: parsedPurchaseMonth,
        purchasePrice: parsedPurchasePrice,
        mortgageAssumptions: {
          interestRate,
          amortization: parseInt(amortization, 10),
          downPayment: effectiveDownPayment,
        },
      },
    };

    setPendingEstimate(pendingEstimate);

    try {
      router.push('/estimate');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
            <span className="text-sm text-slate-300 font-medium">
              Historical Market Data: 1980 - Present
            </span>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center leading-tight mb-6">
          <span className="text-white">See Exactly </span>
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            How Much Your Home Has Earned
          </span>
          <span className="text-white"> Since You Bought It.</span>
        </h1>

        <p className="text-lg text-slate-400 text-center max-w-xl mx-auto mb-10">
          Stop guessing with average stats. Track your specific home&apos;s market performance using official TRREB Index data.
        </p>

        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-50" />

          <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="space-y-5">
              <div>
                <Label className="text-slate-300 text-sm font-medium mb-2 block">
                  Region
                </Label>
                <Select
                  value={region}
                  onValueChange={(value) => {
                    setRegion(value);
                    setNeighborhood('');
                  }}
                  disabled={isLoadingOptions}
                >
                  <SelectTrigger className="w-full h-12 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50">
                    <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select your region'} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                    {regions.map((currentRegion) => (
                      <SelectItem
                        key={currentRegion}
                        value={currentRegion}
                        className="text-slate-200 focus:bg-slate-700 focus:text-white"
                      >
                        {currentRegion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {region && filteredNeighborhoods.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-slate-300 text-sm font-medium block">
                      Neighborhood
                    </Label>
                    {neighborhood && (
                      <button
                        type="button"
                        onClick={() => setNeighborhood('')}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <Select value={neighborhood} onValueChange={setNeighborhood}>
                    <SelectTrigger className="w-full h-12 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50">
                      <SelectValue placeholder="Select neighborhood (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                      {filteredNeighborhoods.map((currentNeighborhood) => (
                        <SelectItem
                          key={currentNeighborhood.id}
                          value={currentNeighborhood.display_name}
                          className="text-slate-200 focus:bg-slate-700 focus:text-white"
                        >
                          {currentNeighborhood.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-slate-300 text-sm font-medium mb-2 block">
                  Property Type
                </Label>
                <Select
                  value={propertyType}
                  onValueChange={setPropertyType}
                  disabled={isLoadingOptions}
                >
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
                    value={formatPriceInput(purchasePrice)}
                    onChange={handlePriceChange}
                    placeholder="750,000"
                    className="w-full h-12 pl-8 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <p className="text-sm font-medium text-white">
                    Your Mortgage Assumptions
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-slate-400">
                          Interest Rate
                        </Label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustRate(-0.25)}
                            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:border-cyan-500/40 transition-colors"
                          >
                            <Minus className="w-4 h-4 text-slate-300" />
                          </button>
                          <span className="w-16 text-center font-mono text-sm font-medium text-white">
                            {interestRate.toFixed(2)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustRate(0.25)}
                            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:border-cyan-500/40 transition-colors"
                          >
                            <Plus className="w-4 h-4 text-slate-300" />
                          </button>
                        </div>
                      </div>
                      <Slider
                        value={[interestRate]}
                        min={0.5}
                        max={12}
                        step={0.25}
                        onValueChange={([value]) => setInterestRate(value)}
                        className="mt-2"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Avg. 5-year fixed rate in {parsedPurchaseYear || 'that year'}: {defaultRate.toFixed(2)}%
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="amortization" className="text-xs text-slate-400">
                        Amortization
                      </Label>
                      <Select value={amortization} onValueChange={setAmortization}>
                        <SelectTrigger className="mt-1.5 bg-slate-800/50 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="15">15 years</SelectItem>
                          <SelectItem value="20">20 years</SelectItem>
                          <SelectItem value="25">25 years</SelectItem>
                          <SelectItem value="30">30 years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-slate-400">
                        Down Payment
                      </Label>
                      <div className="flex items-center gap-1 bg-slate-900 rounded-md p-0.5 border border-slate-700">
                        <button
                          type="button"
                          onClick={() => setDownPaymentMode('%')}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            downPaymentMode === '%'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setDownPaymentMode('$')}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            downPaymentMode === '$'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'text-slate-400 hover:text-white'
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
                            onValueChange={([value]) => {
                              setDownPaymentPercent(value);
                              setDownPaymentAmount(parsedPurchasePrice * (value / 100));
                            }}
                            className="flex-1"
                          />
                          <span className="w-16 text-right font-mono text-sm font-medium text-white">
                            {downPaymentPercent}%
                          </span>
                        </>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          value={downPaymentAmount || ''}
                          onChange={(e) => {
                            const nextAmount = parseFloat(e.target.value) || 0;
                            setDownPaymentAmount(nextAmount);
                            setDownPaymentPercent(
                              parsedPurchasePrice
                                ? Math.round((nextAmount / parsedPurchasePrice) * 100)
                                : 0
                            );
                          }}
                          className="bg-slate-800/50 border-slate-700 text-white"
                          placeholder={parsedPurchasePrice ? String(parsedPurchasePrice * 0.2) : '150000'}
                        />
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-2">
                      = {formatCurrency(effectiveDownPayment)} ({parsedPurchasePrice ? ((effectiveDownPayment / parsedPurchasePrice) * 100).toFixed(0) : 0}% of purchase price)
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    We use these assumptions to calculate your remaining mortgage balance and net equity after sign-in.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4">
                      <p className="text-xs text-slate-500 mb-1">Down Payment</p>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(effectiveDownPayment)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4">
                      <p className="text-xs text-slate-500 mb-1">Est. Mortgage Balance</p>
                      <p className="text-lg font-semibold text-white">
                        {mortgageSummary ? formatCurrency(mortgageSummary.remainingBalance) : '--'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4">
                      <p className="text-xs text-slate-500 mb-1">Est. Net Equity</p>
                      <p className="text-lg font-semibold text-slate-400">
                        Sign in to unlock
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700/50 pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <p className="text-sm font-medium text-white">
                    Sign in to view your results
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="name" className="text-slate-300 text-sm font-medium mb-2 block">
                      Your Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-slate-300 text-sm font-medium mb-2 block">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 hover:bg-slate-800 focus:ring-cyan-500/30 focus:border-cyan-500/50"
                    />
                  </div>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed">
                  We use official Toronto Regional Real Estate Board data to estimate your home&apos;s value. Our licensing requires that access to this report is tied to a named user account, so we can&apos;t make the underlying data publicly available or share it anonymously.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full h-14 mt-2 relative group overflow-hidden rounded-xl font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 transition-all duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />

                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Opening results...
                    </>
                  ) : (
                    <>
                      Continue To My Equity Position
                      <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Official TRREB Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>Secure Sign-In Required</span>
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
