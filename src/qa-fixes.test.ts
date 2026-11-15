// Regression tests for issues found while using the app as a user (QA pass)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { BrandProvider, GEORGIA_TECH_BRAND } from './shared/config/brandConfig';
import {
  Repository,
  INITIAL_PROFILES,
  INITIAL_CURRENT_USER,
  DEMO_STUDENT_USER,
  seedTimes,
} from './shared/data/repository';
import { CalendarMeetup, MatchItem } from './shared/contracts';
import { EventsMapView } from './modules/events-map/EventsMapView';
import { SwipeRadarView } from './modules/swipe-radar/SwipeRadarView';
import { MyPlansView } from './modules/scheduler/MyPlansView';
import { SchedulerDrawer } from './modules/scheduler/SchedulerDrawer';
import { AuthProvider, MyProfileDrawer } from './modules/auth';
import { ResetDemoButton } from './shared/ui/ResetDemoButton';
import { formatDuration } from './modules/scheduler/calendarUtils';

const alex = INITIAL_PROFILES[0]; // user_alex_chen, the seed twin of DEMO_STUDENT_USER
const marcus = INITIAL_PROFILES.find((p) => p.id === 'user_marcus_vance')!;

const withBrand = (ui: React.ReactElement) =>
  render(React.createElement(BrandProvider, { initialConfig: GEORGIA_TECH_BRAND, children: ui }));

const match = (id: string, owner: string, partner = alex): MatchItem => ({
  id,
  user1Id: owner,
  user2Id: partner.id,
  partnerProfile: partner,
  matchedAt: Date.now(),
  status: 'matched',
  sharedHobbies: [],
  mutualIntents: [],
});

const meetup = (id: string, owner: string | undefined, partner = alex, matchId = 'm1'): CalendarMeetup => ({
  id,
  ownerId: owner,
  matchId,
  partnerId: partner.id,
  partnerName: partner.name,
  partnerRole: partner.role,
  partnerAvatar: partner.avatarUrl,
  partnerMajorOrCompany: partner.major,
  locationName: 'Dancing Goats Coffee Bar',
  locationAddress: '33 Peachtree Pl NE',
  scheduledTime: new Date().toISOString(),
  durationMinutes: 45,
  status: 'confirmed',
  sharedHobbies: [],
});

describe('QA: data belongs to the person who created it', () => {
  beforeEach(() => Repository.resetAllData());

  it("switching personas never shows the other persona's matches or a meetup with yourself", () => {
    // Sarah matches with and books Alex
    Repository.saveMatch(match('m1', INITIAL_CURRENT_USER.id));
    Repository.saveScheduledMeetup(meetup('meetup_1', INITIAL_CURRENT_USER.id));

    expect(Repository.getMatchesFor(INITIAL_CURRENT_USER).map((m) => m.id)).toEqual(['m1']);
    expect(Repository.getMeetupsFor(INITIAL_CURRENT_USER).map((m) => m.id)).toEqual(['meetup_1']);

    // Alex (student persona) sees none of it: it's Sarah's, and it's "with Alex"
    expect(Repository.getMatchesFor(DEMO_STUDENT_USER)).toEqual([]);
    expect(Repository.getMeetupsFor(DEMO_STUDENT_USER)).toEqual([]);

    Repository.setCurrentUser(DEMO_STUDENT_USER);
    render(React.createElement(MyPlansView, {}));
    expect(screen.queryByText('Alex Chen')).toBeNull();
  });

  it('infers the owner of older meetups from their match, and keeps one meetup per (viewer, partner)', () => {
    Repository.saveMatch(match('m1', INITIAL_CURRENT_USER.id));
    localStorage.setItem('thirdplace_meetups_data', JSON.stringify([meetup('old_1', undefined, alex, 'm1')]));
    expect(Repository.getMeetupsFor(INITIAL_CURRENT_USER).map((m) => m.id)).toEqual(['old_1']);

    // A different viewer booking the same partner doesn't replace Sarah's meetup
    Repository.saveScheduledMeetup(meetup('marcus_view', 'someone_else', alex, 'm_other'));
    expect(Repository.getMeetupsFor(INITIAL_CURRENT_USER).map((m) => m.id)).toEqual(['old_1']);
  });

  it('new meetups record who booked them', () => {
    Repository.saveMatch(match('m1', INITIAL_CURRENT_USER.id, marcus));
    Repository.sendMessage('m1', INITIAL_CURRENT_USER, 'hi');
    render(React.createElement(SchedulerDrawer, { isOpen: true, onClose: () => {}, partner: marcus, matchId: 'm1' }));
    fireEvent.click(screen.getByText(/Confirm & Add to Google Calendar/i));
    expect(Repository.getScheduledMeetups()[0].ownerId).toBe(INITIAL_CURRENT_USER.id);
  });
});

