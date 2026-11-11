// Values match docs/agent/ui.md. Change both together.
// Opacity is written as rgba because React Native has no color-mix.

export const colors = {
  bgBase: '#0E0A17',
  bgMid: '#1D1328',
  bgGlow: '#35201F',
  bgSurface: 'rgba(24, 14, 20, 0.93)',
  bgSurfaceSolid: '#140F1C',
  bgCard: 'rgba(255, 255, 255, 0.06)',
  // Buttons and pills that float on the desktop scene. A little more solid
  // than bgCard so they hold up over bright video backgrounds.
  bgControl: 'rgba(255, 255, 255, 0.2)',
  bgInset: 'rgba(0, 0, 0, 0.28)',
  textPrimary: '#F8F1E8',
  textMuted: 'rgba(248, 241, 232, 0.62)',
  textInverse: '#1D1205',
  accent: '#FFB454',
  border: 'rgba(255, 255, 255, 0.13)',
  flame1: '#FFE3A1',
  flame2: '#FFA63D',
  flame3: '#FF6A2B',
  success: '#62D0C0',
  error: '#FF8F8F',
} as const;

/** Badge colors for a saved streaming link. They name the service, not the theme. */
export const streamMark = {
  spotify: '#7BE8B0',
  youtube: '#FF9F9F',
  'youtube-music': '#FF9F9F',
  'apple-music': '#F5A3C7',
} as const;

/** `#RRGGBB` at an alpha. Theme accents stay hex, and panels need a wash of them. */
export function fade(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((part) => part + part).join('') : raw;
  const value = Number.parseInt(full, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const fonts = {
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemibold: 'Figtree_600SemiBold',
  time: 'Outfit_200ExtraLight',
  timeLight: 'Outfit_300Light',
  timeRegular: 'Outfit_400Regular',
  timeMedium: 'Outfit_500Medium',
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 18,
  sheet: 28,
  pill: 999,
} as const;

export const breakWax = {
  body: '#D8EEE9',
  shadow: '#A8C9C2',
  melt: '#BFE3DA',
} as const;

export function rounded(size: number) {
  return { borderRadius: size, borderCurve: 'continuous' as const };
}

export type MoodId = 'amber' | 'moon' | 'spirit';

export interface MoodPalette {
  bgBase: string;
  bgMid: string;
  bgGlow: string;
  flame1: string;
  flame2: string;
  flame3: string;
  accent: string;
}

/** A mood replaces background, flame and accent. `moon` is the stored id for Moonlit. */
export const moods: Record<MoodId, MoodPalette> = {
  amber: {
    bgBase: colors.bgBase,
    bgMid: colors.bgMid,
    bgGlow: colors.bgGlow,
    flame1: colors.flame1,
    flame2: colors.flame2,
    flame3: colors.flame3,
    accent: colors.accent,
  },
  moon: {
    bgBase: '#070A1A',
    bgMid: '#121A40',
    bgGlow: '#1F2C5E',
    flame1: '#F1F6FF',
    flame2: '#A6C6FF',
    flame3: '#6F9CFF',
    accent: '#A6C6FF',
  },
  spirit: {
    bgBase: '#06130E',
    bgMid: '#0E2A1F',
    bgGlow: '#173D2D',
    flame1: '#EAFFF3',
    flame2: '#8DFFC4',
    flame3: '#3DDC97',
    accent: '#7BE8B0',
  },
};
