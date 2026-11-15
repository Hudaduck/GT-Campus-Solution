import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  generateIcsFile,
  generateGoogleCalendarUrl,
  formatDateForIcs,
} from './calendarUtils';
import { SchedulerDrawer } from './SchedulerDrawer';
import { MyPlansView } from './MyPlansView';
import { Repository, INITIAL_PROFILES, INITIAL_CURRENT_USER } from '../../shared/contracts/../../shared/data/repository';

describe('Scheduler Module - .ics and Google Calendar Utils', () => {
  it('generates an RFC 5545 compliant .ics file with required fields', () => {
    const details = {
      title: 'ThirdPlace Coffee: Sarah & Alex',
      description: 'Debating vector search over a cortado at Dancing Goats.',
      locationName: 'Dancing Goats Coffee Bar',
      locationAddress: '33 Peachtree Pl NE, Atlanta, GA 30309',
      startTime: '2026-11-15T15:00:00.000Z',
      durationMinutes: 45,
      partnerName: 'Alex Chen',
    };

    const ics = generateIcsFile(details);

    // Verify critical standard fields required by Verification Suite 2
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:ThirdPlace Coffee: Sarah & Alex');
    expect(ics).toContain('DTSTART:20261115T150000Z');
    expect(ics).toContain('DTEND:20261115T154500Z');
    expect(ics).toContain('LOCATION:Dancing Goats Coffee Bar, 33 Peachtree Pl NE, Atlanta, GA 30309');
    expect(ics).toContain('END:VCALENDAR');

    // Also check VEVENT wrapper and version
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('END:VEVENT');
  });

  it('formats dates correctly for iCalendar format YYYYMMDDTHHmmssZ', () => {
    const date = new Date('2026-12-01T14:30:00.000Z');
    const formatted = formatDateForIcs(date);
    expect(formatted).toBe('20261201T143000Z');
  });

  it('generates a valid Google Calendar deep-link URL with encoded query parameters', () => {
    const details = {
      title: 'AI Founder Catchup',
      description: 'Discussing LLM evals',
      locationName: 'Blue Bottle Coffee',
      locationAddress: 'West Midtown',
      startTime: '2026-11-20T10:00:00.000Z',
      durationMinutes: 60,
    };

    const url = generateGoogleCalendarUrl(details);
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=AI+Founder+Catchup');
    expect(url).toContain('dates=20261120T100000Z%2F20261120T110000Z');
    expect(url).toContain('location=Blue+Bottle+Coffee%2C+West+Midtown');
  });
});

describe('Scheduler Module - UI Components', () => {
  beforeEach(() => {
    Repository.resetAllData();
  });

  it('renders SchedulerDrawer and allows selecting coffee spot and confirming meetup', () => {
    const partner = INITIAL_PROFILES[0]; // Alex Chen
    let scheduledResult: any = null;

    const { getByText } = render(
      React.createElement(SchedulerDrawer, {
        isOpen: true,
        onClose: () => {},
        partner,
        onScheduled: (meetup) => {
          scheduledResult = meetup;
        },
      })
    );

    // Partner info displayed
    expect(getByText('Alex Chen')).toBeDefined();

    // Midpoint coffee spots displayed
    expect(getByText('Dancing Goats Coffee Bar')).toBeDefined();
    expect(getByText('Blue Bottle Coffee')).toBeDefined();

    // Click confirm button
    const confirmButton = getByText(/Confirm & Add to Google Calendar/i);
    fireEvent.click(confirmButton);

    // Verify scheduled callback fired with partner and location info
    expect(scheduledResult).not.toBeNull();
    expect(scheduledResult.partnerName).toBe('Alex Chen');
    expect(scheduledResult.locationName).toBe('Dancing Goats Coffee Bar');

    // Verify saved to Repository
    const meetups = Repository.getScheduledMeetups();
    expect(meetups.length).toBeGreaterThanOrEqual(1);
    expect(meetups[0].partnerName).toBe('Alex Chen');
  });

  it('renders MyPlansView with RSVPs, matches, and scheduled meetups', () => {
    // Save a test match
    Repository.saveMatch({
      id: 'match_alex_test',
      user1Id: INITIAL_CURRENT_USER.id,
      user2Id: INITIAL_PROFILES[0].id,
      partnerProfile: INITIAL_PROFILES[0],
      matchedAt: Date.now(),
      status: 'matched',
      sharedHobbies: ['bouldering', 'pour-over coffee'],
      mutualIntents: ['co-founder'],
    });

    const { getByText, getByRole, queryByRole } = render(
      React.createElement(MyPlansView, {})
    );

    // Header rendered
    expect(getByText('My Plans & Connections')).toBeDefined();

    // Pending 1-on-1 Matches section displays match; without a chat only messaging is offered
    expect(getByText('Alex Chen')).toBeDefined();
    expect(getByRole('button', { name: /Message/i })).toBeDefined();
    expect(queryByRole('button', { name: /Schedule/i })).toBeNull();
    expect(getByText('Chat first to plan a meetup')).toBeDefined();
  });

  it('unlocks Schedule in My Plans once both people have chatted', () => {
    const partner = INITIAL_PROFILES[0];
    const match = Repository.getOrCreateMatch(INITIAL_CURRENT_USER, partner);
    Repository.sendMessage(match.id, INITIAL_CURRENT_USER, 'Free Thursday afternoon?');
    // Only one side has spoken: still locked
    expect(Repository.hasConversation(match.id, INITIAL_CURRENT_USER.id)).toBe(false);
    Repository.sendMessage(match.id, partner, 'Thursday works!');
    expect(Repository.hasConversation(match.id, INITIAL_CURRENT_USER.id)).toBe(true);

    const { getByRole } = render(React.createElement(MyPlansView, {}));
    expect(getByRole('button', { name: /Schedule/i })).toBeDefined();
  });
});
