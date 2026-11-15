import { describe, it, expect } from 'vitest';
import { eventPhase, eventTimeLabel, formatStart } from './eventTime';

// Fixed local "now": Sat Nov 14 2026, 3:00 PM
const NOW = new Date(2026, 10, 14, 15, 0, 0).getTime();
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m, 0).toISOString();
const ev = (start: string, end: string) => ({ startTime: start, endTime: end });

describe('event time labels', () => {
  it('describes upcoming pop-ups by when they start', () => {
    expect(eventTimeLabel(ev(at(14, 15, 25), at(14, 17)), NOW)).toBe('Starts in 25m');
    expect(eventTimeLabel(ev(at(14, 19), at(14, 21)), NOW)).toMatch(/^Starts today · 7:00/);
    expect(eventTimeLabel(ev(at(15, 18), at(15, 20)), NOW)).toMatch(/^Starts tomorrow · 6:00/);
    expect(eventTimeLabel(ev(at(21, 11), at(21, 13)), NOW)).toMatch(/^Starts Sat, Nov 21 · 11:00/);
  });

  it('shows live pop-ups with time remaining, then Ended', () => {
    expect(eventTimeLabel(ev(at(14, 14), at(14, 16, 5)), NOW)).toBe('Live now · ends in 1h 5m');
    expect(eventTimeLabel(ev(at(14, 12), at(14, 14)), NOW)).toBe('Ended');
  });

  it('classifies phases', () => {
    expect(eventPhase(ev(at(14, 16), at(14, 18)), NOW)).toBe('upcoming');
    expect(eventPhase(ev(at(14, 14), at(14, 16)), NOW)).toBe('live');
    expect(eventPhase(ev(at(14, 10), at(14, 11)), NOW)).toBe('ended');
  });

  it('formats start dates relative to today', () => {
    expect(formatStart(new Date(at(14, 20)), new Date(NOW))).toMatch(/^today · /);
    expect(formatStart(new Date(at(15, 9)), new Date(NOW))).toMatch(/^tomorrow · /);
  });
});
