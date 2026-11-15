import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { BrandProvider } from '../../shared/config/brandConfig';
import {
  Repository,
  INITIAL_EVENTS,
  INITIAL_PROFILES,
  buildHobbyEcosystemEvents,
  buildSwipeCandidate,
  getEventScoreDetails,
  scoreEventByHobbiesAndNetwork,
  RECOMMENDED_SCORE_THRESHOLD,
} from '../../shared/data/repository';
import { EventsMapView } from '../events-map';
import { AuthProvider, LinkedInImportModal, parseLinkedInInput, DEMO_LINKEDIN_PRESET } from './index';
import { nameFromSlug } from './linkedinParser';

const NOW = new Date('2026-11-13T12:00:00Z');

describe('parseLinkedInInput (zero-backend LinkedIn parser)', () => {
  it('extracts "Alex Rivera" from the URL slug and attaches Volleyball + Baking', () => {
    const result = parseLinkedInInput('https://www.linkedin.com/in/alex-rivera/', '', NOW);
    expect(result.ok).toBe(true);
    expect(result.profile.name).toBe('Alex Rivera');
    expect(result.profile.hobbies).toEqual(['Volleyball', 'Baking']);
    expect(result.profile.linkedinUrl).toBe('https://www.linkedin.com/in/alex-rivera/');
  });

  it('falls back to Georgia Tech defaults when only a URL is given', () => {
    const { profile } = parseLinkedInInput('linkedin.com/in/alex-rivera', '', NOW);
    expect(profile.major).toBe('B.S. Computer Science');
    expect(profile.neighborhoodZone).toBe('Midtown • Tech Square');
    expect(profile.role).toBe('student');
    expect(profile.gradYear).toBe(2027);
    expect(profile.workHistory).toEqual([]);
    expect(profile.targetCompanies?.length).toBeGreaterThan(0);
  });

  it.each([
    ['ethanhu05', 'Ethan Hu'],
    ['first-last-1a2b3c4d', 'First Last'],
    ['mary-jane-watson', 'Mary Jane Watson'],
    ['priya_sharma', 'Priya Sharma'],
  ])('formats slug %s as "%s"', (slug, name) => {
    expect(nameFromSlug(slug)).toBe(name);
  });

  it('extracts companies, roles, grad year, GT major and extra interests from pasted text', () => {
    const text = [
      'Industrial & Systems Engineering @ Georgia Tech, Class of 2022',
      'Product Manager at Stripe · 2023 - Present',
      'Delta Air Lines — Revenue Analyst Intern, Summer 2021',
      'I love bouldering, volleyball and sourdough baking.',
    ].join('\n');
    const { profile, detected } = parseLinkedInInput('https://linkedin.com/in/jordan-blake', text, NOW);

    expect(profile.role).toBe('alumni');
    expect(profile.gradYear).toBe(2022);
    expect(profile.major).toBe('B.S. Industrial & Systems Engineering');
    expect(profile.workHistory).toEqual([
      { company: 'Stripe', role: 'Product Manager', period: '2023 - Present', isCurrent: true },
      { company: 'Delta Air Lines', role: 'Revenue Analyst Intern', period: 'Summer 2021' },
    ]);
    expect(profile.companyOrLab).toBe('Stripe • Product Manager');
    expect(profile.hobbies).toEqual(['Volleyball', 'Baking', 'Bouldering']);
    expect(detected.workHistory).toBe(2);
  });

  it('rejects input that is not a LinkedIn profile URL', () => {
    const result = parseLinkedInInput('https://example.com/alex', '', NOW);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/linkedin\.com\/in/);
  });

  it('parses the demo preset into a full profile', () => {
    const { profile } = parseLinkedInInput(DEMO_LINKEDIN_PRESET.url, DEMO_LINKEDIN_PRESET.text, NOW);
    expect(profile.name).toBe('Ethan Hu');
    expect(profile.hobbies.slice(0, 2)).toEqual(['Volleyball', 'Baking']);
    expect(profile.workHistory?.map((w) => w.company)).toEqual(['GT Research Lab', 'Google']);
    expect(profile.targetCompanies).toContain('Google');
  });
});