describe('QA: Reconnect Deck only shows people from pop-ups you attended', () => {
  beforeEach(() => Repository.resetAllData());

  it("lists attendees of events you (or your demo twin) went to, not every event's attendees", () => {
    // Sarah's seed twin attends the Fintech dinner (Priya, David) and the BeltLine run (Marcus, Maya)
    render(React.createElement(SwipeRadarView, {}));
    fireEvent.click(screen.getByTestId('deck-tab-reconnect'));
    const names = [...document.querySelectorAll('h4')].map((h) => h.textContent);
    expect(names).toEqual(expect.arrayContaining(['Priya Sharma', 'Marcus Vance']));
    // Chloe only attended events Sarah didn't go to
    expect(names).not.toContain('Chloe Dubois');
  });
});

describe('QA: sensible times', () => {
  afterEach(() => vi.useRealTimers());

  it('demo pop-ups start on the hour during the day, even when the app is opened at night', () => {
    for (const hour of [2, 9, 15, 23]) {
      const now = new Date(2026, 10, 15, hour, 37).getTime();
      for (const offset of [2, 5, 8]) {
        const start = new Date(seedTimes(now, offset, 2).startTime);
        expect(start.getMinutes()).toBe(0);
        expect(start.getHours()).toBeGreaterThanOrEqual(8);
        expect(start.getHours()).toBeLessThanOrEqual(21);
        expect(start.getTime()).toBeGreaterThan(now);
      }
    }
  });

  it('no quick picks: both schedulers open on a sensible daytime date + time, even at 2 AM', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 15, 2, 4)); // 2:04 AM
    Repository.resetAllData();

    // 1-on-1 meetup
    const { unmount } = render(React.createElement(SchedulerDrawer, { isOpen: true, onClose: () => {}, partner: alex }));
    expect(screen.queryByText(/Tomorrow •|Today •/)).toBeNull();
    expect((screen.getByTestId('meetup-date-input') as HTMLInputElement).value).toBe('2026-11-15');
    expect((screen.getByTestId('meetup-time-input') as HTMLInputElement).value).toBe('09:00');
    unmount();

    // Pop-up
    withBrand(React.createElement(EventsMapView));
    fireEvent.click(screen.getByTestId('open-host-event-button'));
    expect(screen.queryByText(/In 1 hour|Tonight · 7 PM|Tomorrow · 6 PM/)).toBeNull();
    expect((screen.getByTestId('event-time-input') as HTMLInputElement).value).toBe('09:00');
  });

  it('the 1-on-1 scheduler blocks a past time', () => {
    render(React.createElement(SchedulerDrawer, { isOpen: true, onClose: () => {}, partner: alex }));
    fireEvent.change(screen.getByTestId('meetup-date-input'), { target: { value: '2020-01-01' } });
    expect(screen.getByRole('alert').textContent).toBe('Pick a start time in the future');
    const confirm = screen.getByText(/Confirm & Add to Google Calendar/i).closest('button')!;
    expect(confirm.disabled).toBe(true);
  });
});

