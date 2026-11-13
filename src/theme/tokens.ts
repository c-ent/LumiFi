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
  // Phone glass: a faint frost over a dark tint, so the scene shows through
  // without the controls reading as white. Native has no blur, so its bars
  // and sheet use the stronger `glassTintSolid`.
  glassFill: 'rgba(255, 255, 255, 0.07)',
  glassFillOn: 'rgba(255, 255, 255, 0.16)',
  glassEdge: 'rgba(255, 255, 255, 0.12)',
  glassEdgeOn: 'rgba(255, 255, 255, 0.3)',
  glassTint: 'rgba(16, 10, 24, 0.5)',
  glassTintSolid: 'rgba(16, 10, 24, 0.86)',
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

export type MoodId = 'amber' | 'moon' | 'rose' | 'violet' | 'ash' | 'forest' | 'tide';

export interface MoodPalette {
  bgBase: string;
  bgMid: string;
  bgGlow: string;
  flame1: string;
  flame2: string;
  flame3: string;
  accent: string;
}

/**
 * A mood replaces background, flame and accent. `moon` is the stored id for
 * Moonlit. This is also the single source for the desktop scenes: `SCENES` in
 * `components/wickglow/theme.ts` maps these same palettes into gradient
 * stops and drifting orbs, so a theme is the same name and the same colors on
 * every layout (owner decision, 2026-11-14; the two systems used to carry
 * separate colors under a few matching names).
 */
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
  // Pink flame on a deep plum night.
  rose: {
    bgBase: '#14070F',
    bgMid: '#2E0F22',
    bgGlow: '#4A1A36',
    flame1: '#FFF0F6',
    flame2: '#FFA6C9',
    flame3: '#FF6FA5',
    accent: '#FFA6C9',
  },
  // Lavender flame on dark violet.
  violet: {
    bgBase: '#0C0716',
    bgMid: '#1E1238',
    bgGlow: '#33205A',
    flame1: '#F6F0FF',
    flame2: '#C9A6FF',
    flame3: '#9A6BFF',
    accent: '#C4A6FF',
  },
  // A colourless, quiet mood: a pale flame on charcoal.
  ash: {
    bgBase: '#0B0B0D',
    bgMid: '#18181C',
    bgGlow: '#26262C',
    flame1: '#FFFFFF',
    flame2: '#E4E2DC',
    flame3: '#A9A59C',
    accent: '#E4E2DC',
  },
  // Lime-green flame on deep moss (was a desktop-only scene).
  forest: {
    bgBase: '#06191A',
    bgMid: '#123D2C',
    bgGlow: '#1F3A22',
    flame1: '#F3FFCB',
    flame2: '#D7EE6E',
    flame3: '#5A9B5E',
    accent: '#A7D96B',
  },
  // Cyan flame on deep teal water (was a desktop-only scene).
  tide: {
    bgBase: '#041319',
    bgMid: '#0B3240',
    bgGlow: '#0F4050',
    flame1: '#E0FBFF',
    flame2: '#5EE3F0',
    flame3: '#1E7A98',
    accent: '#5EE3F0',
  },
};
