'use client';

import { isSameDay, parseISO } from 'date-fns';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import { Input } from '@/src/components/ui/input';
import type { EventWithDetails } from '@/src/queries/events';
import { EventCard } from './event-card';
import { EventFilters } from './event-filters';

interface EventsClientProps {
  events: EventWithDetails[];
}

const DAYS = [
  { key: 'all', label: 'All' },
  { key: 'monday', label: 'Mo 17', date: '2025-11-17' },
  { key: 'tuesday', label: 'Tue 18', date: '2025-11-18' },
  { key: 'wednesday', label: 'Wed 19', date: '2025-11-19' },
  { key: 'thursday', label: 'Thu 20', date: '2025-11-20' },
  { key: 'friday', label: 'Fri 21', date: '2025-11-21' },
  { key: 'saturday', label: 'Sat 22', date: '2025-11-22' },
  { key: 'sunday', label: 'Su 23', date: '2025-11-23' },
];

export function EventsClient({ events }: EventsClientProps) {
  const [selectedDay, setSelectedDay] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedStartTimes, setSelectedStartTimes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Setup Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(events, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'authorName', weight: 0.3 },
        { name: 'cohosts.companyName', weight: 0.3 },
      ],
      threshold: 0.3, // More forgiving search (0 = exact match, 1 = match anything)
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [events]);

  // Get all unique values for filters
  const allTopics = useMemo(() => {
    const topics = new Set<string>();
    events.forEach((event) => {
      event.themes.forEach((theme) => topics.add(theme.name));
    });
    return Array.from(topics).sort();
  }, [events]);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach((event) => {
      types.add(event.format);
    });
    return Array.from(types).sort();
  }, [events]);

  // Filter events based on selected day and other filters
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filter by search query using Fuse.js
    if (searchQuery.trim() && searchQuery.length >= 2) {
      const searchResults = fuse.search(searchQuery);
      filtered = searchResults.map((result) => result.item);
    }

    // Filter by day
    if (selectedDay !== 'all') {
      const dayConfig = DAYS.find((d) => d.key === selectedDay);
      if (dayConfig?.date) {
        const targetDate = parseISO(dayConfig.date);
        filtered = filtered.filter((event) =>
          isSameDay(new Date(event.startDate), targetDate),
        );
      }
    }

    // Filter by topics
    if (selectedTopics.length > 0) {
      filtered = filtered.filter((event) =>
        event.themes.some((theme) => selectedTopics.includes(theme.name)),
      );
    }

    // Filter by start times
    if (selectedStartTimes.length > 0) {
      filtered = filtered.filter((event) => {
        const hour = new Date(event.startDate).getHours();
        if (selectedStartTimes.includes('Morning') && hour >= 6 && hour < 12)
          return true;
        if (
          selectedStartTimes.includes('Midday / Noon') &&
          hour >= 12 &&
          hour < 15
        )
          return true;
        if (selectedStartTimes.includes('Afternoon') && hour >= 15 && hour < 18)
          return true;
        if (selectedStartTimes.includes('Evening') && hour >= 18) return true;
        return false;
      });
    }

    // Filter by types
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((event) =>
        selectedTypes.some((type) => {
          switch (type) {
            case 'Pitch Event / Demo Day':
              return event.format === 'pitch_event_demo_day';
            case 'Panel event or fireside chat':
              return event.format === 'panel_fireside_chat';
            case 'Pitch event / demo day':
              return event.format === 'pitch_event_demo_day';
            case 'Dinner':
              return event.format === 'dinner';
            case 'Networking':
              return event.format === 'networking';
            case 'Hackathon':
              return event.format === 'hackathon';
            default:
              return event.format === type.toLowerCase().replace(/\s+/g, '_');
          }
        }),
      );
    }

    return filtered;
  }, [
    events,
    fuse,
    selectedDay,
    searchQuery,
    selectedTopics,
    selectedStartTimes,
    selectedTypes,
  ]);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-8">
        <div>
          <a href="/">
            <h1 className="-skew-x-2 transform border-8 border-primary bg-black p-8 font-black font-mono text-6xl text-white uppercase tracking-wider shadow-[8px_8px_0px_0px_theme(colors.primary)] transition-all duration-200 hover:shadow-[12px_12px_0px_0px_theme(colors.primary)]">
              CHILE TECH WEEK 2025
            </h1>
          </a>
        </div>

        {/* Day Filter Tabs */}
        <div className="flex flex-wrap gap-4">
          {DAYS.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedDay(day.key)}
              className={`transform border-4 px-6 py-4 font-bold font-mono text-lg uppercase transition-all duration-200 ${
                selectedDay === day.key
                  ? '-translate-y-1 border-primary bg-primary text-black shadow-[4px_4px_0px_0px_theme(colors.white)]'
                  : 'hover:-translate-y-1 border-white bg-black text-white hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_theme(colors.primary)]'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="transform border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_theme(colors.black)]">
            <EventFilters
              topics={allTopics}
              selectedTopics={selectedTopics}
              onTopicsChange={setSelectedTopics}
              selectedStartTimes={selectedStartTimes}
              onStartTimesChange={setSelectedStartTimes}
              types={allTypes}
              selectedTypes={selectedTypes}
              onTypesChange={setSelectedTypes}
            />
          </div>
        </div>

        {/* Events List */}
        <div className="lg:col-span-3">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="transform border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_theme(colors.black)]">
              <Input
                type="text"
                placeholder="SEARCH EVENTS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-4 border-black bg-white p-6 font-bold font-mono text-black text-lg uppercase tracking-wider transition-all placeholder:text-black/60 focus:border-primary focus:shadow-[4px_4px_0px_0px_theme(colors.primary)]"
              />
            </div>

            {filteredEvents.length === 0 ? (
              <div className="transform border-4 border-black bg-primary p-12 text-center shadow-[8px_8px_0px_0px_theme(colors.black)]">
                <p className="font-bold font-mono text-2xl text-black uppercase tracking-wider">
                  NO EVENTS FOUND MATCHING YOUR FILTERS
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