describe('QA: Map feedback', () => {
  beforeEach(() => Repository.resetAllData());

  it('a search with no results says so (without blaming the radius) and can be cleared', () => {
    withBrand(React.createElement(EventsMapView));
    fireEvent.change(screen.getByTestId('events-search-input'), { target: { value: 'zzzz-no-match' } });
    expect(screen.getByTestId('no-events-match').textContent).toContain('No pop-ups match "zzzz-no-match"');
    expect(screen.getByText(/^0 of \d+ Events$/)).toBeDefined();
    fireEvent.click(screen.getByText('Clear search & filters'));
    expect(screen.queryByTestId('no-events-match')).toBeNull();
    expect((screen.getByTestId('events-search-input') as HTMLInputElement).value).toBe('');
  });

  it('confirms a newly scheduled pop-up and lets you open it', async () => {
    withBrand(React.createElement(EventsMapView));
    fireEvent.click(screen.getByTestId('open-host-event-button'));
    fireEvent.change(screen.getByTestId('event-title-input'), { target: { value: 'QA Chess Night' } });
    fireEvent.change(screen.getByTestId('event-location-input'), { target: { value: 'CULC' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('publish-event-button'));
    });
    const banner = screen.getByTestId('event-scheduled-banner');
    expect(banner.textContent).toMatch(/Pop-up scheduled · QA Chess Night · Starts/);
    fireEvent.click(screen.getByText('View'));
    expect(screen.getByTestId('event-detail-drawer')).toBeDefined();
  });

  it('category names match between the map chips and the schedule form', () => {
    withBrand(React.createElement(EventsMapView));
    expect(screen.getAllByText('AI & Startups').length).toBeGreaterThan(0);
    expect(screen.queryByText('Startups & AI')).toBeNull();
    fireEvent.click(screen.getByTestId('open-host-event-button'));
    expect(screen.queryByText('Networking & Mentorship')).toBeNull();
  });
});

describe('QA: empty states & explanations', () => {
  beforeEach(() => Repository.resetAllData());

  it('the Matches tab explains itself when empty', () => {
    render(React.createElement(MyPlansView, { onNavigateToRadar: () => {} }));
    fireEvent.click(screen.getByText(/^Matches \(0\)$/));
    expect(screen.getByTestId('matches-empty').textContent).toContain('No pending matches');
    expect(screen.getByText('Open Connect 1-on-1')).toBeDefined();
  });

  it('a small Connect deck says why (no extra link: the dropdown already offers Everyone)', () => {
    render(React.createElement(SwipeRadarView, {}));
    const hint = screen.getByTestId('deck-hint');
    expect(hint.textContent).toMatch(/people fit your intents within 5 mi/);
    expect(screen.queryByText('Show everyone')).toBeNull();
    expect(hint.querySelector('button')).toBeNull();
  });

  it('the full profile no longer has two "Looking for" headings', () => {
    render(React.createElement(SwipeRadarView, {}));
    fireEvent.click(screen.getByText('Tap for full profile'));
    const headings = [...document.querySelectorAll('h4')].map((h) => h.textContent?.toLowerCase());
    expect(headings.filter((h) => h === 'looking for')).toHaveLength(1);
    expect(headings).toContain('career goals');
  });
});

