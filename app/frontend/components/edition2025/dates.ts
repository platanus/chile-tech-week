// Dates on the 2025 pages, always in Santiago time. The old site formatted in the visitor's
// browser zone; with SSR the server and the browser must agree, so the zone is fixed.
export const TIME_ZONE = 'America/Santiago';

const isoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const hour = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hour12: false });
const time = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const day = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

/** "2025-11-20" — the calendar day in Santiago. */
export function localDate(iso: string): string {
  return isoDate.format(new Date(iso));
}

/** 0–23 in Santiago. */
export function localHour(iso: string): number {
  return Number(hour.format(new Date(iso))) % 24;
}

/** "3:00 PM" */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** "Thu Nov 20" */
export function formatDay(iso: string): string {
  return day.format(new Date(iso)).replace(',', '');
}

/** "Thu Nov 20", or "Thu Nov 20 - Fri Nov 21" when the event spans calendar days. */
export function formatDateRange(startIso: string, endIso: string): string {
  return localDate(startIso) === localDate(endIso)
    ? formatDay(startIso)
    : `${formatDay(startIso)} - ${formatDay(endIso)}`;
}

/** True when the event touches the given Santiago calendar day ("2025-11-20"). */
export function happensOn(startIso: string, endIso: string, date: string): boolean {
  return localDate(startIso) <= date && date <= localDate(endIso);
}

export const START_TIMES = ['Morning', 'Midday / Noon', 'Afternoon', 'Evening'] as const;
export type StartTime = (typeof START_TIMES)[number];

/** The old site's start-time buckets: 6–12, 12–15, 15–18, 18 onwards. */
export function startTimeOf(iso: string): StartTime | null {
  const h = localHour(iso);
  if (h >= 18) return 'Evening';
  if (h >= 15) return 'Afternoon';
  if (h >= 12) return 'Midday / Noon';
  if (h >= 6) return 'Morning';
  return null;
}
