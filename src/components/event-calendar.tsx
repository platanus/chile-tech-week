'use client';

import { Calendar } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';

interface EventCountByHour {
  date: string;
  hour: number;
  count: number;
}

interface EventCalendarProps {
  eventCounts: EventCountByHour[];
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; // 8 AM to 8 PM
const DAYS = [
  { label: 'MON', date: '2025-11-17' },
  { label: 'TUE', date: '2025-11-18' },
  { label: 'WED', date: '2025-11-19' },
  { label: 'THU', date: '2025-11-20' },
  { label: 'FRI', date: '2025-11-21' },
  { label: 'SAT', date: '2025-11-22' },
  { label: 'SUN', date: '2025-11-23' },
];

function formatHour(hour: number): string {
  if (hour === 12) return '12PM';
  if (hour > 12) return `${hour - 12}PM`;
  return `${hour}AM`;
}

function getCountForSlot(
  eventCounts: EventCountByHour[],
  date: string,
  hour: number,
): number {
  const found = eventCounts.find((ec) => ec.date === date && ec.hour === hour);
  return found?.count || 0;
}

function getIntensityColor(count: number): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  if (count === 0) {
    return {
      backgroundColor: 'rgb(243 244 246)', // gray-100
      color: 'rgb(156 163 175)', // gray-400
      borderColor: 'rgb(209 213 219)', // gray-300
    };
  }

  // Calculate opacity based on count (max at 8 events)
  const maxCount = 8;
  const opacity = Math.min(count / maxCount, 1);

  // Base red color: rgb(239 68 68) which is red-500
  const baseRed = { r: 239, g: 68, b: 68 };

  // Calculate background with opacity
  const bgOpacity = 0.2 + opacity * 0.6; // Range from 0.2 to 0.8
  const backgroundColor = `rgba(${baseRed.r}, ${baseRed.g}, ${baseRed.b}, ${bgOpacity})`;

  // Text color: white for high opacity, dark red for low opacity
  const textColor = opacity > 0.5 ? 'rgb(255 255 255)' : 'rgb(127 29 29)'; // white or red-900

  // Border with slightly higher opacity
  const borderOpacity = 0.4 + opacity * 0.4; // Range from 0.4 to 0.8
  const borderColor = `rgba(${baseRed.r}, ${baseRed.g}, ${baseRed.b}, ${borderOpacity})`;

  return {
    backgroundColor,
    color: textColor,
    borderColor,
  };
}

export function EventCalendar({ eventCounts }: EventCalendarProps) {
  const _maxCount = Math.max(...eventCounts.map((ec) => ec.count), 1);
  const _totalEvents = eventCounts.reduce((sum, ec) => sum + ec.count, 0);

  return (
    <Card className="border-2 border-black bg-white">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 font-bold font-mono text-black text-lg uppercase tracking-wider">
          <Calendar className="h-4 w-4" />
          Event Schedule
        </CardTitle>
        {/* Description */}
        <p className="mt-1 font-mono text-gray-600 text-xs uppercase tracking-wider">
          Check how many events are in each slot so you can choose the best time
          for your event
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-8 gap-1">
          <div className="text-center font-mono text-black text-xs uppercase">
            TIME
          </div>
          {DAYS.map((day) => (
            <div key={day.date} className="text-center">
              <div className="font-bold font-mono text-black text-xs uppercase">
                {day.label}
              </div>
              <div className="font-mono text-gray-600 text-xs">
                {day.date.split('-')[2]}
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-1">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-1">
              <div className="flex items-center justify-end pr-1 font-mono text-black text-xs">
                {formatHour(hour)}
              </div>
              {DAYS.map((day) => {
                const count = getCountForSlot(eventCounts, day.date, hour);
                const colors = getIntensityColor(count);

                return (
                  <div
                    key={`${day.date}-${hour}`}
                    className="flex h-6 w-full items-center justify-center border font-bold font-mono text-xs"
                    style={{
                      backgroundColor: colors.backgroundColor,
                      color: colors.color,
                      borderColor: colors.borderColor,
                    }}
                  >
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