describe('QA: theme switch reachable on phones (My Profile)', () => {
  beforeEach(() => Repository.resetAllData());

  it('switches between dark and light from My Profile', () => {
    withBrand(React.createElement(AuthProvider, null, React.createElement(MyProfileDrawer, { isOpen: true, onClose: () => {} })));
    const light = screen.getByTestId('theme-light');
    fireEvent.click(light);
    expect(light.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    fireEvent.click(screen.getByTestId('theme-dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('Demo readiness', () => {
  beforeEach(() => Repository.resetAllData());

  it("a fresh demo shows Sarah's hosted seed pop-ups in My Plans, and as host she deletes rather than leaves", () => {
    // Seeds RSVP Sarah's directory twin (user_sarah_jenkins); the signed-in Sarah should own them
    const mine = Repository.getEvents().filter((e) => e.attendees.includes(INITIAL_CURRENT_USER.id));
    expect(mine.map((e) => e.id).sort()).toEqual(['event_beltline_sunset_run', 'event_fintech_alumni_dinner']);
    expect(Repository.getEvents().some((e) => e.attendees.includes('user_sarah_jenkins'))).toBe(false);

    render(React.createElement(MyPlansView, {}));
    expect(screen.getByText(/^Hosting \(2\)$/)).toBeDefined();
    expect(screen.getByText(/^RSVPs \(0\)$/)).toBeDefined();

    // Sarah (via her twin) hosts both, so "Leave" is refused and the pop-up stays hers...
    expect(Repository.getEvents().find((e) => e.id === 'event_fintech_alumni_dinner')!.hostId).toBe(INITIAL_CURRENT_USER.id);
    expect(Repository.rsvpEvent('event_fintech_alumni_dinner', INITIAL_CURRENT_USER.id)).toBe(false);
    expect(Repository.getEvents().find((e) => e.id === 'event_fintech_alumni_dinner')!.attendees).toContain(INITIAL_CURRENT_USER.id);
    // ...and deleting removes it
    expect(Repository.deleteEvent('event_fintech_alumni_dinner', INITIAL_CURRENT_USER)).toBe(true);
    expect(Repository.getEvents().some((e) => e.id === 'event_fintech_alumni_dinner')).toBe(false);
  });

  it('Reset demo needs a second tap, then restores the defaults', () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
    try {
      Repository.updateCurrentUser({ name: 'Somebody Else' });
      Repository.saveMatch(match('m1', INITIAL_CURRENT_USER.id));
      render(React.createElement(ResetDemoButton));
      const btn = screen.getByTestId('reset-demo-button');

      fireEvent.click(btn);
      expect(btn.textContent).toContain('Tap again to reset');
      expect(Repository.getCurrentUser().name).toBe('Somebody Else'); // not yet

      fireEvent.click(btn);
      expect(Repository.getCurrentUser().name).toBe(INITIAL_CURRENT_USER.name);
      expect(Repository.getMatches()).toEqual([]);
      expect(reload).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });
});

describe('Scheduling opens Google Calendar (no .ics download) and allows long meetings', () => {
  beforeEach(() => Repository.resetAllData());
  afterEach(() => vi.restoreAllMocks());

  it('Confirm opens a pre-filled Google Calendar event with the partner as a guest, and downloads nothing', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const createUrl = vi.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createUrl;

    render(React.createElement(SchedulerDrawer, { isOpen: true, onClose: () => {}, partner: alex }));
    // 90 minutes: set the end time 1.5h after the start
    const startValue = (screen.getByTestId('meetup-time-input') as HTMLInputElement).value;
    const [h, m] = startValue.split(':').map(Number);
    const endMin = h * 60 + m + 90;
    fireEvent.change(screen.getByTestId('meetup-end-input'), {
      target: { value: `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}` },
    });
    fireEvent.click(screen.getByText(/Confirm & Add to Google Calendar/i));

    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(open.mock.calls[0][0] as string);
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('add')).toBe(alex.email);
    const [start, end] = url.searchParams.get('dates')!.split('/');
    const toMs = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +d.slice(9, 11), +d.slice(11, 13));
    expect(toMs(end) - toMs(start)).toBe(90 * 60 * 1000);
    expect(createUrl).not.toHaveBeenCalled(); // no .ics blob download

    expect(screen.getByText('Meetup Confirmed!')).toBeDefined();
    expect(screen.getByTestId('open-google-calendar').getAttribute('href')).toBe(open.mock.calls[0][0]);
    expect(Repository.getScheduledMeetups()[0].durationMinutes).toBe(90);
  });

  it('length comes from Starts/Ends fields (no length buttons), keeps length when the start moves, and validates', () => {
    render(React.createElement(SchedulerDrawer, { isOpen: true, onClose: () => {}, partner: alex }));
    expect(screen.queryByTestId('meetup-duration-30')).toBeNull();
    fireEvent.change(screen.getByTestId('meetup-time-input'), { target: { value: '13:00' } });
    // default length is 45 min, so the end follows the start
    expect((screen.getByTestId('meetup-end-input') as HTMLInputElement).value).toBe('13:45');
    fireEvent.change(screen.getByTestId('meetup-end-input'), { target: { value: '16:00' } });
    expect(screen.getByTestId('meetup-time-preview').textContent).toContain('3 hr');
    fireEvent.change(screen.getByTestId('meetup-end-input'), { target: { value: '12:00' } });
    expect(screen.getByRole('alert').textContent).toBe('End time must be after the start');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(90)).toBe('1.5 hr');
  });
});
