import { LegacyMeetupIntent, MeetupIntent, UserProfile } from './contracts';

// Single source of truth for meetup intents: labels, copy and how they pair up.
// Icons live in src/shared/ui/intentIcons.ts to keep this file free of UI deps.

// No limit on how many intents someone picks, except mentorship: a person is EITHER
// looking for a mentor OR mentoring others (one side at a time, chosen freely, never from role).

export interface IntentDefinition {
  id: MeetupIntent;
  label: string; // what I'm looking for, e.g. "Find a Mentor"
  desc: string;
  filterLabel: string; // swipe filter option = the people I'd see, e.g. "People who mentor"
  badge: string; // short card badge describing the *candidate*, e.g. "Mentoring"
  complement: MeetupIntent; // the intent on the other person that satisfies this one
}

export const INTENT_CATALOG: Record<MeetupIntent, IntentDefinition> = {
  'co-founder': {
    id: 'co-founder',
    label: 'Co-Founders',
    desc: 'Build startups, pitch hackathon projects & hack',
    filterLabel: 'People seeking co-founders',
    badge: 'Co-Founder',
    complement: 'co-founder',
  },
  'find-mentor': {
    id: 'find-mentor',
    label: 'Find a Mentor',
    desc: 'Career growth, resume reviews & industry insights',
    filterLabel: 'People seeking a mentor',
    badge: 'Seeking Mentor',
    complement: 'give-mentorship',
  },
  'give-mentorship': {
    id: 'give-mentorship',
    label: 'Mentor Others',
    desc: 'Share what you know with fellow Yellow Jackets',
    filterLabel: 'People who mentor',
    badge: 'Mentoring',
    complement: 'find-mentor',
  },
  study: {
    id: 'study',
    label: 'Study Sprints',
    desc: 'CULC whiteboard cramming & finals prep',
    filterLabel: 'Study partners',
    badge: 'Study',
    complement: 'study',
  },
  casual: {
    id: 'casual',
    label: 'Casual & Coffee',
    desc: 'Grab pour-overs and explore campus & Midtown',
    filterLabel: 'Casual coffee chats',
    badge: 'Casual',
    complement: 'casual',
  },
  roommate: {
    id: 'roommate',
    label: 'Housing / Roommates',
    desc: 'Find campus or post-grad housemates',
    filterLabel: 'People seeking roommates',
    badge: 'Roommate',
    complement: 'roommate',
  },
};

// Canonical display order (mentorship first, matching the picker). Intents are always stored
// and compared in this order, so the order someone tapped them in never matters.
export const INTENT_ORDER: MeetupIntent[] = ['find-mentor', 'give-mentorship', 'co-founder', 'study', 'casual', 'roommate'];

export const MENTORSHIP_INTENTS: readonly MeetupIntent[] = ['find-mentor', 'give-mentorship'];

/**
 * Adds or removes one intent. Picking a mentorship side replaces the other side;
 * tapping the selected side again clears mentorship. Everything else toggles freely.
 */
export function toggleIntent(intents: MeetupIntent[], id: MeetupIntent): MeetupIntent[] {
  if (intents.includes(id)) return intents.filter((i) => i !== id);
  const base = MENTORSHIP_INTENTS.includes(id) ? intents.filter((i) => !MENTORSHIP_INTENTS.includes(i)) : intents;
  return sortIntents([...base, id]);
}

const isIntent = (value: unknown): value is MeetupIntent =>
  typeof value === 'string' && value in INTENT_CATALOG;

export const sortIntents = (intents: MeetupIntent[]): MeetupIntent[] =>
  [...new Set(intents)].sort((a, b) => INTENT_ORDER.indexOf(a) - INTENT_ORDER.indexOf(b));

export const intentLabels = (intents: MeetupIntent[]): string =>
  intents.length ? intents.map((i) => INTENT_CATALOG[i].label).join(', ') : 'Open to anything';

/**
 * Intents of the viewer that the other person complements, e.g. viewer 'find-mentor'
 * + other 'give-mentorship'. Returned in canonical INTENT_ORDER.
 */
export function getMutualIntents(viewer: Pick<UserProfile, 'intents'>, other: Pick<UserProfile, 'intents'>): MeetupIntent[] {
  return sortIntents(viewer.intents.filter((i) => other.intents.includes(INTENT_CATALOG[i].complement)));
}

// Someone with no stated intents is open to anything, so they fit everyone
export function isIntentCompatible(viewer: Pick<UserProfile, 'intents'>, other: Pick<UserProfile, 'intents'>): boolean {
  if (viewer.intents.length === 0 || other.intents.length === 0) return true;
  return getMutualIntents(viewer, other).length > 0;
}

// Human sentence for one mutual intent, from the viewer's point of view
export function describeMutualIntent(intent: MeetupIntent, otherFirstName: string): string {
  switch (intent) {
    case 'find-mentor':
      return `${otherFirstName} mentors, and you're looking for a mentor`;
    case 'give-mentorship':
      return `${otherFirstName} is looking for a mentor, and you mentor`;
    case 'co-founder':
      return 'You both want co-founders';
    case 'study':
      return 'You both want study partners';
    case 'casual':
      return 'You both want casual coffee chats';
    case 'roommate':
      return 'You both are looking for roommates';
  }
}

/**
 * Normalizes whatever a stored profile carries into a valid intents list:
 * - new shape: `intents` array (invalid entries dropped, deduped, canonical order; if both
 *   mentorship sides are present, the first one listed wins)
 * - legacy shape: single `intent`. 'mentorship' never said which side, and we never guess
 *   from role, so it becomes open to anything until the person picks a side.
 *   'all' also becomes open to anything (empty list).
 */
export function resolveIntents(raw: { intents?: unknown; intent?: LegacyMeetupIntent | string }): MeetupIntent[] {
  if (Array.isArray(raw.intents)) {
    const valid = raw.intents.filter(isIntent);
    const side = valid.find((i) => MENTORSHIP_INTENTS.includes(i));
    return sortIntents(valid.filter((i) => !MENTORSHIP_INTENTS.includes(i) || i === side));
  }
  switch (raw.intent) {
    case 'mentorship':
    case 'all':
    case undefined:
      return [];
    default:
      return isIntent(raw.intent) ? [raw.intent] : [];
  }
}
