import { CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { enUS, es } from 'react-day-picker/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { copy, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// A day from a calendar and a time from a list, posted as one hidden `name` field in the
// "YYYY-MM-DDTHH:MM" the server reads in Santiago time — what a datetime-local sent before.
// The calendar works on zone-less calendar days (local-midnight Dates), so the visitor's
// own time zone never shifts the day.

const pad = (n: number) => String(n).padStart(2, '0');
const toDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};
// "mié, 18 de noviembre" / "Wed, November 18": short enough for half a form row on a phone.
const COPY = copy(
  { dayLabel: new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'long' }), calendar: es, pickDay: 'Elige un día', time: 'Hora' },
  { dayLabel: new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'long' }), calendar: enUS, pickDay: 'Pick a day', time: 'Time' },
);

// Every quarter hour of the day.
const TIMES = Array.from({ length: 96 }, (_, i) => `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`);

export function DateTimeField({ id, name, value, onChange, min, max, disabled, className, popoverClassName, ...aria }: {
  id: string;
  name: string;
  value: string;
  onChange?: (value: string) => void;
  // The first and last selectable days, "YYYY-MM-DD".
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  popoverClassName?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}) {
  const { t } = useI18n(COPY);
  const [day, setDay] = useState(value.split('T')[0] ?? '');
  const [time, setTime] = useState(value.split('T')[1] ?? '');
  const [open, setOpen] = useState(false);

  // The parent may set the value itself (the end follows the start): take it in.
  useEffect(() => {
    if (!value) return;
    const [nextDay, nextTime] = value.split('T');
    setDay(nextDay);
    setTime(nextTime);
  }, [value]);

  const update = (nextDay: string, nextTime: string) => {
    setDay(nextDay);
    setTime(nextTime);
    onChange?.(nextDay && nextTime ? `${nextDay}T${nextTime}` : '');
  };

  const times = time && !TIMES.includes(time) ? [...TIMES, time].sort() : TIMES;
  const selected = day ? fromDay(day) : undefined;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
      <input type="hidden" name={name} value={day && time ? `${day}T${time}` : ''} disabled={disabled} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" disabled={disabled} className={cn('w-full min-w-0 justify-start font-normal', !day && 'text-muted-foreground', className)} {...aria}>
            <CalendarIcon />
            <span className="truncate first-letter:uppercase">{selected ? t.dayLabel.format(selected) : t.pickDay}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn('w-auto p-0', popoverClassName)}>
          <Calendar
            mode="single"
            locale={t.calendar}
            selected={selected}
            defaultMonth={selected ?? (min ? fromDay(min) : undefined)}
            startMonth={min ? fromDay(min) : undefined}
            endMonth={max ? fromDay(max) : undefined}
            disabled={[...(min ? [{ before: fromDay(min) }] : []), ...(max ? [{ after: fromDay(max) }] : [])]}
            onSelect={(date) => {
              if (!date) return;
              update(toDay(date), time || '18:00');
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Select value={time} onValueChange={(next) => update(day, next)} disabled={disabled}>
        <SelectTrigger aria-label={t.time} className={cn('w-full', className)} aria-invalid={aria['aria-invalid']}>
          <SelectValue placeholder={t.time} />
        </SelectTrigger>
        <SelectContent className={cn('max-h-72', popoverClassName)}>
          {times.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
