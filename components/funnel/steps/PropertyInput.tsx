'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StepContent } from '../StepWrapper';
import { useFunnel } from '../FunnelProvider';
import { GradientText } from '@/components/shared';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Month names for the selector
const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// Generate year options (2005 to current year)
const currentYear = new Date().getFullYear();
const YEARS = Array.from(
  { length: currentYear - 2004 },
  (_, i) => currentYear - i
);

export function PropertyInput() {
  const { data, updateData, error } = useFunnel();
  const [regions, setRegions] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // Fetch available regions and property types from the database
  useEffect(() => {
    async function fetchOptions() {
      setIsLoadingOptions(true);
      try {
        const response = await fetch('/api/hpi-options');
        if (response.ok) {
          const data = await response.json();
          setRegions(data.regions || []);
          setPropertyTypes(data.propertyTypes || []);
        }
      } catch (err) {
        console.error('Failed to fetch HPI options:', err);
        // Set fallback options
        setRegions(['Brampton', 'Mississauga', 'City of Toronto']);
        setPropertyTypes(['Detached', 'Semi-Detached', 'Townhouse', 'Condo Apt']);
      } finally {
        setIsLoadingOptions(false);
      }
    }
    fetchOptions();
  }, []);

  // Handle purchase price change
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const numValue = value ? parseInt(value, 10) : null;
    updateData({ purchasePrice: numValue });
  };

  // Format price for display
  const formatPriceInput = (value: number | null): string => {
    if (value === null) return '';
    return value.toLocaleString('en-CA');
  };

  return (
    <StepContent
      title="Your Property Details"
      description="Tell us about your purchase to calculate your equity based on HPI data."
    >
      <div className="space-y-6">
        {/* Region */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Label htmlFor="region" className="text-foreground mb-2 block">
            Region / Area
          </Label>
          <Select
            value={data.region}
            onValueChange={(value) => updateData({ region: value })}
            disabled={isLoadingOptions}
          >
            <SelectTrigger className="w-full bg-surface border-border">
              <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select region...'} />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-surface-elevated border-border">
              {regions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Property Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Label htmlFor="propertyType" className="text-foreground mb-2 block">
            Property Type
          </Label>
          <Select
            value={data.propertyType}
            onValueChange={(value) => updateData({ propertyType: value })}
            disabled={isLoadingOptions}
          >
            <SelectTrigger className="w-full bg-surface border-border">
              <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select property type...'} />
            </SelectTrigger>
            <SelectContent className="bg-surface-elevated border-border">
              {propertyTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Purchase Date - Month and Year side by side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Label className="text-foreground mb-2 block">
            Purchase Date
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {/* Month */}
            <Select
              value={data.purchaseMonth?.toString() ?? ''}
              onValueChange={(value) =>
                updateData({ purchaseMonth: parseInt(value, 10) })
              }
            >
              <SelectTrigger className="w-full bg-surface border-border">
                <SelectValue placeholder="Month..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-surface-elevated border-border">
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year */}
            <Select
              value={data.purchaseYear?.toString() ?? ''}
              onValueChange={(value) =>
                updateData({ purchaseYear: parseInt(value, 10) })
              }
            >
              <SelectTrigger className="w-full bg-surface border-border">
                <SelectValue placeholder="Year..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-surface-elevated border-border">
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Purchase Price */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Label htmlFor="purchasePrice" className="text-foreground mb-2 block">
            Purchase Price
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="purchasePrice"
              type="text"
              inputMode="numeric"
              value={formatPriceInput(data.purchasePrice)}
              onChange={handlePriceChange}
              placeholder="e.g., 750,000"
              className="pl-7 bg-surface border-border"
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            The amount you paid when you purchased the property.
          </p>
        </motion.div>

        {/* Error display */}
        {error && (
          <motion.div
            className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* Info note */}
        <motion.div
          className="p-4 rounded-xl bg-surface/50 border border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-accent-cyan flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm text-muted-foreground">
                <GradientText className="font-medium">HPI-based estimation.</GradientText>{' '}
                We use the Home Price Index to track how property values in your region and category have changed since your purchase.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </StepContent>
  );
}
