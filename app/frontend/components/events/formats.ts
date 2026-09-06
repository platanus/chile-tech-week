import type { EventFormat } from '@/types';

// The formats' names on the 2026 pages (filters, cards, the form's select).
export const FORMAT_LABELS: Record<EventFormat, string> = {
  breakfast_brunch_lunch: 'Desayuno / Brunch / Almuerzo',
  dinner: 'Cena',
  experiential: 'Experiencia',
  hackathon: 'Hackathon',
  happy_hour: 'Happy hour',
  matchmaking: 'Matchmaking',
  networking: 'Networking',
  panel_fireside_chat: 'Panel / Fireside chat',
  pitch_event_demo_day: 'Pitch / Demo day',
  roundtable_workshop: 'Mesa redonda / Taller',
};
