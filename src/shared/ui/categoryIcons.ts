import {
  BookOpen,
  Coffee,
  Dices,
  Handshake,
  LayoutGrid,
  Laptop,
  LucideIcon,
  Rocket,
  Volleyball,
} from 'lucide-react';

// One icon per event category, shared by filter chips, the host form and map pins
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  coffee: Coffee,
  tech: Laptop,
  startup: Rocket,
  sports: Volleyball,
  study: BookOpen,
  social: Dices,
  networking: Handshake,
};

export const getCategoryIcon = (category: string): LucideIcon => CATEGORY_ICONS[category] ?? LayoutGrid;

// Display names for the category ids stored on events (ids stay stable; only labels change)
export const CATEGORY_LABELS: Record<string, string> = {
  coffee: 'Casual',
  tech: 'Tech & Code',
  startup: 'AI & Startups',
  sports: 'Sports',
  study: 'Study Cram',
  social: 'Social & Games',
  networking: 'Networking',
};

export const getCategoryLabel = (category: string): string => CATEGORY_LABELS[category] ?? category;
