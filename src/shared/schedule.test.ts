import { describe, it, expect } from 'vitest';
import { defaultStart, startError, toDateInput, toTimeInput, fromInputs } from './schedule';

const at = (h: number, m = 0) => new Date(2026, 10, 15, h, m); // Sun Nov 15 2026, local
const fmt = (d: Date) => `${toDateInput(d)} ${toTimeInput(d)}`;

describe('defaultStart', () => {
  it('is ~2h out on the half hour during the day', () => {
    expect(fmt(defaultStart(at(9, 10)))).toBe('2026-11-15 11:30');
    expect(fmt(defaultStart(at(15, 40)))).toBe('2026-11-15 18:00');
  });

  it('never lands overnight: too early -> 9 AM today, too late -> 10 AM tomorrow', () => {
    expect(fmt(defaultStart(at(2, 4)))).toBe('2026-11-15 09:00');
    expect(fmt(defaultStart(at(6, 50)))).toBe('2026-11-15 09:00');
    expect(fmt(defaultStart(at(18, 31)))).toBe('2026-11-16 10:00');
    expect(fmt(defaultStart(at(23, 30)))).toBe('2026-11-16 10:00');
  });
});

describe('startError', () => {
  const now = at(12).getTime();
  it('accepts future times within 30 days', () => {
    expect(startError(at(14), now)).toBeNull();
  });
  it('explains what is wrong', () => {
    expect(startError(fromInputs('', ''), now)).toBe('Please pick a date and start time');
    expect(startError(at(10), now)).toBe('Pick a start time in the future');
    expect(startError(new Date(2027, 0, 1), now)).toBe('You can schedule up to 30 days ahead');
  });
});