describe('Launching an imported profile into the live ecosystem', () => {
  beforeEach(() => Repository.resetAllData());

  it('registers the profile, seeds Volleyball/Baking events + people, and immediately lifts recommendation scores', () => {
    const { profile } = parseLinkedInInput('https://www.linkedin.com/in/alex-rivera/', '', NOW);
    const [volleyball, baking] = buildHobbyEcosystemEvents();

    // Before launch the hobby events don't exist yet, and existing events barely match
    expect(Repository.getEvents().some((e) => e.id === volleyball.id)).toBe(false);
    const bestBefore = Math.max(
      ...Repository.getEvents().map((e) => scoreEventByHobbiesAndNetwork(e, profile, Repository.getProfiles()))
    );

    Repository.registerImportedProfile(profile);

    expect(Repository.getCurrentUser().id).toBe(profile.id);
    const profiles = Repository.getProfiles();
    expect(profiles.map((p) => p.id)).toEqual(
      expect.arrayContaining([profile.id, 'user_jasmine_lee', 'user_marco_alvarez', 'user_nina_okafor'])
    );

    const events = Repository.getEvents();
    const scores = events
      .map((e) => ({ id: e.id, ...getEventScoreDetails(e, profile, profiles) }))
      .sort((a, b) => b.score - a.score);
    expect(scores.slice(0, 2).map((s) => s.id).sort()).toEqual([baking.id, volleyball.id].sort());
    expect(scores[0].score).toBeGreaterThan(bestBefore);
    expect(scores[0].score).toBeGreaterThanOrEqual(RECOMMENDED_SCORE_THRESHOLD);
    expect(scores[0].matchReasons).toContain('1 Shared Hobby');
  });

  it('is idempotent: launching twice does not duplicate seeds', () => {
    const { profile } = parseLinkedInInput('https://www.linkedin.com/in/alex-rivera/', '', NOW);
    Repository.registerImportedProfile(profile);
    Repository.registerImportedProfile({ ...profile, name: 'Alex R.' });
    expect(Repository.getEvents().filter((e) => e.id === 'event_piedmont_sand_volleyball')).toHaveLength(1);
    expect(Repository.getProfiles().filter((p) => p.id === profile.id)).toHaveLength(1);
    expect(Repository.getProfiles().find((p) => p.id === profile.id)?.name).toBe('Alex R.');
  });

  it('surfaces Volleyball/Baking people with career overlap on the Swipe Radar', () => {
    const { profile } = parseLinkedInInput(DEMO_LINKEDIN_PRESET.url, DEMO_LINKEDIN_PRESET.text, NOW);
    Repository.registerImportedProfile(profile);
    const deck = Repository.getProfiles()
      .filter((p) => p.id !== profile.id)
      .map((p) => buildSwipeCandidate(profile, p))
      .sort((a, b) => b.overlapScore - a.overlapScore);

    const top = deck.slice(0, 3).map((c) => c.name);
    expect(top).toEqual(expect.arrayContaining(['Jasmine Lee', 'Marco Alvarez']));
    const marco = deck.find((c) => c.name === 'Marco Alvarez')!;
    expect(marco.sharedHobbies).toEqual(expect.arrayContaining(['Baking', 'Volleyball']));
    expect(marco.careerBadges.map((b) => b.label)).toContain('Works at Stripe');
  });

  it('leaves the original seed data untouched', () => {
    expect(INITIAL_PROFILES.some((p) => p.id === 'user_jasmine_lee')).toBe(false);
    expect(INITIAL_EVENTS.some((e) => e.id === 'event_piedmont_sand_volleyball')).toBe(false);
  });
});

describe('LinkedInImportModal UI', () => {
  beforeEach(() => Repository.resetAllData());

  const renderWithMap = () =>
    render(
      React.createElement(
        BrandProvider,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(EventsMapView, { layout: 'web' }),
          React.createElement(LinkedInImportModal, { isOpen: true, onClose: () => {} })
        )
      )
    );

  it('Demo Preset → review → Launch My Profile updates the live recommendations', async () => {
    renderWithMap();

    fireEvent.click(screen.getByTestId('linkedin-demo-preset'));
    expect((screen.getByTestId('linkedin-review-name') as HTMLInputElement).value).toBe('Ethan Hu');
    expect(screen.getByRole('button', { name: /Volleyball/, pressed: true })).toBeDefined();
    expect(screen.getByRole('button', { name: /Baking/, pressed: true })).toBeDefined();

    fireEvent.click(screen.getByTestId('linkedin-launch'));
    expect(screen.getByTestId('linkedin-launched').textContent).toContain("You're live, Ethan!");
    expect(Repository.getCurrentUser().name).toBe('Ethan Hu');

    // The isolated Events Map re-syncs via the user-changed event and ranks the new hobby events
    const section = await screen.findByTestId('recommended-for-you');
    await within(section).findByTestId('event-card-event_piedmont_sand_volleyball');
    expect(within(section).getByTestId('event-card-event_midtown_sourdough_swap')).toBeDefined();
  });

  it('lets you pick intents in review; switching Student/Alum never changes them', () => {
    renderWithMap();
    fireEvent.click(screen.getByTestId('linkedin-demo-preset'));

    const picker = screen.getByTestId('linkedin-intents');
    // No guess from LinkedIn: starts open to anything
    expect(within(picker).getByTestId('intent-open-status')).toBeDefined();

    // An alum can look for a mentor too
    fireEvent.click(screen.getByRole('button', { name: 'Alum' }));
    fireEvent.click(within(picker).getByTestId('intent-btn-find-mentor'));
    fireEvent.click(screen.getByRole('button', { name: 'Student' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alum' }));
    expect(within(picker).getByTestId('intent-btn-find-mentor').getAttribute('aria-pressed')).toBe('true');
    expect(within(picker).getByTestId('intent-btn-give-mentorship').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByTestId('linkedin-launch'));
    const user = Repository.getCurrentUser();
    expect(user.role).toBe('alumni');
    expect(user.intents).toEqual(['find-mentor']);
  });

  it('shows a validation error for a non-LinkedIn URL', () => {
    renderWithMap();
    fireEvent.change(screen.getByTestId('linkedin-url-input'), { target: { value: 'not a url' } });
    fireEvent.click(screen.getByTestId('linkedin-generate'));
    expect(screen.getByRole('alert').textContent).toMatch(/LinkedIn profile URL/);
  });
});
