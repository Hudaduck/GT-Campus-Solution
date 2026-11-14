import { LegacyMeetupIntent, MeetupIntent, UserProfile } from './contracts';

// Single source of truth for meetup intents: labels, copy and how they pair up.
// Icons live in src/shared/ui/intentIcons.ts to keep this file free of UI deps.

export const MAX_INTENTS = 3;

export interface IntentDefinition {
  id: MeetupIntent;
  label: string; // what I'm looking for, e.g. "Find a Mentor"
  desc: string;
  filterLabel: string; // swipe filter chip = the people I'd see, e.g. "Mentors"
  badge: string; // short card badge describing the *candidate*, e.g. "Mentoring"
  complement: MeetupIntent; // the intent on the other person that satisfies this one
}

export const INTENT_CATALOG: Record<MeetupIntent, IntentDefinition> = {
  'co-founder': {
    id: 'co-founder',
    label: 'Co-Founders',
    desc: 'Build startups, pitch hackathon projects & hack',
    filterLabel: 'Co-Founders',
    badge: 'Co-Founder',
    complement: 'co-founder',
  },
  'find-mentor': {
    id: 'find-mentor',
    label: 'Find a Mentor',
    desc: 'Career growth, resume reviews & industry insights',
    filterLabel: 'Mentees',
    badge: 'Seeking Mentor',
    complement: 'give-mentorship',
  },
  'give-mentorship': {
    id: 'give-mentorship',
    label: 'Mentor Others',
    desc: 'Share what you know with fellow Yellow Jackets',
    filterLabel: 'Mentors',
    badge: 'Mentoring',
    complement: 'find-mentor',
  },
  study: {
    id: 'study',
    label: 'Study Sprints',
    desc: 'CULC whiteboard cramming & finals prep',
    filterLabel: 'Study',
    badge: 'Study',
    complement: 'study',
  },
  casual: {
    id: 'casual',
    label: 'Casual & Coffee',
    desc: 'Grab pour-overs and explore campus & Midtown',
    filterLabel: 'Casual',
    badge: 'Casual',
    complement: 'casual',
  },
  roommate: {
    id: 'roommate',
    label: 'Housing / Roommates',
    desc: 'Find campus or post-grad housemates',
    filterLabel: 'Roommates',
    badge: 'Roommate',
    complement: 'roommate',
  },
};

export const INTENT_ORDER: MeetupIntent[] = ['co-founder', 'find-mentor', 'give-mentorship', 'study', 'casual', 'roommate'];

const isIntent = (value: unknown): value is MeetupIntent =>
  typeof value === 'string' && value in INTENT_CATALOG;

export const intentLabels = (intents: MeetupIntent[]): string =>
  intents.length ? intents.map((i) => INTENT_CATALOG[i].label).join(', ') : 'Open to anything';

/**
 * Intents of the viewer that the other person complements, e.g. viewer 'find-mentor'
 * + other 'give-mentorship'. Order follows the viewer's own priorities.
 */
export function getMutualIntents(viewer: Pick<UserProfile, 'intents'>, other: Pick<UserProfile, 'intents'>): MeetupIntent[] {
  return viewer.intents.filter((i) => other.intents.includes(INTENT_CATALOG[i].complement));
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
 * - new shape: `intents` array (invalid entries dropped, deduped, capped)
 * - legacy shape: single `intent`. 'mentorship' didn't say which side, and anyone
 *   (student or alum) can mentor or be mentored, so it becomes both sides rather than
 *   a guess from role. 'all' becomes open to anything (empty list).
 */
export function resolveIntents(raw: { intents?: unknown; intent?: LegacyMeetupIntent | string }): MeetupIntent[] {
  if (Array.isArray(raw.intents)) {
    return [...new Set(raw.intents.filter(isIntent))].slice(0, MAX_INTENTS);
  }
  switch (raw.intent) {
    case 'mentorship':
      return ['find-mentor', 'give-mentorship'];
    case 'all':
    case undefined:
      return [];
    default:
      return isIntent(raw.intent) ? [raw.intent] : [];
  }
}
