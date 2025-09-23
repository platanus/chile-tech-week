'use client';

import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/src/components/ui/button';
import { Calendar } from '@/src/components/ui/calendar';
import { Input } from '@/src/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/components/ui/popover';
import { cn } from '@/src/lib/utils';

interface DateTimePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  defaultMonth?: Date;
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date and time',
  disabled = false,
  className,
  minDate,
  maxDate,
  defaultMonth,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    date,
  );
  const [timeValue, setTimeValue] = React.useState<string>(
    date ? format(date, 'HH:mm') : '09:00',
  );

  React.useEffect(() => {
    setSelectedDate(date);
    if (date) {
      setTimeValue(format(date, 'HH:mm'));
    }
  }, [date]);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setSelectedDate(undefined);
      onDateChange?.(undefined);
      return;
    }

    const [hours, minutes] = timeValue.split(':').map(Number);
    const updatedDate = new Date(newDate);
    updatedDate.setHours(hours, minutes, 0, 0);

    setSelectedDate(updatedDate);
    onDateChange?.(updatedDate);
  };

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);

    if (!selectedDate) return;

    const [hours, minutes] = newTime.split(':').map(Number);
    const updatedDate = new Date(selectedDate);
    updatedDate.setHours(hours, minutes, 0, 0);

    setSelectedDate(updatedDate);
    onDateChange?.(updatedDate);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full sm:flex-1 h-10 justify-start text-left font-normal border-4 border-black bg-white font-bold font-mono text-black text-xs uppercase tracking-wider focus:border-primary overflow-hidden',
              !selectedDate && 'text-muted-foreground',
              className,
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]"
          align="start"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            defaultMonth={defaultMonth}
            initialFocus
            className="bg-white text-black"
            classNames={{
              day_button:
                'hover:bg-primary hover:text-black focus:bg-primary focus:text-black data-[selected]:bg-primary data-[selected]:text-black border-2 border-transparent hover:border-black focus:border-black data-[selected]:border-black text-black font-bold font-mono',
              nav_button:
                'hover:bg-primary hover:text-black hover:border-black border-2 border-transparent text-black',
              month_caption:
                'text-black font-bold font-mono uppercase tracking-wider flex items-center justify-between px-4 py-2 relative',
              caption_label:
                'text-black font-bold font-mono uppercase tracking-wider flex-1 text-center',
              nav: 'flex items-center justify-between w-full absolute top-0 left-0 px-1',
              button_previous: 'absolute left-1 top-1/2 -translate-y-1/2 z-10',
              button_next: 'absolute right-1 top-1/2 -translate-y-1/2 z-10',
              weekday:
                'text-black font-bold font-mono uppercase tracking-wider text-center',
              weekdays: 'text-black',
              day: 'text-black',
              table: 'text-black w-full mt-2',
              week: 'text-black',
            }}
          />
        </PopoverContent>
      </Popover>

      <div className="relative w-full sm:w-32">
        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-black flex-shrink-0" />
        <Input
          type="time"
          value={timeValue}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="pl-10 w-full h-10 border-4 border-black bg-white font-bold font-mono text-black text-xs uppercase tracking-wider focus:border-primary"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
