import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ─── Theme Definitions ────────────────────────────────────────────────────────
// 16 curated color combinations — no orange/black/white combos.
// Each theme has: id, label, primary accent, secondary accent, glow color, gradient text colors.

export interface ThemeDef {
  id: string;
  label: string;
  primary: string;       // main accent (buttons, borders, highlights)
  secondary: string;     // secondary accent
  glow: string;          // rgba glow for shadows
  gradientFrom: string;  // gradient text start
  gradientTo: string;    // gradient text end
  surface: string;       // glass surface tint
  preview: [string, string]; // two colors for the swatch preview
}

export const THEMES: ThemeDef[] = [
  {
    id: 'violet-cyan',
    label: 'Violet & Cyan',
    primary: '#8b5cf6',
    secondary: '#06b6d4',
    glow: 'rgba(139,92,246,0.35)',
    gradientFrom: '#8b5cf6',
    gradientTo: '#06b6d4',
    surface: 'rgba(139,92,246,0.06)',
    preview: ['#8b5cf6', '#06b6d4'],
  },
  {
    id: 'rose-gold',
    label: 'Rose & Gold',
    primary: '#f43f5e',
    secondary: '#fbbf24',
    glow: 'rgba(244,63,94,0.35)',
    gradientFrom: '#f43f5e',
    gradientTo: '#fbbf24',
    surface: 'rgba(244,63,94,0.06)',
    preview: ['#f43f5e', '#fbbf24'],
  },
  {
    id: 'emerald-purple',
    label: 'Emerald & Purple',
    primary: '#10b981',
    secondary: '#a855f7',
    glow: 'rgba(16,185,129,0.35)',
    gradientFrom: '#10b981',
    gradientTo: '#a855f7',
    surface: 'rgba(16,185,129,0.06)',
    preview: ['#10b981', '#a855f7'],
  },
  {
    id: 'sky-pink',
    label: 'Sky & Pink',
    primary: '#38bdf8',
    secondary: '#ec4899',
    glow: 'rgba(56,189,248,0.35)',
    gradientFrom: '#38bdf8',
    gradientTo: '#ec4899',
    surface: 'rgba(56,189,248,0.06)',
    preview: ['#38bdf8', '#ec4899'],
  },
  {
    id: 'indigo-lime',
    label: 'Indigo & Lime',
    primary: '#6366f1',
    secondary: '#a3e635',
    glow: 'rgba(99,102,241,0.35)',
    gradientFrom: '#6366f1',
    gradientTo: '#a3e635',
    surface: 'rgba(99,102,241,0.06)',
    preview: ['#6366f1', '#a3e635'],
  },
  {
    id: 'teal-coral',
    label: 'Teal & Coral',
    primary: '#14b8a6',
    secondary: '#fb7185',
    glow: 'rgba(20,184,166,0.35)',
    gradientFrom: '#14b8a6',
    gradientTo: '#fb7185',
    surface: 'rgba(20,184,166,0.06)',
    preview: ['#14b8a6', '#fb7185'],
  },
  {
    id: 'fuchsia-blue',
    label: 'Fuchsia & Blue',
    primary: '#d946ef',
    secondary: '#3b82f6',
    glow: 'rgba(217,70,239,0.35)',
    gradientFrom: '#d946ef',
    gradientTo: '#3b82f6',
    surface: 'rgba(217,70,239,0.06)',
    preview: ['#d946ef', '#3b82f6'],
  },
  {
    id: 'amber-indigo',
    label: 'Amber & Indigo',
    primary: '#f59e0b',
    secondary: '#6366f1',
    glow: 'rgba(245,158,11,0.35)',
    gradientFrom: '#f59e0b',
    gradientTo: '#6366f1',
    surface: 'rgba(245,158,11,0.06)',
    preview: ['#f59e0b', '#6366f1'],
  },
  {
    id: 'neon-green-purple',
    label: 'Neon Green & Purple',
    primary: '#22c55e',
    secondary: '#9333ea',
    glow: 'rgba(34,197,94,0.35)',
    gradientFrom: '#22c55e',
    gradientTo: '#9333ea',
    surface: 'rgba(34,197,94,0.06)',
    preview: ['#22c55e', '#9333ea'],
  },
  {
    id: 'crimson-teal',
    label: 'Crimson & Teal',
    primary: '#ef4444',
    secondary: '#2dd4bf',
    glow: 'rgba(239,68,68,0.35)',
    gradientFrom: '#ef4444',
    gradientTo: '#2dd4bf',
    surface: 'rgba(239,68,68,0.06)',
    preview: ['#ef4444', '#2dd4bf'],
  },
  {
    id: 'sapphire-rose',
    label: 'Sapphire & Rose',
    primary: '#2563eb',
    secondary: '#fb7185',
    glow: 'rgba(37,99,235,0.35)',
    gradientFrom: '#2563eb',
    gradientTo: '#fb7185',
    surface: 'rgba(37,99,235,0.06)',
    preview: ['#2563eb', '#fb7185'],
  },
  {
    id: 'mint-violet',
    label: 'Mint & Violet',
    primary: '#34d399',
    secondary: '#7c3aed',
    glow: 'rgba(52,211,153,0.35)',
    gradientFrom: '#34d399',
    gradientTo: '#7c3aed',
    surface: 'rgba(52,211,153,0.06)',
    preview: ['#34d399', '#7c3aed'],
  },
  {
    id: 'sunset',
    label: 'Sunset (Magenta→Blue)',
    primary: '#e879f9',
    secondary: '#60a5fa',
    glow: 'rgba(232,121,249,0.35)',
    gradientFrom: '#e879f9',
    gradientTo: '#60a5fa',
    surface: 'rgba(232,121,249,0.06)',
    preview: ['#e879f9', '#60a5fa'],
  },
  {
    id: 'forest-gold',
    label: 'Forest & Gold',
    primary: '#15803d',
    secondary: '#ca8a04',
    glow: 'rgba(21,128,61,0.35)',
    gradientFrom: '#15803d',
    gradientTo: '#ca8a04',
    surface: 'rgba(21,128,61,0.06)',
    preview: ['#15803d', '#ca8a04'],
  },
  {
    id: 'steel-pink',
    label: 'Steel Blue & Hot Pink',
    primary: '#4f86c6',
    secondary: '#f472b6',
    glow: 'rgba(79,134,198,0.35)',
    gradientFrom: '#4f86c6',
    gradientTo: '#f472b6',
    surface: 'rgba(79,134,198,0.06)',
    preview: ['#4f86c6', '#f472b6'],
  },
  {
    id: 'retro-green',
    label: 'Retro Green & Amber',
    primary: '#4ade80',
    secondary: '#fb923c',
    glow: 'rgba(74,222,128,0.35)',
    gradientFrom: '#4ade80',
    gradientTo: '#fb923c',
    surface: 'rgba(74,222,128,0.06)',
    preview: ['#4ade80', '#fb923c'],
  },
];

