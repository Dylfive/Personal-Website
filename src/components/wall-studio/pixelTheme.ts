import type { BinTheme } from '../../types/wallStudio';

export interface PixelThemeTokens {
  shellBg: string;
  panelBg: string;
  shellBorder: string;
  crateFront: string;
  crateInner: string;
  crateLip: string;
  accent: string;
  accentText: string;
  textMain: string;
  textMuted: string;
  badgeBg: string;
  btnBg: string;
  btnHover: string;
  starColor: string;
}

const LIGHT_THEMES: Record<BinTheme, PixelThemeTokens> = {
  'cupid-pink': {
    shellBg: '#fff0f5',
    panelBg: '#ffe5ec',
    shellBorder: '#4a192c',
    crateFront: '#ff8fab',
    crateInner: '#3b1525',
    crateLip: '#fb6f92',
    accent: '#ff4d79',
    accentText: '#ffffff',
    textMain: '#3b1525',
    textMuted: '#8f4762',
    badgeBg: '#ffe5ec',
    btnBg: '#ffb3c6',
    btnHover: '#ff8fab',
    starColor: '#ffbe0b',
  },
  'sky-blue': {
    shellBg: '#eef8ff',
    panelBg: '#d8efff',
    shellBorder: '#16324f',
    crateFront: '#7cc6fe',
    crateInner: '#12263a',
    crateLip: '#52b2fc',
    accent: '#2b8cbe',
    accentText: '#ffffff',
    textMain: '#16324f',
    textMuted: '#4a6b8a',
    badgeBg: '#d8efff',
    btnBg: '#a6d8ff',
    btnHover: '#7cc6fe',
    starColor: '#ffb703',
  },
  'cream-arcade': {
    shellBg: '#fef9ef',
    panelBg: '#fff1d0',
    shellBorder: '#3d2c1e',
    crateFront: '#e09f3e',
    crateInner: '#2b1d12',
    crateLip: '#c98627',
    accent: '#d62828',
    accentText: '#ffffff',
    textMain: '#3d2c1e',
    textMuted: '#7f5539',
    badgeBg: '#fff1d0',
    btnBg: '#f6d365',
    btnHover: '#e9c46a',
    starColor: '#f77f00',
  },
  'dark-lofi': {
    shellBg: '#f3e8ff',
    panelBg: '#e9d5ff',
    shellBorder: '#2e1065',
    crateFront: '#a78bfa',
    crateInner: '#1e1b4b',
    crateLip: '#8b5cf6',
    accent: '#7c3aed',
    accentText: '#ffffff',
    textMain: '#2e1065',
    textMuted: '#6d28d9',
    badgeBg: '#e9d5ff',
    btnBg: '#ddd6fe',
    btnHover: '#c4b5fd',
    starColor: '#f59e0b',
  },
};

const DARK_THEMES: Record<BinTheme, PixelThemeTokens> = {
  'cupid-pink': {
    shellBg: '#1d1018',
    panelBg: '#2b1623',
    shellBorder: '#ff8fab',
    crateFront: '#9d2c52',
    crateInner: '#11070d',
    crateLip: '#be3b67',
    accent: '#ff4d79',
    accentText: '#ffffff',
    textMain: '#ffe5ec',
    textMuted: '#f4a3ba',
    badgeBg: '#2b1623',
    btnBg: '#462135',
    btnHover: '#632d4a',
    starColor: '#ffd166',
  },
  'sky-blue': {
    shellBg: '#0d1926',
    panelBg: '#14263a',
    shellBorder: '#7cc6fe',
    crateFront: '#1f5b8c',
    crateInner: '#070f17',
    crateLip: '#2c74ae',
    accent: '#38bdf8',
    accentText: '#08121c',
    textMain: '#e0f2fe',
    textMuted: '#7dd3fc',
    badgeBg: '#14263a',
    btnBg: '#1c3754',
    btnHover: '#264b73',
    starColor: '#fde047',
  },
  'cream-arcade': {
    shellBg: '#1c150f',
    panelBg: '#2a1f16',
    shellBorder: '#f6d365',
    crateFront: '#9a5b13',
    crateInner: '#100b07',
    crateLip: '#b8701d',
    accent: '#f59e0b',
    accentText: '#1c150f',
    textMain: '#fef3c7',
    textMuted: '#fcd34d',
    badgeBg: '#2a1f16',
    btnBg: '#3d2c1e',
    btnHover: '#543d2a',
    starColor: '#fbbf24',
  },
  'dark-lofi': {
    shellBg: '#151221',
    panelBg: '#221c35',
    shellBorder: '#c4b5fd',
    crateFront: '#4c1d95',
    crateInner: '#0a0811',
    crateLip: '#6d28d9',
    accent: '#a78bfa',
    accentText: '#110e1b',
    textMain: '#f3e8ff',
    textMuted: '#c4b5fd',
    badgeBg: '#221c35',
    btnBg: '#32284f',
    btnHover: '#45376d',
    starColor: '#fde047',
  },
};

export function getPixelTheme(theme: BinTheme, darkMode: boolean): PixelThemeTokens {
  return darkMode ? DARK_THEMES[theme] : LIGHT_THEMES[theme];
}

export function pixelShadow(borderColor: string, size = 4): string {
  return `${size}px ${size}px 0px ${borderColor}`;
}
