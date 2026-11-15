// Shared date/time helpers for the two scheduling forms (pop-ups and 1-on-1 meetups).
// Both show a plain date + time field; this picks a sensible default and validates the choice.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY_START_MIN = 9 * 60; // 9:00 AM
const DAY_END_MIN = 20 * 60; // 8:00 PM (latest suggested start)

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-15" for <input type="date"> (local time). */
export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "14:30" for <input type="time"> (local time). */
export const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Combines the two inputs into a Date (Invalid Date if either is empty/malformed). */
export const fromInputs = (date: string, time: string) => new Date(`${date}T${time}`);

/**
 * Default start: about 2 hours from now on the half hour, kept between 9 AM and 8 PM.
 * Too early -> 9 AM today; too late (or past midnight) -> 10 AM tomorrow.
 */
export function defaultStart(now: Date = new Date()): Date {
  const d = new Date(now.getTime() + 2 * HOUR);
  d.setMinutes(d.getMinutes() <= 30 ? 30 : 60, 0, 0);
  const sameDay = toDateInput(d) === toDateInput(now);
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (sameDay && minutes < DAY_START_MIN) {
    d.setHours(9, 0, 0, 0);
  } else if (!sameDay || minutes > DAY_END_MIN) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  }
  return d;
}

/** Why a chosen start can't be used, or null if it's fine. */
export function startError(start: Date, now: number = Date.now(), maxDaysAhead = 30): string | null {
  if (Number.isNaN(start.getTime())) return 'Please pick a date and start time';
  if (start.getTime() < now - MINUTE) return 'Pick a start time in the future';
  if (start.getTime() > now + maxDaysAhead * 24 * HOUR) return `You can schedule up to ${maxDaysAhead} days ahead`;
  return null;
}