const DEFAULT_THEME_ID = 'violet-cyan';
const OWNER_EMAIL = 'dyl.gauvin@gmail.com';
const SITE_THEME_KEY = 'albumwall_site_theme';

// ─── Helper: Convert Hex Color to R, G, B ─────────────────────────────────────
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    // Space-separated channels: required by the modern `rgb(r g b / alpha)` syntax
    // emitted by Tailwind utilities like bg-accent-amber (commas would be invalid).
    return `${r} ${g} ${b}`;
  }
  return '139 92 246';
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface ThemeContextValue {
  siteTheme: ThemeDef;
  setSiteTheme: (themeId: string, userId?: string, email?: string) => void;
  getThemeById: (id: string) => ThemeDef;
  themes: ThemeDef[];
  OWNER_EMAIL: string;
}

const ThemeContext = createContext<ThemeContextValue>({
  siteTheme: THEMES[0],
  setSiteTheme: () => {},
  getThemeById: () => THEMES[0],
  themes: THEMES,
  OWNER_EMAIL,
});

// ─── Apply CSS Variables to :root ─────────────────────────────────────────────
function applyTheme(theme: ThemeDef) {
  const root = document.documentElement;
  root.style.setProperty('--accent-primary', theme.primary);
  root.style.setProperty('--accent-secondary', theme.secondary);
  root.style.setProperty('--accent-primary-rgb', hexToRgb(theme.primary));
  root.style.setProperty('--accent-secondary-rgb', hexToRgb(theme.secondary));
  root.style.setProperty('--accent-glow', theme.glow);
  root.style.setProperty('--gradient-from', theme.gradientFrom);
  root.style.setProperty('--gradient-to', theme.gradientTo);
  root.style.setProperty('--surface-tint', theme.surface);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [siteTheme, setSiteThemeState] = useState<ThemeDef>(() => {
    const saved = localStorage.getItem(SITE_THEME_KEY);
    if (saved) {
      const found = THEMES.find(t => t.id === saved);
      if (found) return found;
    }
    return THEMES.find(t => t.id === DEFAULT_THEME_ID) ?? THEMES[0];
  });

  // Apply on mount + when theme changes
  useEffect(() => {
    applyTheme(siteTheme);
  }, [siteTheme]);

  const setSiteTheme = async (themeId: string, userId?: string, email?: string) => {
    const found = THEMES.find(t => t.id === themeId);
    if (!found) return;
    setSiteThemeState(found);
    localStorage.setItem(SITE_THEME_KEY, themeId);

    // Persist to Supabase for owner only (site-wide)
    if (email === OWNER_EMAIL && userId) {
      try {
        await supabase
          .from('user_profiles')
          .update({ ui_theme: themeId })
          .eq('user_id', userId);
      } catch {
        // localStorage fallback already set
      }
    }
  };

  const getThemeById = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];

  return (
    <ThemeContext.Provider value={{ siteTheme, setSiteTheme, getThemeById, themes: THEMES, OWNER_EMAIL }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
