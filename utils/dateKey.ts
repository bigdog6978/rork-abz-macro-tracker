/**
 * Date key utilities for daily logs.
 * Uses YYYY-MM-DD in local timezone for stable day identification.
 */

/** Convert a Date to YYYY-MM-DD in local timezone */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD string to Date at noon local (avoids timezone edge cases) */
export function fromDateKey(dateKey: string): Date {
  return new Date(dateKey + 'T12:00:00');
}

/** Get today's date key in local timezone */
export function getTodayDateKey(): string {
  return toDateKey(new Date());
}

/** Get yesterday's date key */
export function getYesterdayDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

/** Check if dateKey is in the past (before today) */
export function isPastDate(dateKey: string): boolean {
  return dateKey < getTodayDateKey();
}

/** Check if dateKey is today */
export function isToday(dateKey: string): boolean {
  return dateKey === getTodayDateKey();
}
