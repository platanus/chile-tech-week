'use client';

import { format } from 'date-fns';
import { Badge } from '@/src/components/ui/badge';
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
  const _endDate = new Date(event.endDate);

  const dateStr = format(startDate, 'EEE MMM d');
  const timeStr = format(startDate, 'h:mm a');

  // Get main organizer (first cohost if available, otherwise author)
  const mainOrganizer = event.cohosts[0]?.companyName || event.authorName;

  // Get additional cohosts
  const additionalCohosts = event.cohosts.slice(1);

  return (
    <div className="hover:-translate-x-1 hover:-translate-y-1 group transform cursor-pointer border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_theme(colors.black)] transition-all duration-200 hover:shadow-[4px_4px_0px_0px_theme(colors.primary)]">
      {/* Event title at top */}
      <h3 className="mb-2 font-black font-mono text-base text-black uppercase tracking-wider transition-colors group-hover:text-primary">
        {event.title}
      </h3>

      {/* Content in single row */}
      <div className="flex items-center justify-between gap-3">
        {/* Main content */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Organizer */}
          <span className="flex-shrink-0 border border-black bg-primary px-2 py-1 font-bold font-mono text-black text-xs uppercase tracking-wider">
            {mainOrganizer}
          </span>

          {/* Event details */}
          <div className="flex items-center gap-2 text-xs">
            <Badge
              variant="secondary"
              className="border border-black bg-black px-1 py-0.5 font-bold font-mono text-white text-xs uppercase"
            >
              {formatEventType(event.format)}
            </Badge>
            <span className="font-bold font-mono text-black uppercase">
              📍 {event.commune}
            </span>
          </div>

          {/* Additional cohosts if any */}
          {additionalCohosts.length > 0 && (
            <span className="truncate font-bold font-mono text-black text-xs uppercase">
              +{additionalCohosts.length} more
            </span>
          )}
        </div>

        {/* Date/time and action */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="font-bold font-mono text-black text-xs uppercase">
            {dateStr} · {timeStr}
          </span>
          {event.lumaLink && (
            <a
              href={event.lumaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:-translate-y-1 inline-flex transform items-center border border-black bg-primary px-2 py-1 font-bold font-mono text-black text-xs uppercase transition-all duration-200 hover:shadow-[2px_2px_0px_0px_theme(colors.black)]"
            >
              VIEW
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
