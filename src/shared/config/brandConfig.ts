import React, { createContext, useContext, useState, useEffect } from 'react';

// The four-color ThirdPlace palette. Every UI color derives from these.
export interface BrandPalette {
  gold: string; // #B39051 — primary buttons, active states, borders
  darkGold: string; // #8F713D — hover / pressed, light-mode accents
  navy: string; // #051E39 — app bar, sidebar, text on gold
  white: string; // #FFFFFF
}

export const BRAND_PALETTE: BrandPalette = {
  gold: '#B39051',
  darkGold: '#8F713D',
  navy: '#051E39',
  white: '#FFFFFF',
};

export interface BrandColorTokens {
  primary: string; // e.g. GT Navy Blue (#051E39)
  secondary: string; // e.g. GT Tech Gold (#B39051)
  accent: string; // e.g. Buzz Gold (#B39051)
  canvas: string; // e.g. #051E39 (Dark) / #FFFFFF (Light)
  surface: string; // e.g. #0A294B (Dark) / #F9F8F4 (Light)
  surfaceElevated: string; // e.g. #10355E
  onAccent: string; // High contrast text on accent, e.g. GT Navy (#051E39)
  textPrimary: string;
  textSecondary: string;
  borderSubtle: string;
}

export interface BrandConfig {
  appName: string;
  tagline: string;
  universityName: string;
  shortName: string;
  mascotName: string;
  studentEmailDomain: string;
  alumniEmailDomain: string;
  defaultCenter: {
    lat: number;
    lng: number;
    zoom: number;
  };
  campusBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  palette: BrandPalette;
  themeTokens: {
    dark: BrandColorTokens;
    light: BrandColorTokens;
  };
}

export const GEORGIA_TECH_BRAND: BrandConfig = {
  appName: "ThirdPlace",
  tagline: "Your Campus, Everywhere",
  universityName: "Georgia Institute of Technology",
  shortName: "Georgia Tech",
  mascotName: "Buzz",
  studentEmailDomain: "@gatech.edu",
  alumniEmailDomain: "@alumni.gatech.edu",
  defaultCenter: {
    lat: 33.7756,
    lng: -84.3963,
    zoom: 14,
  },
  campusBounds: {
    north: 33.7850,
    south: 33.7680,
    east: -84.3850,
    west: -84.4080,
  },
  palette: BRAND_PALETTE,
  themeTokens: {
    dark: {
      primary: BRAND_PALETTE.navy,
      secondary: BRAND_PALETTE.darkGold,
      accent: BRAND_PALETTE.gold,
      canvas: BRAND_PALETTE.navy, // Deep navy canvas
      surface: '#0A294B', // Elevated cards
      surfaceElevated: '#10355E',
      onAccent: BRAND_PALETTE.navy, // Bold navy on gold
      textPrimary: BRAND_PALETTE.white,
      textSecondary: '#C9D3DF',
      borderSubtle: 'rgba(179, 144, 81, 0.35)',
    },
    light: {
      primary: BRAND_PALETTE.navy,
      secondary: BRAND_PALETTE.darkGold,
      accent: BRAND_PALETTE.gold,
      canvas: '#FAF9F6', // Warm off-white canvas
      surface: BRAND_PALETTE.white, // Crisp white cards
      surfaceElevated: '#F3F0E8',
      onAccent: BRAND_PALETTE.navy,
      textPrimary: BRAND_PALETTE.navy,
      textSecondary: '#3E5068',
      borderSubtle: 'rgba(179, 144, 81, 0.35)',
    },
  },
};

interface BrandContextType {
  brand: BrandConfig;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  updateBrandConfig: (config: Partial<BrandConfig>) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode; initialConfig?: BrandConfig }> = ({
  children,
  initialConfig = GEORGIA_TECH_BRAND,
}) => {
  const [brand, setBrand] = useState<BrandConfig>(initialConfig);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thirdplace_theme');
      if (saved) return saved === 'dark';
      return true; // Default Dark Mode as specified
    }
    return true;
  });

  const updateBrandConfig = (newConfig: Partial<BrandConfig>) => {
    setBrand((prev) => ({ ...prev, ...newConfig }));
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('thirdplace_theme', next ? 'dark' : 'light');
      }
      return next;
    });
  };

  // Inject semantic CSS variables whenever brand or theme mode updates
  useEffect(() => {
    const root = document.documentElement;
    const tokens = isDarkMode ? brand.themeTokens.dark : brand.themeTokens.light;

    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    root.style.setProperty('--brand-gold', brand.palette.gold);
    root.style.setProperty('--brand-dark-gold', brand.palette.darkGold);
    root.style.setProperty('--brand-navy', brand.palette.navy);
    root.style.setProperty('--brand-white', brand.palette.white);
    root.style.setProperty('--color-primary', tokens.primary);
    root.style.setProperty('--color-secondary', tokens.secondary);
    root.style.setProperty('--color-accent', tokens.accent);
    root.style.setProperty('--color-canvas', tokens.canvas);
    root.style.setProperty('--color-surface', tokens.surface);
    root.style.setProperty('--color-surface-elevated', tokens.surfaceElevated);
    root.style.setProperty('--color-on-accent', tokens.onAccent);
    root.style.setProperty('--color-text-primary', tokens.textPrimary);
    root.style.setProperty('--color-text-secondary', tokens.textSecondary);
    root.style.setProperty('--color-border-subtle', tokens.borderSubtle);
  }, [brand, isDarkMode]);

  return React.createElement(
    BrandContext.Provider,
    { value: { brand, isDarkMode, toggleDarkMode, updateBrandConfig } },
    children
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};
