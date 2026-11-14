import {
  BookOpen,
  Coffee,
  Dices,
  Handshake,
  LayoutGrid,
  Laptop,
  LucideIcon,
  Mountain,
  Rocket,
} from 'lucide-react';

// One icon per event category, shared by filter chips, the host form and map pins
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  coffee: Coffee,
  tech: Laptop,
  startup: Rocket,
  sports: Mountain,
  study: BookOpen,
  social: Dices,
  networking: Handshake,
};

export const getCategoryIcon = (category: string): LucideIcon => CATEGORY_ICONS[category] ?? LayoutGrid;
