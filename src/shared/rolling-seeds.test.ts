import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Repository, INITIAL_EVENTS, DEMO_STUDENT_USER } from './data/repository';
import { EventItem } from './contracts';

const TWO_DAYS = 1000 * 60 * 60 * 48;

describe('Demo data survives overnight (rolling seed pop-ups)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T20:00:00Z'));
    Repository.resetAllData();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-issues expired demo pop-ups with fresh times instead of leaving the radar empty', () => {
    Repository.getEvents(); // first visit saves seeds with today's timestamps
    vi.setSystemTime(Date.now() + TWO_DAYS);

    const events = Repository.getEvents();
    expect(events.map((e) => e.id).sort()).toEqual(INITIAL_EVENTS.map((e) => e.id).sort());
    expect(events.every((e) => e.expiresAt > Date.now())).toBe(true);
    expect(events.every((e) => new Date(e.startTime).getTime() > Date.now())).toBe(true);
  });

  it('restores demo pop-ups an older build already pruned to an empty list', () => {
    localStorage.setItem('thirdplace_events_data', '[]');
    expect(Repository.getEvents()).toHaveLength(INITIAL_EVENTS.length);
  });

  it('keeps RSVPs on a renewed demo pop-up', () => {
    const [first] = Repository.getEvents();
    Repository.rsvpEvent(first.id, DEMO_STUDENT_USER.id);
    vi.setSystemTime(Date.now() + TWO_DAYS);

    const renewed = Repository.getEvents().find((e) => e.id === first.id)!;
    expect(renewed.attendees).toContain(DEMO_STUDENT_USER.id);
    expect(renewed.expiresAt).toBeGreaterThan(Date.now());
  });

  it('still lets user-hosted pop-ups expire for good', () => {
    const hosted: EventItem = {
      ...INITIAL_EVENTS[0],
      id: 'event_user_hosted',
      expiresAt: Date.now() + 1000 * 60 * 60 * 2,
    };
    Repository.saveEvent(hosted);
    vi.setSystemTime(Date.now() + TWO_DAYS);

    expect(Repository.getEvents().some((e) => e.id === 'event_user_hosted')).toBe(false);
  });

  it('keeps demo people Open to Meet across days', () => {
    vi.setSystemTime(Date.now() + TWO_DAYS);
    const alex = Repository.getProfiles().find((p) => p.id === 'user_alex_chen')!;
    expect(alex.isOpenToMeet).toBe(true);
    expect(alex.openToMeetExpiresAt).toBeGreaterThan(Date.now());
  });
});
