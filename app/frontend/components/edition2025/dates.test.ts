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

// 2025-11-20 15:00 UTC is 12:00 in Santiago (UTC-3, summer time).
const noon = '2025-11-20T15:00:00.000Z';
// 2025-11-21 01:00 UTC is still Nov 20, 22:00 in Santiago.
const lateNight = '2025-11-21T01:00:00.000Z';

describe('dates in Santiago time', () => {
  it('names the calendar day and hour in Santiago, not UTC', () => {
    expect(localDate(lateNight)).toBe('2025-11-20');
    expect(localHour(lateNight)).toBe(22);
    expect(localHour(noon)).toBe(12);
    expect(localHour('2025-11-20T03:00:00.000Z')).toBe(0);
  });

  it('formats like the old site: "h:mm a" and "EEE MMM d"', () => {
    expect(formatTime(noon)).toBe('12:00 PM');
    expect(formatTime(lateNight)).toBe('10:00 PM');
    expect(formatDay(noon)).toBe('Thu Nov 20');
  });

  it('shows one day, or the span when the event crosses midnight', () => {
    expect(formatDateRange(noon, lateNight)).toBe('Thu Nov 20');
    expect(formatDateRange(noon, '2025-11-22T20:00:00.000Z')).toBe('Thu Nov 20 - Sat Nov 22');
  });

  it('matches a day filter against every day the event touches', () => {
    expect(happensOn(noon, lateNight, '2025-11-20')).toBe(true);
    expect(happensOn(noon, lateNight, '2025-11-21')).toBe(false);
    expect(happensOn(noon, '2025-11-22T20:00:00.000Z', '2025-11-21')).toBe(true);
  });

  it('buckets start times the way the filters did', () => {
    expect(startTimeOf('2025-11-20T12:00:00.000Z')).toBe('Morning');
    expect(startTimeOf(noon)).toBe('Midday / Noon');
    expect(startTimeOf('2025-11-20T19:00:00.000Z')).toBe('Afternoon');
    expect(startTimeOf('2025-11-20T21:00:00.000Z')).toBe('Evening');
    expect(startTimeOf('2025-11-20T05:00:00.000Z')).toBeNull();
  });
});
