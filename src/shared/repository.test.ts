import { describe, it, expect } from 'vitest';
import { GEORGIA_TECH_BRAND, BRAND_PALETTE } from '../shared/config/brandConfig';
import {
  filterExpiredItems,
  scoreEventByHobbiesAndNetwork,
  getEventScoreDetails,
  Repository,
  INITIAL_CURRENT_USER,
  INITIAL_EVENTS,
  INITIAL_PROFILES,
  formatHobby,
  formatHobbies,
  POPULAR_HOBBIES,
} from '../shared/data/repository';
import { UserProfile, EventItem } from '../shared/contracts';

describe('Brand Config & White-Labeling', () => {
  it('uses the exact four-color palette', () => {
    expect(BRAND_PALETTE).toEqual({ gold: '#B39051', darkGold: '#8F713D', navy: '#051E39', white: '#FFFFFF' });
    expect(GEORGIA_TECH_BRAND.palette).toBe(BRAND_PALETTE);
    expect(GEORGIA_TECH_BRAND.themeTokens.dark.canvas).toBe('#051E39');
    expect(GEORGIA_TECH_BRAND.themeTokens.dark.surface).toBe('#0A294B');
    expect(GEORGIA_TECH_BRAND.themeTokens.light.canvas).toBe('#FAF9F6');
    expect(GEORGIA_TECH_BRAND.themeTokens.light.surface).toBe('#FFFFFF');
    expect(GEORGIA_TECH_BRAND.themeTokens.light.textPrimary).toBe('#051E39');
  });

  it('exports GT brand tokens adhering to high contrast AAA requirements', () => {
    expect(GEORGIA_TECH_BRAND.appName).toBe('ThirdPlace');
    expect(GEORGIA_TECH_BRAND.studentEmailDomain).toBe('@gatech.edu');
    expect(GEORGIA_TECH_BRAND.alumniEmailDomain).toBe('@alumni.gatech.edu');
    expect(GEORGIA_TECH_BRAND.themeTokens.dark.primary).toBe('#051E39');
    expect(GEORGIA_TECH_BRAND.themeTokens.dark.secondary).toBe('#8F713D');
    expect(GEORGIA_TECH_BRAND.themeTokens.dark.accent).toBe('#B39051');
    expect(GEORGIA_TECH_BRAND.themeTokens.dark.onAccent).toBe('#051E39');
  });
});

describe('Repository & TTL Expiration Filtering', () => {
  it('filters out expired items based on timestamp', () => {
    const items = [
      { id: '1', title: 'Live Event', expiresAt: Date.now() + 100000 },
      { id: '2', title: 'Expired Event', expiresAt: Date.now() - 5000 },
    ];
    const valid = filterExpiredItems(items);
    expect(valid.length).toBe(1);
    expect(valid[0].id).toBe('1');
  });

  it('correctly scores events based on shared hobbies and network affiliation', () => {
    const event = INITIAL_EVENTS[0]; // AI Founders & Pour-Over
    const score = scoreEventByHobbiesAndNetwork(event, INITIAL_CURRENT_USER);
    expect(score).toBeGreaterThan(0);
  });
});

