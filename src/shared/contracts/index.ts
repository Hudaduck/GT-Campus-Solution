export type UserRole = 'student' | 'alumni';
export type VerificationMethod = 'gatech_sso' | 'domain' | 'linkedin' | 'peer_vouch';
export type MeetupIntent = 'casual' | 'mentorship' | 'co-founder' | 'study' | 'roommate' | 'all';

export interface WorkExperience {
  company: string;
  role: string;
  period: string;
  isCurrent?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  gradYear: number;
  major: string;
  currentCity: string;
  neighborhoodZone: string; // e.g. "Midtown • Tech Square", "NYC • Flatiron", "SF • SoMa"
  distanceText?: string; // e.g. "Within 1.2 mi"
  bio: string;
  avatarUrl: string;
  companyOrLab?: string;
  workHistory?: WorkExperience[];
  targetCompanies?: string[];
  targetRoles?: string[];
  intent: MeetupIntent;
  hobbies: string[];
  isOpenToMeet: boolean;
  openToMeetExpiresAt?: number; // timestamp in ms (TTL)
  verified: boolean;
  verificationMethod: VerificationMethod;
  linkedinUrl?: string;
  vouchesCount: number;
  vouchedBy?: string[];
}

export type CareerBadgeKind = 'works-at' | 'ex-company' | 'targeting' | 'shared-target';

// A single "Career & Network Overlap" badge rendered on swipe cards
export interface CareerOverlapBadge {
  kind: CareerBadgeKind;
  label: string; // e.g. "Works at Stripe", "Ex-Delta Air Lines", "Targeting: AI/ML Engineer @ Anthropic"
  company?: string;
  role?: string;
}

// A swipe-deck profile decorated with viewer-relative hobby & career overlap
export interface SwipeCandidate extends UserProfile {
  workHistory: WorkExperience[];
  targetCompanies: string[];
  targetRoles: string[];
  sharedHobbies: string[];
  careerBadges: CareerOverlapBadge[];
  overlapScore: number;
}

export type EventCategory = 'coffee' | 'tech' | 'startup' | 'sports' | 'study' | 'social' | 'networking';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  hostId: string;
  hostName: string;
  hostRole: UserRole;
  hostAvatarUrl?: string;
  locationName: string;
  lat: number;
  lng: number;
  neighborhoodZone: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  ttlHours: number;
  expiresAt: number; // timestamp in ms
  createdAt: number;
  category: EventCategory;
  maxAttendees: number;
  attendees: string[]; // array of user IDs
  attendeeProfiles?: UserProfile[];
  tags: string[];
  isHostAlum?: boolean;
  matchReasons?: string[];
  attendeeHighlightText?: string;
}

export interface MatchItem {
  id: string;
  user1Id: string;
  user2Id: string;
  partnerProfile: UserProfile;
  matchedAt: number;
  status: 'matched' | 'scheduled' | 'dismissed';
  sharedHobbies: string[];
  mutualIntent: MeetupIntent;
}

export interface CalendarMeetup {
  id: string;
  matchId: string;
  partnerId: string;
  partnerName: string;
  partnerRole: UserRole;
  partnerAvatar: string;
  partnerMajorOrCompany: string;
  locationName: string;
  locationAddress: string;
  scheduledTime: string; // ISO string
  durationMinutes: number;
  icsContent?: string;
  googleCalendarUrl?: string;
  status: 'confirmed' | 'rescheduled' | 'cancelled';
  sharedHobbies: string[];
}

export interface CoffeeSpotSuggestion {
  name: string;
  address: string;
  neighborhood: string;
  perk: string;
}
