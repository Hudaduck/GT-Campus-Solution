import { describe, it, expect, beforeEach } from 'vitest';
import {
  Repository,
  INITIAL_CURRENT_USER,
  INITIAL_EVENTS,
  INITIAL_PROFILES,
  DEMO_STUDENT_USER,
  EVENT_SCORE_WEIGHTS,
  USER_CHANGED_EVENT,
  scoreEventByHobbiesAndNetwork,
  getEventScoreDetails,
  getCareerOverlapBadges,
  buildSwipeCandidate,
  isSamePerson,
} from './data/repository';
import { UserProfile, EventItem } from './contracts';

const byId = (id: string) => INITIAL_PROFILES.find((p) => p.id === id)!;

describe('Multi-factor ranking: hobbies + attendee network overlap', () => {
  // No hobby tags, alumni host or intent bonus, so only attendee overlap moves the score
  const neutralEvent = (attendees: string[]): EventItem => ({
    ...INITIAL_EVENTS[0],
    id: `neutral_${attendees.join('_')}`,
    tags: [],
    category: 'social',
    isHostAlum: false,
    attendees,
  });

  const viewer: UserProfile = {
    ...DEMO_STUDENT_USER,
    id: 'ranking_viewer',
    email: 'ranking.viewer@gatech.edu',
    intents: ['study'],
    hobbies: ['hiking'],
    targetCompanies: [],
    targetRoles: [],
  };

  // Chloe (architecture alum) shares nothing with the viewer by default
  const attendee = (overrides: Partial<UserProfile>): UserProfile => ({
    ...byId('user_chloe_dubois'),
    id: 'ranking_attendee',
    email: 'ranking.attendee@alumni.gatech.edu',
    hobbies: [],
    targetRoles: [],
    ...overrides,
  });

  const scoreWith = (a: UserProfile, v: UserProfile = viewer) =>
    scoreEventByHobbiesAndNetwork(neutralEvent([a.id]), v, [a]);

  it('adds a bonus when an attendee shares the viewer major', () => {
    const base = scoreWith(attendee({}));
    expect(scoreWith(attendee({ major: 'Computer Science (Theory)' })) - base).toBe(
      EVENT_SCORE_WEIGHTS.attendeeSameMajor
    );
  });

  it('adds a bonus when an attendee shares the viewer gradYear', () => {
    const base = scoreWith(attendee({}));
    expect(scoreWith(attendee({ gradYear: viewer.gradYear })) - base).toBe(EVENT_SCORE_WEIGHTS.attendeeSameGradYear);
  });

  it('weights current employees of a target company above former employees', () => {
    const v = { ...viewer, targetCompanies: ['Figma'] };
    const base = scoreWith(attendee({}), v);
    const current = scoreWith(
      attendee({ workHistory: [{ company: 'Figma', role: 'Designer', period: '2022 - Present', isCurrent: true }] }),
      v
    );
    const former = scoreWith(
      attendee({ companyOrLab: 'Gensler', workHistory: [{ company: 'Figma', role: 'Designer', period: '2019 - 2021' }] }),
      v
    );
    expect(current - base).toBe(EVENT_SCORE_WEIGHTS.attendeeAtTargetCompany);
    expect(former - base).toBe(EVENT_SCORE_WEIGHTS.attendeeExTargetCompany);
  });

  it('adds a bonus when an attendee shares a target role', () => {
    const v = { ...viewer, targetRoles: ['Product Manager'] };
    const base = scoreWith(attendee({}), v);
    expect(scoreWith(attendee({ targetRoles: ['APM / Product Manager'] }), v) - base).toBe(
      EVENT_SCORE_WEIGHTS.attendeeSharedTargetRole
    );
  });

  it('ranks shared hobbies + a target-company attendee above shared hobbies alone', () => {
    const v: UserProfile = { ...viewer, hobbies: ['bouldering'], targetCompanies: ['Stripe'] };
    const hobbiesOnly: EventItem = { ...neutralEvent(['user_chloe_dubois']), id: 'a', tags: ['bouldering'] };
    const hobbiesAndNetwork: EventItem = { ...neutralEvent(['user_sarah_jenkins']), id: 'b', tags: ['bouldering'] };
    const score = (e: EventItem) => scoreEventByHobbiesAndNetwork(e, v, INITIAL_PROFILES);
    const ranked = [hobbiesOnly, hobbiesAndNetwork].sort((x, y) => score(y) - score(x));
    expect(ranked.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('ranks the AI founders pour-over first for the demo student', () => {
    const score = (e: EventItem) => scoreEventByHobbiesAndNetwork(e, DEMO_STUDENT_USER, INITIAL_PROFILES);
    const ranked = [...INITIAL_EVENTS].sort((a, b) => score(b) - score(a));
    expect(ranked[0].id).toBe('event_gt_ai_founders_coffee');
  });

  it('builds reason pills and an attendee highlight with class year and company', () => {
    const details = getEventScoreDetails(INITIAL_EVENTS[0], DEMO_STUDENT_USER, INITIAL_PROFILES);
    expect(details.matchReasons).toContain('2 Shared Hobbies');
    expect(details.matchReasons.some((r) => r.includes('Going from Anthropic'))).toBe(true);
    expect(details.attendeeHighlightText).toBe("2 Shared Hobbies • Elena ('20 @ Anthropic) + 1 going"); // Liam; the viewer's own seed twin is excluded
    expect(details.overlappingAttendees[0]).toMatchObject({ name: 'Elena Rostova', reason: 'Works at Anthropic' });
  });

  it("never counts the viewer's own seed twin as an overlapping attendee", () => {
    expect(isSamePerson(byId('user_sarah_jenkins'), INITIAL_CURRENT_USER)).toBe(true);
    const details = getEventScoreDetails(INITIAL_EVENTS[2], INITIAL_CURRENT_USER, INITIAL_PROFILES);
    expect(details.overlappingAttendees.some((a) => a.name === 'Sarah Jenkins')).toBe(false);
  });
});

describe('Career & Network Overlap badges for swipe cards', () => {
  it('labels current target-company employees "Works at" and former ones "Ex-"', () => {
    const labels = getCareerOverlapBadges(DEMO_STUDENT_USER, byId('user_elena_rostova')).map((b) => b.label);
    expect(labels).toContain('Works at Anthropic');
    expect(labels).toContain('Ex-Google');
  });

  it("builds Targeting pills, prioritising the viewer's own employer", () => {
    // Sarah works at Stripe; Alex is targeting Stripe
    const targeting = getCareerOverlapBadges(INITIAL_CURRENT_USER, byId('user_alex_chen')).filter(
      (b) => b.kind === 'targeting' || b.kind === 'shared-target'
    );
    expect(targeting[0]).toMatchObject({ kind: 'shared-target', label: 'Targeting: AI/ML Engineer @ Stripe' });
  });

  it('buildSwipeCandidate normalises missing career fields and scores overlap', () => {
    const sarah = byId('user_sarah_jenkins');
    const bare: UserProfile = { ...sarah, id: 'bare', workHistory: undefined, targetCompanies: undefined, targetRoles: undefined };
    const candidate = buildSwipeCandidate(DEMO_STUDENT_USER, bare);
    expect(candidate.workHistory).toEqual([]);
    expect(candidate.targetCompanies).toEqual([]);
    expect(candidate.targetRoles).toEqual([]);
    expect(candidate.careerBadges.map((b) => b.label)).toContain('Works at Stripe'); // via companyOrLab

    expect(buildSwipeCandidate(DEMO_STUDENT_USER, sarah).overlapScore).toBeGreaterThan(0);
  });

  it('seeds alumni who work where students want to work', () => {
    const student = byId('user_alex_chen');
    const alumniAtTargets = INITIAL_PROFILES.filter(
      (p) => p.role === 'alumni' && getCareerOverlapBadges(student, p).some((b) => b.kind === 'works-at')
    ).map((p) => p.name);
    expect(alumniAtTargets).toEqual(expect.arrayContaining(['Sarah Jenkins', 'Elena Rostova']));
  });
});

describe('Career profile persistence', () => {
  beforeEach(() => Repository.resetAllData());

  it('round-trips workHistory, targetCompanies and targetRoles edits', () => {
    const edited: UserProfile = {
      ...DEMO_STUDENT_USER,
      workHistory: [
        { company: 'Stripe', role: 'APM Intern', period: 'Summer 2026', isCurrent: true },
        ...(DEMO_STUDENT_USER.workHistory || []),
      ],
      targetCompanies: ['Figma', 'Linear'],
      targetRoles: ['APM / Product Manager'],
    };
    Repository.setCurrentUser(edited);
    Repository.saveProfile(edited);

    const reloaded = Repository.getProfiles().find((p) => p.id === edited.id)!;
    expect(reloaded.workHistory?.[0]).toEqual({ company: 'Stripe', role: 'APM Intern', period: 'Summer 2026', isCurrent: true });
    expect(reloaded.workHistory).toHaveLength(3);
    expect(Repository.getCurrentUser().targetCompanies).toEqual(['Figma', 'Linear']);
    expect(Repository.getCurrentUser().targetRoles).toEqual(['APM / Product Manager']);
  });

  it('notifies isolated modules when the current user changes', async () => {
    const seen = new Promise<void>((resolve) =>
      window.addEventListener(USER_CHANGED_EVENT, () => resolve(), { once: true })
    );
    Repository.setCurrentUser(DEMO_STUDENT_USER);
    await expect(seen).resolves.toBeUndefined();
  });
});
