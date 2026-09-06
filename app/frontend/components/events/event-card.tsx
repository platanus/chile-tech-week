import { ArrowUpRight, MapPin } from 'lucide-react';
import type { Event } from '@/types';
import { formatDateRange, formatTime } from './dates';
import { FORMAT_LABELS } from './formats';

// One row of the programme: the day and time on the left, the title, who hosts it, its
// format and commune, and the event's own artwork from Luma on the right. Links out to
// where people register (the host's page or the Luma event); there is no event page of its
// own. A row without a cover simply drops the column — an empty frame would read as broken.
export function EventCard({ event }: { event: Event }) {
  const organizers = [event.companyName, ...event.cohosts.map((c) => c.companyName)].join(' + ');

  const body = (
    <div className="grid gap-3 md:grid-cols-[9.5rem_1fr_auto] md:gap-6">
      <div className="label flex flex-col gap-1 text-primary md:pt-1">
        <span>{formatDateRange(event.startsAt, event.endsAt)}</span>
        <span className="text-muted-foreground">
          {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="font-display text-base font-extrabold uppercase leading-tight tracking-[-0.02em] transition-colors group-hover:text-primary md:text-lg">
          {event.title}
          {event.registrationUrl && (
            <ArrowUpRight className="ml-1 inline size-4 align-[-2px] text-muted-foreground transition-colors group-hover:text-primary" />
          )}
        </h3>
        <p className="text-sm text-muted-foreground">{organizers}</p>
        <div className="label flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="text-foreground">{FORMAT_LABELS[event.format]}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {event.commune}
          </span>
          {event.themes.slice(0, 3).map((theme) => (
            <span key={theme.id}>{theme.name}</span>
          ))}
        </div>
      </div>
      {event.coverImageUrl && (
        <img
          src={event.coverImageUrl}
          alt=""
          loading="lazy"
          width={144}
          height={96}
          className="hidden h-16 w-24 rounded-sm border border-border object-cover md:block"
        />
      )}
    </div>
  );

  const classes = 'group block border-b border-border py-5 first:border-t';

  if (!event.registrationUrl) {
    return (
      <div className={classes} data-testid="event-card">
        {body}
      </div>
    );
  }

  return (
    <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className={classes} data-testid="event-card">
      {body}
    </a>
  );
}
