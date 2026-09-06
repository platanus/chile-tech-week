import { describe, expect, it } from 'vitest';
import {
  formatDateRange,
  formatDay,
  formatTime,
  happensOn,
  localDate,
  localHour,
  startTimeOf,
} from './dates';

// 2026-11-18 15:00 UTC is 12:00 in Santiago (UTC-3, summer time).
const noon = '2026-11-18T15:00:00.000Z';
// 2026-11-19 01:00 UTC is still Nov 18, 22:00 in Santiago.
const lateNight = '2026-11-19T01:00:00.000Z';

describe('dates in Santiago time, in Spanish', () => {
  it('names the calendar day and hour in Santiago, not UTC', () => {
    expect(localDate(lateNight)).toBe('2026-11-18');
    expect(localHour(lateNight)).toBe(22);
    expect(localHour(noon)).toBe(12);
    expect(localHour('2026-11-18T03:00:00.000Z')).toBe(0);
  });

  it('formats 24h times and short Spanish days', () => {
    expect(formatTime(noon)).toBe('12:00');
    expect(formatTime(lateNight)).toBe('22:00');
    expect(formatDay(noon)).toBe('Mié 18 nov');
  });

  it('shows one day, or the span when the event crosses midnight', () => {
    expect(formatDateRange(noon, lateNight)).toBe('Mié 18 nov');
    expect(formatDateRange(noon, '2026-11-20T20:00:00.000Z')).toBe('Mié 18 nov – Vie 20 nov');
  });

  it('matches a day filter against every day the event touches', () => {
    expect(happensOn(noon, lateNight, '2026-11-18')).toBe(true);
    expect(happensOn(noon, lateNight, '2026-11-19')).toBe(false);
    expect(happensOn(noon, '2026-11-20T20:00:00.000Z', '2026-11-19')).toBe(true);
  });

  it('buckets start times like the 2025 filters', () => {
    expect(startTimeOf('2026-11-18T12:00:00.000Z')).toBe('Mañana');
    expect(startTimeOf(noon)).toBe('Mediodía');
    expect(startTimeOf('2026-11-18T19:00:00.000Z')).toBe('Tarde');
    expect(startTimeOf('2026-11-18T21:00:00.000Z')).toBe('Noche');
    expect(startTimeOf('2026-11-18T05:00:00.000Z')).toBeNull();
  });
});
