'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
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
import { SANTIAGO_COMMUNES } from '@/src/lib/constants/communes';
import { cn } from '@/src/lib/utils';

interface CommuneSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  variant?: 'default' | 'admin';
}

export function CommuneSelector({
  value,
  onChange,
  disabled = false,
  variant = 'default',
}: CommuneSelectorProps) {
  const [open, setOpen] = useState(false);

  const isAdmin = variant === 'admin';

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            isAdmin
              ? 'border-2 border-white bg-black font-mono text-white hover:bg-white hover:text-black'
              : 'h-10 border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-50 hover:text-black focus:border-primary',
            !value && !isAdmin && 'text-gray-500',
          )}
        >
          {value
            ? SANTIAGO_COMMUNES.find((commune) => commune === value)
            : isAdmin
              ? 'Select commune...'
              : 'SELECT COMMUNE'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-[--radix-popover-trigger-width] p-0',
          isAdmin
            ? 'border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]'
            : 'border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]',
        )}
        align="start"
        side="bottom"
        sideOffset={12}
        alignOffset={0}
        avoidCollisions={true}
        collisionPadding={16}
      >
        <Command
          className={cn('border-none', isAdmin ? 'bg-black' : 'bg-white')}
        >
          <CommandInput
            placeholder={isAdmin ? 'Search commune...' : 'SEARCH COMMUNE...'}
            className={cn(
              'h-9 border-0 focus:ring-0',
              isAdmin
                ? 'border-white border-b-2 bg-black font-mono text-white'
                : 'bg-white font-bold font-mono text-black uppercase tracking-wider',
            )}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
          <CommandList
            className={cn(isAdmin ? 'bg-black' : 'max-h-[200px] bg-white')}
          >
            <CommandEmpty
              className={cn(
                'py-6 text-center font-mono text-sm',
                isAdmin
                  ? 'text-white/60'
                  : 'bg-white font-bold text-black uppercase tracking-wider',
              )}
            >
              {isAdmin ? 'No commune found.' : 'NO COMMUNE FOUND.'}
            </CommandEmpty>
            <CommandGroup className={isAdmin ? 'bg-black' : 'bg-white'}>
              {SANTIAGO_COMMUNES.map((commune) => (
                <CommandItem
                  key={commune}
                  value={commune}
                  onSelect={() => {
                    onChange(commune);
                    setOpen(false);
                  }}
                  className={cn(
                    'font-mono',
                    isAdmin
                      ? 'text-white hover:bg-white hover:text-black'
                      : 'hover:!text-black focus:!text-black data-[selected=true]:!text-black bg-white py-2 font-bold text-black uppercase tracking-wider hover:bg-primary focus:bg-primary data-[selected=true]:bg-primary',
                  )}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === commune ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {commune}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
