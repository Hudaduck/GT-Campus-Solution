import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMutualIntents,
  isIntentCompatible,
  resolveIntents,
  toggleIntent,
  sortIntents,
} from './intents';
import { Repository, INITIAL_CURRENT_USER, INITIAL_PROFILES, buildSwipeCandidate } from './data/repository';

const withIntents = (intents: any[]) => ({ intents });

describe('Intent matching', () => {
  it('pairs mentees with mentors, not mentors with mentors', () => {
    expect(getMutualIntents(withIntents(['find-mentor']), withIntents(['give-mentorship']))).toEqual(['find-mentor']);
    expect(getMutualIntents(withIntents(['give-mentorship']), withIntents(['find-mentor']))).toEqual(['give-mentorship']);
    expect(getMutualIntents(withIntents(['find-mentor']), withIntents(['find-mentor']))).toEqual([]);
    expect(getMutualIntents(withIntents(['give-mentorship']), withIntents(['give-mentorship']))).toEqual([]);
  });

  it('pairs symmetric intents with themselves', () => {
    expect(getMutualIntents(withIntents(['co-founder', 'study']), withIntents(['study', 'casual']))).toEqual(['study']);
  });

  it('treats an empty intents list as open to anything', () => {
    expect(isIntentCompatible(withIntents([]), withIntents(['roommate']))).toBe(true);
    expect(isIntentCompatible(withIntents(['roommate']), withIntents([]))).toBe(true);
    expect(isIntentCompatible(withIntents(['roommate']), withIntents(['study']))).toBe(false);
  });

  it('lets anyone be on either side: a student mentor pairs with an alum mentee', () => {
    const studentMentor = { ...INITIAL_PROFILES[0], role: 'student' as const, intents: ['give-mentorship' as const] };
    const alumMentee = { ...INITIAL_CURRENT_USER, role: 'alumni' as const, intents: ['find-mentor' as const] };
    expect(getMutualIntents(alumMentee, studentMentor)).toEqual(['find-mentor']);
    expect(getMutualIntents(studentMentor, alumMentee)).toEqual(['give-mentorship']);
  });
});

describe('Legacy intent migration', () => {
  it('maps legacy "mentorship" (side unknown, never guessed from role) and "all" to open to anything', () => {
    expect(resolveIntents({ intent: 'mentorship' })).toEqual([]);
    expect(resolveIntents({ intent: 'all' })).toEqual([]);
    expect(resolveIntents({ intent: 'co-founder' })).toEqual(['co-founder']);
    expect(resolveIntents({ intent: 'bogus' })).toEqual([]);
  });

  it('cleans new-shape lists: drops unknown values, dedupes, canonical order, no cap on other intents', () => {
    const resolved = resolveIntents({
      intents: ['roommate', 'study', 'study', 'nope', 'casual', 'give-mentorship', 'co-founder', 'find-mentor'],
    });
    // Only one mentorship side survives: the first one listed
    expect(resolved).toEqual(['give-mentorship', 'co-founder', 'study', 'casual', 'roommate']);
  });

  it('toggleIntent keeps mentorship to one side and everything else free', () => {
    expect(toggleIntent(['find-mentor', 'study'], 'give-mentorship')).toEqual(['give-mentorship', 'study']);
    expect(toggleIntent(['give-mentorship'], 'give-mentorship')).toEqual([]);
    expect(toggleIntent(['co-founder', 'study', 'casual'], 'roommate')).toEqual(['co-founder', 'study', 'casual', 'roommate']);
  });

  it('does not depend on the order intents were picked in', () => {
    const a = { intents: sortIntents(['co-founder', 'find-mentor']) };
    const b = { intents: sortIntents(['find-mentor', 'co-founder']) };
    const other = { intents: ['give-mentorship', 'co-founder'] as any };
    expect(getMutualIntents(a, other)).toEqual(getMutualIntents(b, other));
    expect(getMutualIntents(a, other)).toEqual(['find-mentor', 'co-founder']);
  });

  beforeEach(() => Repository.resetAllData());

  it('upgrades a stored legacy current user and legacy match records on read', () => {
    const { intents: _drop, ...legacyUser } = INITIAL_CURRENT_USER;
    localStorage.setItem('thirdplace_current_user', JSON.stringify({ ...legacyUser, intent: 'mentorship' }));
    localStorage.setItem(
      'thirdplace_matches_data',
      JSON.stringify([
        {
          id: 'm_old',
          user1Id: INITIAL_CURRENT_USER.id,
          user2Id: INITIAL_PROFILES[0].id,
          partnerProfile: { ...INITIAL_PROFILES[0], intents: undefined, intent: 'all' },
          matchedAt: 1,
          status: 'matched',
          sharedHobbies: [],
          mutualIntent: 'co-founder',
        },
      ])
    );

    const user = Repository.getCurrentUser();
    expect(user.intents).toEqual([]);
    expect('intent' in user).toBe(false);

    const [match] = Repository.getMatches();
    expect(match.mutualIntents).toEqual([]);
    expect('mutualIntent' in match).toBe(false);
    expect(match.partnerProfile.intents).toEqual([]);
  });
});

describe('Swipe scoring', () => {
  it('ranks a complementary intent as part of the overlap score', () => {
    const viewer = { ...INITIAL_CURRENT_USER, intents: ['give-mentorship' as const], hobbies: [], targetCompanies: [] };
    const mentee = { ...INITIAL_PROFILES[0], intents: ['find-mentor' as const], hobbies: [], workHistory: [], targetCompanies: [], targetRoles: [] };
    const peerMentor = { ...mentee, intents: ['give-mentorship' as const] };
    expect(buildSwipeCandidate(viewer, mentee).overlapScore).toBeGreaterThan(buildSwipeCandidate(viewer, peerMentor).overlapScore);
    expect(buildSwipeCandidate(viewer, mentee).mutualIntents).toEqual(['give-mentorship']);
  });
});
