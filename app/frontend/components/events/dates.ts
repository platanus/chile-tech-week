// Dates on the 2026 pages, in Spanish and always in Santiago time: the server renders the
// same markup (SSR), so the zone cannot be the visitor's.
export const TIME_ZONE = 'America/Santiago';

const isoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const hour = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hour12: false });
const time = new Intl.DateTimeFormat('es-CL', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const day = new Intl.DateTimeFormat('es-CL', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const longDay = new Intl.DateTimeFormat('es-CL', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "2026-11-18" — the calendar day in Santiago. */
export function localDate(iso: string): string {
  return isoDate.format(new Date(iso));
}

/** 0–23 in Santiago. */
export function localHour(iso: string): number {
  return Number(hour.format(new Date(iso))) % 24;
}

/** "18:30" */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Mié 18 nov" */
export function formatDay(iso: string): string {
  return capitalize(day.format(new Date(iso)).replace(/[.,]/g, ''));
}

/** "miércoles, 18 de noviembre de 2026" */
export function formatLongDay(iso: string): string {
  return longDay.format(new Date(iso));
}

/** "Mié 18 nov", or "Mié 18 nov – Jue 19 nov" when the event spans calendar days. */
export function formatDateRange(startIso: string, endIso: string): string {
  return localDate(startIso) === localDate(endIso)
    ? formatDay(startIso)
    : `${formatDay(startIso)} – ${formatDay(endIso)}`;
}

/** True when the event touches the given Santiago calendar day ("2026-11-18"). */
export function happensOn(startIso: string, endIso: string, date: string): boolean {
  return localDate(startIso) <= date && date <= localDate(endIso);
}

export const START_TIMES = ['Mañana', 'Mediodía', 'Tarde', 'Noche'] as const;
export type StartTime = (typeof START_TIMES)[number];

/** The 2025 site's buckets: 6–12, 12–15, 15–18, 18 onwards. */
export function startTimeOf(iso: string): StartTime | null {
  const h = localHour(iso);
  if (h >= 18) return 'Noche';
  if (h >= 15) return 'Tarde';
  if (h >= 12) return 'Mediodía';
  if (h >= 6) return 'Mañana';
  return null;
}
