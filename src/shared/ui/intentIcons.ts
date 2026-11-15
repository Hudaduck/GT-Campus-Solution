import { BookOpen, Coffee, GraduationCap, Handshake, Home, LucideIcon, Rocket } from 'lucide-react';
import { MeetupIntent } from '../contracts';

// One icon per intent, shared by onboarding, My Profile and the swipe filters
export const INTENT_ICONS: Record<MeetupIntent, LucideIcon> = {
  'co-founder': Rocket,
  'find-mentor': GraduationCap,
  'give-mentorship': Handshake,
  study: BookOpen,
  casual: Coffee,
  roommate: Home,
};
