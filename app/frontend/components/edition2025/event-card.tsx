import type { Event } from '@/types';
import { formatDateRange, formatTime } from './dates';
import { formatTag } from './formats';

// One row of the programme. Links out to where people registered (the host's page or the
// Luma event) — the old site never had an event page of its own.
export function EventCard({ event }: { event: Event }) {
  const organizers = (
    event.cohosts.length > 0 ? event.cohosts.map((c) => c.companyName) : [event.companyName]
  ).join(' + ');
  const when = `${formatDateRange(event.startsAt, event.endsAt)} · ${formatTime(event.startsAt)} - ${formatTime(event.endsAt)}`;

  const body = (
    <>
      <h3
        className={`mb-2 font-mono text-base font-black uppercase tracking-wider text-black ${event.registrationUrl ? 'transition-colors group-hover:text-primary' : ''}`}
      >
        {event.title}
      </h3>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-black bg-primary px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider text-black">
            {organizers}
          </span>
          <span className="border border-black bg-black px-1 py-0.5 font-mono text-xs font-bold uppercase text-white">
            {formatTag(event.format)}
          </span>
          <span className="font-mono text-xs font-bold uppercase text-black">📍 {event.commune}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase text-black">{when}</span>
        </div>
      </div>
    </>
  );

  if (!event.registrationUrl) {
    return (
      <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_#000]">{body}</div>
    );
  }

  return (
    <a
      href={event.registrationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block transform border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_#000] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
    >
      {body}
    </a>
  );
}
