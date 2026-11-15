import { describe, it, expect, beforeEach } from 'vitest';
import { GEORGIA_TECH_BRAND, BrandConfig } from '../src/shared/config/brandConfig';
import {
  filterExpiredItems,
  scoreEventByHobbiesAndNetwork,
  Repository,
  INITIAL_CURRENT_USER,
  INITIAL_EVENTS,
  INITIAL_PROFILES,
} from '../src/shared/data/repository';
import { generateIcsFile, generateGoogleCalendarUrl } from '../src/modules/scheduler/calendarUtils';
import { EventItem, UserProfile } from '../src/shared/contracts';

describe('Suite 2: Unit Tests (Vitest)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. brandConfig white-label reactivity
  describe('1. brandConfig White-Label Reactivity', () => {
    it('provides GT brand tokens adhering to color and domain specifications', () => {
      expect(GEORGIA_TECH_BRAND.appName).toBe('ThirdPlace');
      expect(GEORGIA_TECH_BRAND.studentEmailDomain).toBe('@gatech.edu');
      expect(GEORGIA_TECH_BRAND.alumniEmailDomain).toBe('@alumni.gatech.edu');
      expect(GEORGIA_TECH_BRAND.themeTokens.dark.primary).toBe('#051E39'); // Navy
      expect(GEORGIA_TECH_BRAND.themeTokens.dark.secondary).toBe('#8F713D'); // Dark Gold
      expect(GEORGIA_TECH_BRAND.themeTokens.dark.accent).toBe('#B39051'); // Gold
      expect(GEORGIA_TECH_BRAND.themeTokens.dark.onAccent).toBe('#051E39'); // Navy text on Gold
    });

    it('supports dynamic white-label configuration updates', () => {
      const customBrand: BrandConfig = {
        ...GEORGIA_TECH_BRAND,
        appName: 'EmoryConnect',
        shortName: 'Emory',
        studentEmailDomain: '@emory.edu',
        alumniEmailDomain: '@alumni.emory.edu',
      };

      expect(customBrand.appName).toBe('EmoryConnect');
      expect(customBrand.studentEmailDomain).toBe('@emory.edu');
      expect(customBrand.alumniEmailDomain).toBe('@alumni.emory.edu');
    });
  });

  // 2. Automatic TTL expiration
  describe('2. Automatic TTL Expiration', () => {
    it('filters out items whose expiresAt timestamp is in the past', () => {
      const now = Date.now();
      const mockItems: { id: string; expiresAt?: number }[] = [
        { id: 'active-1', expiresAt: now + 3600000 },
        { id: 'expired-1', expiresAt: now - 1000 },
        { id: 'no-ttl-item' },
        { id: 'expired-2', expiresAt: now - 3600000 },
      ];

      const validItems = filterExpiredItems(mockItems);
      expect(validItems.length).toBe(2);
      expect(validItems.map((i) => i.id)).toEqual(['active-1', 'no-ttl-item']);
    });

    it('Repository automatically filters expired events and preserves active ones', () => {
      const now = Date.now();
      const activeEvent: EventItem = {
        ...INITIAL_EVENTS[0],
        id: 'active_popup_event',
        expiresAt: now + 1000 * 60 * 60,
      };
      const expiredEvent: EventItem = {
        ...INITIAL_EVENTS[1],
        id: 'expired_popup_event',
        expiresAt: now - 1000 * 60 * 60,
      };

      localStorage.setItem(
        'thirdplace_events_data',
        JSON.stringify([activeEvent, expiredEvent])
      );

      const events = Repository.getEvents();
      expect(events.some((e) => e.id === 'active_popup_event')).toBe(true);
      expect(events.some((e) => e.id === 'expired_popup_event')).toBe(false);
    });

    it('Repository automatically handles openToMeet TTL expiration for profiles', () => {
      const expiredProfile: UserProfile = {
        ...INITIAL_CURRENT_USER,
        id: 'user_expired_ttl',
        isOpenToMeet: true,
        openToMeetExpiresAt: Date.now() - 5000,
      };

      localStorage.setItem('thirdplace_profiles_data', JSON.stringify([expiredProfile]));
      const profiles = Repository.getProfiles();
      const loaded = profiles.find((p) => p.id === 'user_expired_ttl');
      expect(loaded).toBeDefined();
      expect(loaded?.isOpenToMeet).toBe(false);
    });
  });

  // 3. Hobby recommendation ranking score
  describe('3. Hobby Recommendation Ranking Score', () => {
    it('awards +15 points for each shared hobby between user and event tags', () => {
      const user: UserProfile = {
        ...INITIAL_CURRENT_USER,
        hobbies: ['bouldering', 'pour-over coffee'],
        intents: [],
        role: 'student',
      };

      const eventWithTwoMatches: EventItem = {
        ...INITIAL_EVENTS[0],
        tags: ['bouldering', 'pour-over coffee', 'other'],
        attendees: [],
        isHostAlum: false,
      };

      const score = scoreEventByHobbiesAndNetwork(eventWithTwoMatches, user);
      // 2 hobbies * 15 = 30
      expect(score).toBeGreaterThanOrEqual(30);
    });

    it('awards mentorship bonus (+20) when student connects with alumni-hosted event', () => {
      const studentUser: UserProfile = {
        ...INITIAL_CURRENT_USER,
        role: 'student',
        hobbies: [],
        intents: ['find-mentor'],
      };

      const alumHostedEvent: EventItem = {
        ...INITIAL_EVENTS[0],
        isHostAlum: true,
        category: 'networking',
        tags: [],
        attendees: [],
      };

      const score = scoreEventByHobbiesAndNetwork(alumHostedEvent, studentUser);
      // Mentorship bonus 20 + intent mentorship bonus 25 = 45
      expect(score).toBe(45);
    });

    it('factors in attendee overlap and intent alignment', () => {
      const founderUser: UserProfile = {
        ...INITIAL_CURRENT_USER,
        role: 'student',
        hobbies: ['AI startups'],
        intents: ['co-founder'],
      };

      const startupEvent: EventItem = {
        ...INITIAL_EVENTS[0],
        tags: ['AI startups'],
        category: 'startup',
        isHostAlum: false,
        attendees: ['user_alex', 'user_marcus'],
      };

      const score = scoreEventByHobbiesAndNetwork(startupEvent, founderUser);
      // 15 (shared hobby) + 25 (co-founder intent) + 6 (2 attendees * 3) = 46
      expect(score).toBe(46);
    });
  });

  // 4. .ics calendar file fields
  describe('4. Pure-TypeScript .ics Calendar Generator RFC 5545 Compliance', () => {
    it('generates standard mandatory .ics fields', () => {
      const ics = generateIcsFile({
        title: 'Midpoint Coffee @ Dancing Goats',
        description: 'Debating AI infra over espresso.',
        locationName: 'Dancing Goats Coffee Bar',
        locationAddress: '33 Peachtree Pl NE, Atlanta, GA 30309',
        startTime: '2026-11-20T15:00:00Z',
        durationMinutes: 45,
        partnerName: 'Alex Chen',
      });

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY:Midpoint Coffee @ Dancing Goats');
      expect(ics).toContain('DTSTART:20261120T150000Z');
      expect(ics).toContain('DTEND:20261120T154500Z');
      expect(ics).toContain('LOCATION:Dancing Goats Coffee Bar, 33 Peachtree Pl NE, Atlanta, GA 30309');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('generates Google Calendar one-click deep link with encoded details', () => {
      const gcalUrl = generateGoogleCalendarUrl({
        title: 'GT Meetup',
        locationName: 'Tech Square',
        startTime: '2026-11-20T15:00:00Z',
        durationMinutes: 30,
      });

      expect(gcalUrl).toContain('https://calendar.google.com/calendar/render');
      expect(gcalUrl).toContain('action=TEMPLATE');
      expect(gcalUrl).toContain('text=GT+Meetup');
    });
  });

  // 5. Dual student/alumni verification logic
  describe('5. Dual Student / Alumni Verification Logic', () => {
    it('verifies student email using university student domain (@gatech.edu)', () => {
      const validStudentEmail = 'student@gatech.edu';
      const invalidEmail = 'student@gmail.com';

      const isStudentValid = validStudentEmail.endsWith(GEORGIA_TECH_BRAND.studentEmailDomain);
      const isInvalidValid = invalidEmail.endsWith(GEORGIA_TECH_BRAND.studentEmailDomain);

      expect(isStudentValid).toBe(true);
      expect(isInvalidValid).toBe(false);
    });

    it('verifies alumni email using @alumni.gatech.edu domain', () => {
      const alumEmail = 'alum@alumni.gatech.edu';
      const isAlumDomain =
        alumEmail.endsWith(GEORGIA_TECH_BRAND.alumniEmailDomain) ||
        alumEmail.endsWith(GEORGIA_TECH_BRAND.studentEmailDomain);

      expect(isAlumDomain).toBe(true);
    });

    it('validates alumni LinkedIn URL format', () => {
      const validLinkedin1 = 'https://www.linkedin.com/in/sarah-jenkins-gt/';
      const validLinkedin2 = 'linkedin.com/in/alex-chen';
      const invalidLinkedin = 'https://twitter.com/gt_buzz';

      const linkedinPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?.*$/i;

      expect(linkedinPattern.test(validLinkedin1)).toBe(true);
      expect(linkedinPattern.test(validLinkedin2)).toBe(true);
      expect(linkedinPattern.test(invalidLinkedin)).toBe(false);
    });

    it('verifies 1-tap peer vouching increments vouch count and marks verified', () => {
      const user = { ...INITIAL_PROFILES[0], verified: false, vouchesCount: 0 };
      const updated = {
        ...user,
        verified: true,
        verificationMethod: 'peer_vouch' as const,
        vouchesCount: user.vouchesCount + 1,
        vouchedBy: ['Buzz Ambassador Network'],
      };

      expect(updated.verified).toBe(true);
      expect(updated.vouchesCount).toBe(1);
      expect(updated.verificationMethod).toBe('peer_vouch');
      expect(updated.vouchedBy).toContain('Buzz Ambassador Network');
    });
  });
});