describe('Multi-Factor Recommendation Engine & Career Network Overlap', () => {
  it('prioritizes events with matching hobbies AND overlapping attendees (shared hobbies, major, or target companies)', () => {
    // Current user: Student targeting Stripe with CS major and bouldering hobby
    const studentUser: UserProfile = {
      ...INITIAL_CURRENT_USER,
      id: 'student_tester',
      email: 'student.tester@gatech.edu',
      role: 'student',
      major: 'Computer Science',
      hobbies: ['bouldering', 'AI startups'],
      targetCompanies: ['Stripe', 'Anthropic'],
      targetRoles: ['AI/ML Engineer'],
    };

    // Event A: Has matching hobbies AND attendee (Sarah Jenkins) from target company 'Stripe'
    const eventWithStripeAttendee: EventItem = {
      ...INITIAL_EVENTS[0],
      id: 'event_stripe_connected',
      title: 'AI & Payments Hack Gathering',
      tags: ['AI startups', 'bouldering'],
      attendees: ['user_sarah_jenkins'], // Sarah works at Stripe
    };

    // Event B: Same hobbies but attendees have no overlap with user's target companies
    const eventWithoutTargetAttendee: EventItem = {
      ...INITIAL_EVENTS[0],
      id: 'event_no_stripe',
      title: 'General Coding Circle',
      tags: ['AI startups', 'bouldering'],
      attendees: ['user_chloe_dubois'], // Chloe works at Perkins&Will (not user's target company)
    };

    const scoreWithStripe = scoreEventByHobbiesAndNetwork(eventWithStripeAttendee, studentUser, INITIAL_PROFILES);
    const scoreWithout = scoreEventByHobbiesAndNetwork(eventWithoutTargetAttendee, studentUser, INITIAL_PROFILES);

    // Event A must score higher due to attendee career overlap
    expect(scoreWithStripe).toBeGreaterThan(scoreWithout);

    // Also verify getEventScoreDetails generates human-readable match reasons
    const details = getEventScoreDetails(eventWithStripeAttendee, studentUser, INITIAL_PROFILES);
    expect(details.matchReasons.some((r) => r.includes('Shared') || r.includes('Stripe'))).toBe(true);
    expect(details.overlappingAttendees.length).toBeGreaterThan(0);
    expect(details.overlappingAttendees[0].reason).toContain('Stripe');
  });

  it('UserProfile persists workHistory, targetCompanies, and targetRoles cleanly', () => {
    const customUser: UserProfile = {
      ...INITIAL_CURRENT_USER,
      id: 'user_profile_persistence_test',
      name: 'Taylor Swift-YellowJacket',
      workHistory: [
        { company: 'Google', role: 'SWE Intern', period: 'Summer 2024' },
        { company: 'NCR Voyix', role: 'Product Intern', period: 'Spring 2024' },
      ],
      targetCompanies: ['Stripe', 'Anthropic', 'Delta Air Lines', 'Figma'],
      targetRoles: ['APM / Product Manager', 'AI/ML Engineer', 'Founding Engineer'],
    };

    // Save to repository
    Repository.saveProfile(customUser);
    Repository.setCurrentUser(customUser);

    // Retrieve from repository
    const loadedUser = Repository.getCurrentUser();
    expect(loadedUser.id).toBe(customUser.id);
    expect(loadedUser.workHistory).toBeDefined();
    expect(loadedUser.workHistory?.length).toBe(2);
    expect(loadedUser.workHistory?.[0].company).toBe('Google');
    expect(loadedUser.workHistory?.[0].role).toBe('SWE Intern');

    expect(loadedUser.targetCompanies).toEqual(['Stripe', 'Anthropic', 'Delta Air Lines', 'Figma']);
    expect(loadedUser.targetRoles).toEqual(['APM / Product Manager', 'AI/ML Engineer', 'Founding Engineer']);

    const profiles = Repository.getProfiles();
    const loadedProfile = profiles.find((p) => p.id === customUser.id);
    expect(loadedProfile).toBeDefined();
    expect(loadedProfile?.targetCompanies).toContain('Stripe');
  });
});

describe('Hobby capitalization', () => {
  it('formats hobbies and tags in Title Case, with special cases', () => {
    expect(formatHobby('pour-over coffee')).toBe('Pour-Over Coffee');
    expect(formatHobby('  board   games ')).toBe('Board Games');
    expect(formatHobby('ai startups')).toBe('AI Startups');
    expect(formatHobby('Volleyball')).toBe('Volleyball');
    expect(formatHobbies(['baking', 'Baking', 'hiking'])).toEqual(['Baking', 'Hiking']);
  });

  it('ships seed hobbies, popular hobbies and event tags already capitalized', () => {
    const isCapitalized = (h: string) => h === formatHobby(h) && /^[A-Z]/.test(h);
    expect(POPULAR_HOBBIES.every(isCapitalized)).toBe(true);
    expect(INITIAL_PROFILES.flatMap((p) => p.hobbies).every(isCapitalized)).toBe(true);
    expect(INITIAL_EVENTS.flatMap((e) => e.tags).every(isCapitalized)).toBe(true);
  });

  it('capitalizes older lowercase data saved in localStorage', () => {
    Repository.resetAllData();
    localStorage.setItem(
      'thirdplace_current_user',
      JSON.stringify({ ...INITIAL_CURRENT_USER, hobbies: ['running', 'pour-over coffee'] })
    );
    localStorage.setItem(
      'thirdplace_events_data',
      JSON.stringify([{ ...INITIAL_EVENTS[0], tags: ['ai startups', 'study'] }])
    );
    expect(Repository.getCurrentUser().hobbies).toEqual(['Running', 'Pour-Over Coffee']);
    expect(Repository.getEvents()[0].tags).toEqual(['AI Startups', 'Study']);
  });
});
