'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AddressComponents {
  street_number?: string;
  street_name?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  full_address: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, components?: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

interface Suggestion {
  id: string;
  place_name: string;
  text: string;
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

// Mapbox feature type for API response
interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing your address...',
  className,
  disabled = false,
  error,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch suggestions from Mapbox
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!mapboxToken || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);

      try {
        // Focus on GTA region with bbox
        const bbox = '-80.5,43.4,-78.5,44.3'; // Approximate GTA bounding box
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxToken}&country=ca&bbox=${bbox}&types=address&limit=5`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.features) {
          setSuggestions(
            data.features.map((feature: MapboxFeature) => ({
              id: feature.id,
              place_name: feature.place_name,
              text: feature.text,
              context: feature.context,
            }))
          );
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [mapboxToken]
  );

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setHighlightedIndex(-1);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Parse address components from Mapbox response
  const parseAddressComponents = (suggestion: Suggestion): AddressComponents => {
    const components: AddressComponents = {
      full_address: suggestion.place_name,
    };

    // Extract street number and name from text
    const streetMatch = suggestion.text.match(/^(\d+)\s+(.+)$/);
    if (streetMatch) {
      components.street_number = streetMatch[1];
      components.street_name = streetMatch[2];
    } else {
      components.street_name = suggestion.text;
    }

    // Extract from context
    if (suggestion.context) {
      for (const ctx of suggestion.context) {
        if (ctx.id.startsWith('place')) {
          components.city = ctx.text;
        } else if (ctx.id.startsWith('region')) {
          components.province = ctx.short_code?.replace('CA-', '') || ctx.text;
        } else if (ctx.id.startsWith('postcode')) {
          components.postal_code = ctx.text;
        } else if (ctx.id.startsWith('country')) {
          components.country = ctx.text;
        }
      }
    }

    return components;
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: Suggestion) => {
    const components = parseAddressComponents(suggestion);
    setInputValue(suggestion.place_name);
    onChange(suggestion.place_name, components);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const showFallbackInput = !mapboxToken;

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={showFallbackInput ? 'Enter your address' : placeholder}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-surface border border-border',
            'text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent',
            'transition-all duration-200',
            error && 'border-destructive focus:ring-destructive',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="address-suggestions"
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-accent-blue" />
          </div>
        )}

        {/* Location icon */}
        {!isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-sm text-destructive">{error}</p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className={cn(
            'absolute z-50 mt-2 w-full overflow-hidden rounded-xl',
            'bg-surface-elevated border border-border shadow-xl shadow-black/20',
            'max-h-60 overflow-y-auto'
          )}
          role="listbox"
          id="address-suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              role="option"
              aria-selected={highlightedIndex === index}
              className={cn(
                'px-4 py-3 cursor-pointer transition-colors',
                'border-b border-border last:border-b-0',
                highlightedIndex === index
                  ? 'bg-accent-blue/10 text-foreground'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              )}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 mt-0.5 flex-shrink-0 text-accent-blue"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
                <span className="text-sm leading-tight">
                  {suggestion.place_name}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Mapbox attribution */}
      {!showFallbackInput && (
        <p className="mt-1 text-[10px] text-muted-foreground/50">
          Powered by Mapbox
        </p>
      )}
    </div>
  );
}
