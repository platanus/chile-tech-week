import { Link } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import { happensOn, type StartTime, startTimeOf } from '@/components/events/dates';
import { EventCard } from '@/components/events/event-card';
import { EventFilters } from '@/components/events/event-filters';
import { useFlipList } from '@/components/events/flip';
import { PageHead } from '@/components/site/layout';
import { cn } from '@/lib/utils';
import { new_event_path } from '@/routes';
import type { Event, EventFormat, EventsIndex } from '@/types';

function matchesSearch(event: Event, query: string) {
  const haystack = [event.title, event.companyName, ...event.cohosts.map((c) => c.companyName)]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

// The programme of the week, filtered in the browser: by day, topic, start time, type and a
// text search over titles and organizers. One page, no pagination.
export default function Index({ events, days, ...page }: EventsIndex) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedStartTimes, setSelectedStartTimes] = useState<StartTime[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<EventFormat[]>([]);

  const allTopics = useMemo(
    () => Array.from(new Set(events.flatMap((event) => event.themes.map((t) => t.name)))).sort(),
    [events],
  );
  const allFormats = useMemo(
    () => Array.from(new Set(events.map((event) => event.format))).sort(),
    [events],
  );

  // The list animates between filters (components/events/flip.ts): the rows that stay slide,
  // the ones that arrive fade in, the ones that go fade out where they were.
  const listRef = useRef<HTMLDivElement>(null);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      if (query.length >= 2 && !matchesSearch(event, query)) return false;
      if (selectedDay && !happensOn(event.startsAt, event.endsAt, selectedDay)) return false;
      if (selectedTopics.length > 0 && !event.themes.some((t) => selectedTopics.includes(t.name)))
        return false;
      if (selectedStartTimes.length > 0) {
        const slot = startTimeOf(event.startsAt);
        if (!slot || !selectedStartTimes.includes(slot)) return false;
      }
      if (selectedFormats.length > 0 && !selectedFormats.includes(event.format)) return false;
      return true;
    });
  }, [events, searchQuery, selectedDay, selectedTopics, selectedStartTimes, selectedFormats]);

  useFlipList(listRef, filteredEvents.map((event) => event.id).join(","));

  const filters = (
    <EventFilters
      topics={allTopics}
      selectedTopics={selectedTopics}
      onTopicsChange={setSelectedTopics}
      selectedStartTimes={selectedStartTimes}
      onStartTimesChange={setSelectedStartTimes}
      formats={allFormats}
      selectedFormats={selectedFormats}
      onFormatsChange={setSelectedFormats}
    />
  );

  const dayTab = (key: string | null, label: string, count?: number) => (
    <button
      key={key ?? 'all'}
      type="button"
      onClick={() => setSelectedDay(key)}
      aria-pressed={selectedDay === key}
      className={cn(
        'flex flex-col items-start gap-0.5 border-b-2 px-1 pb-2 pt-1 text-left transition-colors',
        selectedDay === key
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <span className="font-display text-[13px] font-extrabold uppercase tracking-[-0.02em] md:text-sm">{label}</span>
      {count !== undefined && <span className="label text-[10px]">{count} {count === 1 ? 'evento' : 'eventos'}</span>}
    </button>
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-[6vw] py-12 md:px-8">
      <PageHead {...page} />

      <header className="flex flex-col gap-4">
        <div className="label text-primary">Programa · 16 al 22 de noviembre</div>
        <h1 className="font-display text-[clamp(30px,4.6vw,64px)] font-extrabold uppercase leading-[.95] tracking-[-0.03em]">
          Eventos
        </h1>
        <p className="max-w-[44ch] text-muted-foreground">
          La semana descentralizada con los mejores eventos tech del país. Cada evento se inscribe en
          la página de su organizador.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="flex flex-col items-start gap-4 border-t border-border py-12">
          <h2 className="font-display text-xl font-extrabold uppercase tracking-[-0.02em]">
            Pronto publicaremos el programa
          </h2>
          <p className="max-w-[44ch] text-muted-foreground">
            Los eventos aparecen aquí a medida que sus organizadores los publican. ¿Tienes uno?
          </p>
          <Link
            href={new_event_path()}
            className="inline-flex items-center rounded-sm border border-primary bg-primary px-5 py-3 font-display text-[12px] font-extrabold uppercase tracking-[.04em] text-white transition-colors hover:bg-[#ff3d3d]"
          >
            Organiza un evento
          </Link>
        </div>
      ) : (
        <>
          <div className="-mx-[6vw] overflow-x-auto px-[6vw] md:mx-0 md:px-0">
            <div className="flex min-w-max gap-5 border-b border-border md:gap-8" role="tablist" aria-label="Día">
              {dayTab(null, 'Todos', events.length)}
              {days.map((day) => dayTab(day.date, day.label, day.count))}
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
            <aside className="lg:sticky lg:top-8 lg:self-start">{filters}</aside>

            <section className="flex min-w-0 flex-col gap-6">
              <input
                type="search"
                placeholder="Buscar por evento u organizador…"
                aria-label="Buscar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-sm border border-input bg-transparent px-4 py-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />

              {/* the container stays mounted whatever the filters say: the rows on their way
                  out fade inside it (position: relative anchors those ghosts) */}
              <div ref={listRef} className="relative flex flex-col">
                {filteredEvents.map((event) => (
                  <div key={event.id} data-flip-key={event.id}>
                    <EventCard event={event} />
                  </div>
                ))}
              </div>

              {filteredEvents.length === 0 && (
                <div className="border-t border-border py-12">
                  <p className="font-display text-base font-extrabold uppercase tracking-[-0.02em]">
                    Ningún evento coincide con los filtros
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Prueba con otro día, tema o búsqueda.</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
