import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { happensOn, type StartTime, startTimeOf } from '@/components/edition2025/dates';
import { EventCard } from '@/components/edition2025/event-card';
import { EventFilters } from '@/components/edition2025/event-filters';
import { PageHead } from '@/components/edition2025/layout';
import { edition2025_root_path } from '@/routes';
import type { Edition2025EventsIndex, Event, EventFormat } from '@/types';

// The week's seven days plus "all"; the dates are Santiago calendar days.
const DAYS = [
  { key: 'all', label: 'All', date: null },
  { key: 'monday', label: 'Mo 17', date: '2025-11-17' },
  { key: 'tuesday', label: 'Tue 18', date: '2025-11-18' },
  { key: 'wednesday', label: 'Wed 19', date: '2025-11-19' },
  { key: 'thursday', label: 'Thu 20', date: '2025-11-20' },
  { key: 'friday', label: 'Fri 21', date: '2025-11-21' },
  { key: 'saturday', label: 'Sat 22', date: '2025-11-22' },
  { key: 'sunday', label: 'Su 23', date: '2025-11-23' },
];

const PANEL = 'transform border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_#000]';
const SEARCH =
  'w-full border-4 border-black bg-white p-6 font-mono text-lg font-bold uppercase tracking-wider text-black transition-all placeholder:text-black/60 focus:border-primary focus:shadow-[4px_4px_0px_0px_var(--color-primary)]';

function matchesSearch(event: Event, query: string) {
  const haystack = [event.title, event.companyName, ...event.cohosts.map((c) => c.companyName)]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

// The whole 2025 programme, filtered in the browser like the old site: by day, topic, start
// time, type and a text search over titles and organizers.
export default function Index({ events, ...page }: Edition2025EventsIndex) {
  const [selectedDay, setSelectedDay] = useState('all');
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

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const day = DAYS.find((d) => d.key === selectedDay)?.date ?? null;

    return events.filter((event) => {
      if (query.length >= 2 && !matchesSearch(event, query)) return false;
      if (day && !happensOn(event.startsAt, event.endsAt, day)) return false;
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
  const search = (
    <input
      type="text"
      placeholder="SEARCH EVENTS..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className={SEARCH}
    />
  );

  return (
    <div className="min-h-screen bg-black">
      <PageHead {...page} />
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 md:px-6">
        <div className="flex flex-col gap-8">
          <div>
            <Link href={edition2025_root_path()} className="inline-block">
              <h1 className="-skew-x-2 transform border-4 border-primary bg-black p-4 font-mono text-3xl font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all duration-200 hover:shadow-[6px_6px_0px_0px_var(--color-primary)] md:border-8 md:p-8 md:text-6xl md:shadow-[8px_8px_0px_0px_var(--color-primary)] md:hover:shadow-[12px_12px_0px_0px_var(--color-primary)]">
                CHILE TECH WEEK 2025
              </h1>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-4">
            {DAYS.map((day) => (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDay(day.key)}
                className={`transform border-4 px-3 py-2 font-mono text-sm font-bold uppercase transition-all duration-200 md:px-6 md:py-4 md:text-lg ${
                  selectedDay === day.key
                    ? '-translate-y-1 border-primary bg-primary text-black shadow-[4px_4px_0px_0px_#fff]'
                    : 'border-white bg-black text-white hover:-translate-y-1 hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_var(--color-primary)]'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:gap-8">
          <div className="flex flex-col gap-4 lg:hidden">
            <div className={PANEL}>{search}</div>
            <div className={PANEL}>{filters}</div>
          </div>

          <div className="grid gap-8 lg:grid-cols-4">
            <div className="hidden lg:col-span-1 lg:block">
              <div className={PANEL}>{filters}</div>
            </div>

            <div className="lg:col-span-3">
              <div className="flex flex-col gap-4">
                <div className={`hidden lg:block ${PANEL}`}>{search}</div>

                {filteredEvents.length === 0 ? (
                  <div className="transform border-4 border-black bg-primary p-12 text-center shadow-[8px_8px_0px_0px_#000]">
                    <p className="font-mono text-2xl font-bold uppercase tracking-wider text-black">
                      NO EVENTS FOUND MATCHING YOUR FILTERS
                    </p>
                  </div>
                ) : (
                  filteredEvents.map((event) => <EventCard key={event.id} event={event} />)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
