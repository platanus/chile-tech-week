import type { EventFormat } from '@/types';

// The filter sidebar's names for each format (the old site's event-filters.tsx).
export const FORMAT_LABELS: Record<EventFormat, string> = {
  breakfast_brunch_lunch: 'Breakfast / Brunch / Lunch',
  dinner: 'Dinner',
  experiential: 'Experiential',
  hackathon: 'Hackathon',
  happy_hour: 'Happy Hour',
  matchmaking: 'Matchmaking',
  networking: 'Networking',
  panel_fireside_chat: 'Panel event or fireside chat',
  pitch_event_demo_day: 'Pitch Event / Demo Day',
  roundtable_workshop: 'Roundtable / Workshop',
};

// The card's shorter tag: the format's words, capitalised ("Panel Fireside Chat").
export function formatTag(format: EventFormat): string {
  return format
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
