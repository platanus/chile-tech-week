'use client';

import { Clock } from 'lucide-react';
import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { cn } from '@/src/lib/utils';

interface TimePickerProps {
  date?: Date;
  onTimeChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({
  date,
  onTimeChange,
  disabled = false,
  className,
}: TimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // 15-minute intervals for easier event scheduling
  const minutes = Array.from({ length: 4 }, (_, i) => i * 15);

  const selectedHour = date ? date.getHours() : 9;
  // Round to nearest 15-minute interval
  const selectedMinute = date ? Math.round(date.getMinutes() / 15) * 15 : 0;

  const handleHourChange = (hour: string) => {
    const newDate = date ? new Date(date) : new Date();
    newDate.setHours(parseInt(hour));
    onTimeChange?.(newDate);
  };

  const handleMinuteChange = (minute: string) => {
    const newDate = date ? new Date(date) : new Date();
    newDate.setMinutes(parseInt(minute));
    onTimeChange?.(newDate);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className="h-4 w-4 flex-shrink-0 text-black" />
      <Select
        value={selectedHour.toString()}
        onValueChange={handleHourChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-10 w-[70px] border-4 border-black bg-white font-bold font-mono text-black text-xs uppercase tracking-wider focus:border-primary">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)] max-h-[200px]">
          {hours.map((hour) => (
            <SelectItem
              key={hour}
              value={hour.toString()}
              className="font-bold font-mono text-black uppercase tracking-wider hover:bg-primary hover:text-black focus:bg-primary focus:text-black"
            >
              {hour.toString().padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="font-bold font-mono text-black">:</span>
      <Select
        value={selectedMinute.toString()}
        onValueChange={handleMinuteChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-10 w-[70px] border-4 border-black bg-white font-bold font-mono text-black text-xs uppercase tracking-wider focus:border-primary">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)] max-h-[200px]">
          {minutes.map((minute) => (
            <SelectItem
              key={minute}
              value={minute.toString()}
              className="font-bold font-mono text-black uppercase tracking-wider hover:bg-primary hover:text-black focus:bg-primary focus:text-black"
            >
              {minute.toString().padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
