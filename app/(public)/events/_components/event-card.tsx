'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import type { EventWithDetails } from '@/src/queries/events';

interface EventCardProps {
  event: EventWithDetails;
}

const formatEventType = (format: string) => {
  return format
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function EventCard({ event }: EventCardProps) {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);

  const startTimeStr = format(startDate, 'h:mm a');
  const endTimeStr = format(endDate, 'h:mm a');

  // Check if event spans multiple calendar days
  const isMultiDay =
    format(startDate, 'yyyy-MM-dd') !== format(endDate, 'yyyy-MM-dd');

  // Format date string based on whether it's multi-day
  const dateStr = isMultiDay
    ? `${format(startDate, 'EEE MMM d')} - ${format(endDate, 'EEE MMM d')}`
    : format(startDate, 'EEE MMM d');

  // Get all organizers
  const allOrganizers =
    event.cohosts.length > 0
      ? event.cohosts.map((c) => c.companyName)
      : [event.companyName];

  const organizersText = allOrganizers.join(' + ');

  if (!event.lumaEventUrl) {
    return (
      <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_theme(colors.black)]">
        {/* Event title at top */}
        <h3 className="mb-2 font-black font-mono text-base text-black uppercase tracking-wider">
          {event.title}
        </h3>

        {/* Content - flexible layout */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
          {/* Main content */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Organizers */}
            <span className="border border-black bg-primary px-2 py-1 font-bold font-mono text-black text-xs uppercase tracking-wider">
              {organizersText}
            </span>

            {/* Event details */}
            <span className="border border-black bg-black px-1 py-0.5 font-bold font-mono text-white text-xs uppercase">
              {formatEventType(event.format)}
            </span>
            <span className="font-bold font-mono text-black text-xs uppercase">
              📍 {event.commune}
            </span>
          </div>

          {/* Date/time */}
          <div className="flex items-center gap-2">
            <span className="font-bold font-mono text-black text-xs uppercase">
              {dateStr} · {startTimeStr} - {endTimeStr}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={event.lumaEventUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:-translate-x-1 hover:-translate-y-1 group block transform border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_theme(colors.black)] transition-all duration-200 hover:shadow-[4px_4px_0px_0px_theme(colors.primary)]"
    >
      {/* Event title at top */}
      <h3 className="mb-2 font-black font-mono text-base text-black uppercase tracking-wider transition-colors group-hover:text-primary">
        {event.title}
      </h3>

      {/* Content - flexible layout */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
        {/* Main content */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Organizers */}
          <span className="border border-black bg-primary px-2 py-1 font-bold font-mono text-black text-xs uppercase tracking-wider">
            {organizersText}
          </span>

          {/* Event details */}
          <span className="border border-black bg-black px-1 py-0.5 font-bold font-mono text-white text-xs uppercase">
            {formatEventType(event.format)}
          </span>
          <span className="font-bold font-mono text-black text-xs uppercase">
            📍 {event.commune}
          </span>
        </div>

        {/* Date/time */}
        <div className="flex items-center gap-2">
          <span className="font-bold font-mono text-black text-xs uppercase">
            {dateStr} · {startTimeStr} - {endTimeStr}
          </span>
        </div>
      </div>
    </Link>
  );
}
