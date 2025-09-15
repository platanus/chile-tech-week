'use client';

import { countries } from 'country-data-list';
import { CheckIcon, ChevronDown, Globe } from 'lucide-react';
import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { CircleFlag } from 'react-circle-flags';
import { Button } from '@/src/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/src/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/components/ui/popover';
import { cn } from '@/src/lib/utils';

// Country interface
export interface Country {
  alpha2: string;
  alpha3: string;
  countryCallingCodes: string[];
  currencies: string[];
  emoji?: string;
  ioc: string;
  languages: string[];
  name: string;
  status: string;
}

// Dropdown props
interface CountryDropdownProps {
  options?: Country[];
  onChange?: (country: Country) => void;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  slim?: boolean;
}

const CountryDropdownComponent = forwardRef<
  HTMLButtonElement,
  CountryDropdownProps
>(
  (
    {
      options = countries.all.filter(
        (country: Country) =>
          country.emoji &&
          country.status !== 'deleted' &&
          country.ioc !== 'PRK',
      ),
      onChange,
      value,
      defaultValue,
      disabled = false,
      placeholder = 'Select a country',
      slim = false,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(
      undefined,
    );

    useEffect(() => {
      const countryCode = value || defaultValue;
      if (countryCode) {
        const initialCountry = options.find(
          (country) =>
            country.alpha2 === countryCode ||
            country.alpha3 === countryCode ||
            country.alpha2.toLowerCase() === countryCode.toLowerCase(),
        );
        if (initialCountry) {
          setSelectedCountry(initialCountry);
        } else {
          setSelectedCountry(undefined);
        }
      } else {
        setSelectedCountry(undefined);
      }
    }, [value, defaultValue, options]);

    const handleSelect = useCallback(
      (country: Country) => {
        setSelectedCountry(country);
        onChange?.(country);
        setOpen(false);
      },
      [onChange],
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('justify-between font-normal', slim && 'w-20 px-2')}
            {...props}
          >
            {selectedCountry ? (
              <div className="flex items-center gap-2">
                <CircleFlag
                  countryCode={selectedCountry.alpha2.toLowerCase()}
                  height="16"
                  width="16"
                  className="rounded-sm"
                />
                {!slim && <span>{selectedCountry.name}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {!slim && (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </div>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {options.map((country) => (
                  <CommandItem
                    key={country.alpha2}
                    value={`${country.name} ${country.alpha2} ${country.alpha3}`}
                    onSelect={() => handleSelect(country)}
                    className="flex items-center gap-2"
                  >
                    <CircleFlag
                      countryCode={country.alpha2.toLowerCase()}
                      height="16"
                      width="16"
                      className="rounded-sm"
                    />
                    <span>{country.name}</span>
                    <CheckIcon
                      className={cn(
                        'ml-auto h-4 w-4',
                        selectedCountry?.alpha2 === country.alpha2
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

CountryDropdownComponent.displayName = 'CountryDropdown';

export { CountryDropdownComponent as CountryDropdown };
export type { CountryDropdownProps };
