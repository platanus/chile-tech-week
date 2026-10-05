import type { Locale } from '@/lib/i18n';

// Dates on the 2026 pages, in the page's language (Spanish unless told otherwise) and always
// in Santiago time: the server renders the same markup (SSR), so the zone cannot be the
// visitor's.
export const TIME_ZONE = 'America/Santiago';

const TAGS: Record<Locale, string> = { es: 'es-CL', en: 'en-US' };

const isoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const hour = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hour12: false });
// 24h in both languages: the programme reads the same in either.
const time = new Intl.DateTimeFormat('es-CL', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatters(options: Intl.DateTimeFormatOptions): Record<Locale, Intl.DateTimeFormat> {
  return {
    es: new Intl.DateTimeFormat(TAGS.es, { timeZone: TIME_ZONE, ...options }),
    en: new Intl.DateTimeFormat(TAGS.en, { timeZone: TIME_ZONE, ...options }),
  };
}

const day = formatters({ weekday: 'short', day: 'numeric', month: 'short' });
const longDay = formatters({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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

/** "Mié 18 nov" / "Wed Nov 18" */
export function formatDay(iso: string, locale: Locale = 'es'): string {
  return capitalize(day[locale].format(new Date(iso)).replace(/[.,]/g, ''));
}

/** "miércoles, 18 de noviembre de 2026" / "Wednesday, November 18, 2026" */
export function formatLongDay(iso: string, locale: Locale = 'es'): string {
  return longDay[locale].format(new Date(iso));
}

/** "Mié 18 nov", or "Mié 18 nov – Jue 19 nov" when the event spans calendar days. */
export function formatDateRange(startIso: string, endIso: string, locale: Locale = 'es'): string {
  return localDate(startIso) === localDate(endIso)
    ? formatDay(startIso, locale)
    : `${formatDay(startIso, locale)} – ${formatDay(endIso, locale)}`;
}

/** True when the event touches the given Santiago calendar day ("2026-11-18"). */
export function happensOn(startIso: string, endIso: string, date: string): boolean {
  return localDate(startIso) <= date && date <= localDate(endIso);
}

export const START_TIMES = ['morning', 'midday', 'afternoon', 'evening'] as const;
export type StartTime = (typeof START_TIMES)[number];

export const START_TIME_LABELS: Record<Locale, Record<StartTime, string>> = {
  es: { morning: 'Mañana', midday: 'Mediodía', afternoon: 'Tarde', evening: 'Noche' },
  en: { morning: 'Morning', midday: 'Midday', afternoon: 'Afternoon', evening: 'Evening' },
};

/** The 2025 site's buckets: 6–12, 12–15, 15–18, 18 onwards. */
export function startTimeOf(iso: string): StartTime | null {
  const h = localHour(iso);
  if (h >= 18) return 'evening';
  if (h >= 15) return 'afternoon';
  if (h >= 12) return 'midday';
  if (h >= 6) return 'morning';
  return null;
}
