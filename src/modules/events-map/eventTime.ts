import { EventItem } from '../../shared/contracts';

// Pop-ups are scheduled ahead of time, so cards describe them relative to their start/end,
// e.g. "Starts tomorrow · 6:00 PM", "Live now · ends in 1h 5m", "Ended".

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const clock = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function duration(ms: number): string {
  const hours = Math.floor(ms / HOUR);
  const mins = Math.max(1, Math.floor((ms % HOUR) / MINUTE));
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

/** "today · 7:00 PM", "tomorrow · 6:00 PM", "Sat, Nov 21 · 11:00 AM" */
export function formatStart(start: Date, now: Date = new Date()): string {
  const dayDiff = Math.round((startOfDay(start) - startOfDay(now)) / (24 * HOUR));
  if (dayDiff === 0) return `today · ${clock(start)}`;
  if (dayDiff === 1) return `tomorrow · ${clock(start)}`;
  return `${start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${clock(start)}`;
}

export type EventPhase = 'upcoming' | 'live' | 'ended';

export function eventPhase(event: Pick<EventItem, 'startTime' | 'endTime'>, now: number = Date.now()): EventPhase {
  const start = new Date(event.startTime).getTime();
  const end = new Date(event.endTime).getTime();
  if (now < start) return 'upcoming';
  if (now < end) return 'live';
  return 'ended';
}

export function eventTimeLabel(event: Pick<EventItem, 'startTime' | 'endTime'>, now: number = Date.now()): string {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  switch (eventPhase(event, now)) {
    case 'upcoming':
      return start.getTime() - now < HOUR
        ? `Starts in ${duration(start.getTime() - now)}`
        : `Starts ${formatStart(start, new Date(now))}`;
    case 'live':
      return `Live now · ends in ${duration(end.getTime() - now)}`;
    default:
      return 'Ended';
  }
}
