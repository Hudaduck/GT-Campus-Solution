import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { MyPlansView } from './MyPlansView';
import { SchedulerDrawer } from './SchedulerDrawer';
import { SwipeRadarView } from '../swipe-radar/SwipeRadarView';
import { Repository, INITIAL_PROFILES, INITIAL_CURRENT_USER } from '../../shared/data/repository';
import { CalendarMeetup, MatchItem } from '../../shared/contracts';

const alex = INITIAL_PROFILES[0];
const marcus = INITIAL_PROFILES.find((p) => p.id === 'user_marcus_vance')!;

const match = (id: string, partner = alex, overrides: Partial<MatchItem> = {}): MatchItem => ({
  id,
  user1Id: INITIAL_CURRENT_USER.id,
  user2Id: partner.id,
  partnerProfile: partner,
  matchedAt: Date.now(),
  status: 'matched',
  sharedHobbies: [],
  mutualIntent: partner.intent,
  ...overrides,
});

const meetup = (id: string, partner = alex, overrides: Partial<CalendarMeetup> = {}): CalendarMeetup => ({
  id,
  matchId: 'm1',
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
  ...overrides,
});

describe('My Plans has no duplicates', () => {
  beforeEach(() => Repository.resetAllData());

  it('keeps one match per pair of people, in either direction', () => {
    Repository.saveMatch(match('m1'));
    Repository.saveMatch(match('m2')); // connect again with the same person
    Repository.saveMatch(match('m3', alex, { user1Id: alex.id, user2Id: INITIAL_CURRENT_USER.id })); // reversed
    const matches = Repository.getMatches();
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('m1'); // original id survives
    expect(Repository.findMatchWith(alex.id, INITIAL_CURRENT_USER.id)?.id).toBe('m1');
  });

  it('never downgrades a scheduled match back to pending', () => {
    Repository.saveMatch(match('m1', alex, { status: 'scheduled' }));
    Repository.saveMatch(match('m2'));
    expect(Repository.getMatches()[0].status).toBe('scheduled');
  });

  it('cleans up duplicates already saved by older builds', () => {
    localStorage.setItem(
      'thirdplace_matches_data',
      JSON.stringify([match('m3'), match('m2', alex, { status: 'scheduled' }), match('m1'), match('mx', marcus)])
    );
    localStorage.setItem('thirdplace_meetups_data', JSON.stringify([meetup('meetup_2'), meetup('meetup_1')]));

    const matches = Repository.getMatches();
    expect(matches.map((m) => m.partnerProfile.name).sort()).toEqual(['Alex Chen', 'Marcus Vance']);
    expect(matches.find((m) => m.partnerProfile.id === alex.id)?.status).toBe('scheduled');
    expect(Repository.getScheduledMeetups().map((m) => m.id)).toEqual(['meetup_2']); // newest kept
  });

  it('scheduling the same person again reschedules instead of adding a second meetup', () => {
    Repository.saveScheduledMeetup(meetup('meetup_1'));
    Repository.saveScheduledMeetup(meetup('meetup_2', alex, { locationName: 'Blue Bottle Coffee' }));
    const meetups = Repository.getScheduledMeetups();
    expect(meetups).toHaveLength(1);
    expect(meetups[0].locationName).toBe('Blue Bottle Coffee');
  });

  it('shows each person once: someone with a meetup is not also pending', () => {
    Repository.saveMatch(match('m1'));
    Repository.saveMatch(match('m2', marcus));
    render(
      React.createElement(SchedulerDrawer, { isOpen: true, onClose: () => {}, partner: alex, matchId: 'm1' })
    );
    fireEvent.click(screen.getByText(/Confirm & Download .ics Meetup/i));
    expect(Repository.findMatchWith(INITIAL_CURRENT_USER.id, alex.id)?.status).toBe('scheduled');

    render(React.createElement(MyPlansView, {}));
    const plans = screen.getByTestId('my-plans-view');
    const names = [...plans.querySelectorAll('h4')].map((h) => h.textContent);
    expect(names.filter((n) => n === 'Alex Chen')).toHaveLength(1);
    expect(names.filter((n) => n === 'Marcus Vance')).toHaveLength(1);
  });

  it('removes people you already connected with from the deck, and reuses the match if you connect again', () => {
    Repository.saveMatch(match('m1'));
    render(React.createElement(SwipeRadarView, {}));
    // Alex (already matched) is skipped; the deck starts with the next person
    expect(screen.queryByText('Alex Chen')).toBeNull();
    fireEvent.click(screen.getByTitle('Connect & Meet'));
    const matches = Repository.getMatches();
    expect(matches).toHaveLength(2);
    expect(new Set(matches.map((m) => m.partnerProfile.id)).size).toBe(2);
  });
});
