import { EventItem } from '../../shared/contracts';

export interface ScoredEventItem extends EventItem {
  score: number;
  isRecommended: boolean;
  sharedHobbies: string[];
  matchReasons?: string[];
  attendeeHighlightText?: string;
  overlappingAttendees?: { id: string; name: string; avatarUrl: string; reason: string; tag?: string }[];
  recommendedRank?: number; // 1-based position in "Recommended For You"
  distanceMiles?: number; // from the viewer's location preference
}

export type ViewMode = 'map' | 'list' | 'grid';
