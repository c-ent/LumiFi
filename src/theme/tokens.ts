// Values match docs/agent/ui.md. Change both together.
// Opacity is written as rgba because React Native has no color-mix.

export const colors = {
  bgBase: '#0E0A17',
  bgMid: '#1D1328',
  bgGlow: '#35201F',
  bgSurface: 'rgba(20, 15, 28, 0.9)',
  bgCard: 'rgba(255, 255, 255, 0.06)',
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

export const fonts = {
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemibold: 'Figtree_600SemiBold',
  time: 'Outfit_200ExtraLight',
  timeLight: 'Outfit_300Light',
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
