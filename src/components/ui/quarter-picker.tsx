'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/src/lib/utils';
import { buttonVariants } from './button';

type Quarter = {
  number: number;
  name: string;
  description: string;
};

const QUARTERS: Quarter[] = [
  { number: 1, name: 'Q1', description: 'Jan-Mar' },
  { number: 2, name: 'Q2', description: 'Apr-Jun' },
  { number: 3, name: 'Q3', description: 'Jul-Sep' },
  { number: 4, name: 'Q4', description: 'Oct-Dec' },
];

type QuarterCalProps = {
  selectedQuarter?: { year: number; quarter: number };
  onQuarterSelect?: (data: { year: number; quarter: number }) => void;
  onYearForward?: () => void;
  onYearBackward?: () => void;
  callbacks?: {
    yearLabel?: (year: number) => string;
    quarterLabel?: (quarter: Quarter) => string;
  };
  variant?: {
    calendar?: {
      main?: ButtonVariant;
      selected?: ButtonVariant;
    };
    chevrons?: ButtonVariant;
  };
  minYear?: number;
  maxYear?: number;
};

type ButtonVariant =
  | 'default'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'destructive'
  | 'secondary'
  | null
  | undefined;

function QuarterPicker({
  onQuarterSelect,
  selectedQuarter,
  minYear,
  maxYear,
  callbacks,
  onYearBackward,
  onYearForward,
  variant,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & QuarterCalProps) {
  return (
    <div className={cn('min-w-[200px] w-[280px] p-3', className)} {...props}>
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0">
        <div className="space-y-4 w-full">
          <QuarterCal
            onQuarterSelect={onQuarterSelect}
            callbacks={callbacks}
            selectedQuarter={selectedQuarter}
            onYearBackward={onYearBackward}
            onYearForward={onYearForward}
            variant={variant}
            minYear={minYear}
            maxYear={maxYear}
          />
        </div>
      </div>
    </div>
  );
}

function QuarterCal({
  selectedQuarter,
  onQuarterSelect,
  callbacks,
  variant,
  minYear,
  maxYear,
  onYearBackward,
  onYearForward,
}: QuarterCalProps) {
  const currentYear = new Date().getFullYear();
  const [menuYear, setMenuYear] = React.useState<number>(
    selectedQuarter?.year ?? currentYear,
  );

  return (
    <>
      <div className="flex justify-center pt-1 relative items-center">
        <div className="text-sm font-medium">
          {callbacks?.yearLabel ? callbacks?.yearLabel(menuYear) : menuYear}
        </div>
        <div className="space-x-1 flex items-center">
          <button
            type="button"
            onClick={() => {
              setMenuYear(menuYear - 1);
              if (onYearBackward) onYearBackward();
            }}
            disabled={minYear !== undefined ? menuYear <= minYear : false}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? 'outline' }),
              'inline-flex items-center justify-center h-7 w-7 p-0 absolute left-1',
            )}
          >
            <ChevronLeft className="opacity-50 h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuYear(menuYear + 1);
              if (onYearForward) onYearForward();
            }}
            disabled={maxYear !== undefined ? menuYear >= maxYear : false}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? 'outline' }),
              'inline-flex items-center justify-center h-7 w-7 p-0 absolute right-1',
            )}
          >
            <ChevronRight className="opacity-50 h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {QUARTERS.map((quarter) => {
          const isSelected =
            selectedQuarter?.year === menuYear &&
            selectedQuarter?.quarter === quarter.number;
          const isDisabled =
            (minYear !== undefined && menuYear < minYear) ||
            (maxYear !== undefined && menuYear > maxYear);

          return (
            <button
              type="button"
              key={quarter.number}
              onClick={() => {
                if (onQuarterSelect) {
                  onQuarterSelect({ year: menuYear, quarter: quarter.number });
                }
              }}
              disabled={isDisabled}
              className={cn(
                buttonVariants({
                  variant: isSelected
                    ? (variant?.calendar?.selected ?? 'default')
                    : (variant?.calendar?.main ?? 'ghost'),
                }),
                'h-16 w-full p-2 font-normal aria-selected:opacity-100 flex flex-col items-center justify-center',
              )}
            >
              <span className="font-medium">
                {callbacks?.quarterLabel
                  ? callbacks.quarterLabel(quarter)
                  : quarter.name}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {quarter.description}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

QuarterPicker.displayName = 'QuarterPicker';

export { QuarterPicker };
