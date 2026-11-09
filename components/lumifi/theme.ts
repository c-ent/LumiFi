/**
 * The one import point for components. It re-exports types, colors and a few
 * core helpers, and defines the screen themes (SCENES for desktop, MOODS for
 * phone), timer presets and the time formatter. Components import from here
 * so they never reach into `src/core` directly.
 */
import { QUESTS } from '@/src/core/quests';
import type { DayStats, Task, TimerCfg, TimerMode } from '@/src/core/types';
import { LEVEL_NAMES, levelInfo } from '@/src/core/xp';
import { moods, type MoodId } from '@/src/theme/tokens';

export type { DayStats, Task, TimerCfg, TimerMode };
export type { MoodId };
export type { MonthCell, MonthGrid, MonthRef, MonthShade } from '@/src/core/month-calendar';
export { monthGrid, monthRef, monthShade, quietDayLine, shiftMonth } from '@/src/core/month-calendar';
export { LEVEL_NAMES, QUESTS, levelInfo };
export { breakWax, colors, fonts, radius, rounded } from '@/src/theme/tokens';

export type SceneId = 'dusk' | 'midnight' | 'forest' | 'ember';

// Volume sliders, each 0..100 (saved as-is; divided by 100 for the players).
export interface MixLevels {
  music: number;
  rain: number;
  cafe: number;
  fire: number;
  wind: number;
  clock: number;
  brown: number;
  forest: number;
  keyboard: number;
  waves: number;
}

// Desktop scene colors: b1-b3 are the three gradient stops (top to bottom),
// o1-o3 the three drifting orbs, accent the highlight color for the UI.
export interface SceneTheme {
  id: SceneId;
  name: string;
  b1: string;
  b2: string;
  b3: string;
  o1: string;
  o2: string;
  o3: string;
  accent: string;
}

// Phone mood colors: background, three flame stops, glow, and the candle art
// (wax, dish). Moods only change colors, never layout.
export interface MoodTheme {
  id: MoodId;
  name: string;
  bgBase: string;
  bgMid: string;
  bgGlow: string;
  flame1: string;
  flame2: string;
  flame3: string;
  glow: string;
  wax: string;
  waxS: string;
  melt: string;
  dish: string;
  dishHi: string;
  accent: string;
}

// Layout detection lives in `features/layout.ts`, not here.

// Desktop scenes are separate from the phone moods. Unifying them is still an open question.
export const SCENES: SceneTheme[] = [
  { id: 'dusk', name: 'Dusk', b1: '#2a1b3d', b2: '#6b3a4a', b3: '#c97b4a', o1: '#ffb36b', o2: '#ff7e8b', o3: '#ffd9a0', accent: '#ffb36b' },
  { id: 'midnight', name: 'Midnight', b1: '#080c20', b2: '#162052', b3: '#34428a', o1: '#6c7bff', o2: '#3dd2ff', o3: '#a9b4ff', accent: '#9fadff' },
  { id: 'forest', name: 'Forest', b1: '#06191a', b2: '#0e3b36', b3: '#2f6b52', o1: '#5fe0b0', o2: '#e3f27a', o3: '#9be8c8', accent: '#7be0b8' },
  { id: 'ember', name: 'Ember', b1: '#160c0e', b2: '#471a1c', b3: '#a1442a', o1: '#ff9a56', o2: '#ffd27a', o3: '#ff7a6b', accent: '#ff9a56' },
];

// Wax, dish and glow are candle illustration colors, kept here so the room art
// reads from `MOODS` alone.
const candleArt = {
  amber: {
    glow: 'rgba(255, 170, 70, 0.45)', wax: '#F4E7D2', waxS: '#CFBB9B', melt: '#E9C98F',
    dish: '#2B2240', dishHi: '#3C3058',
  },
  moon: {
    glow: 'rgba(120, 160, 255, 0.45)', wax: '#E6ECF8', waxS: '#B7C3DB', melt: '#C9D8F2',
    dish: '#1F2745', dishHi: '#2D3A66',
  },
  spirit: {
    glow: 'rgba(90, 230, 160, 0.4)', wax: '#E3F3E9', waxS: '#B3CFBC', melt: '#C8E8D3',
    dish: '#1A3326', dishHi: '#274B38',
  },
} as const;

const moodNames: Record<MoodId, string> = { amber: 'Amber', moon: 'Moonlit', spirit: 'Spirit' };

// Merge the base mood tokens with the candle art into the full mood objects.
export const MOODS: MoodTheme[] =(Object.keys(moods) as MoodId[]).map((id) => ({
  id,
  name: moodNames[id],
  ...moods[id],
  ...candleArt[id],
}));

// Timer presets in minutes: focus / short break / long break.
export const PRESETS: TimerCfg[] = [
  { focus: 25, short: 5, long: 15 },
  { focus: 50, short: 10, long: 20 },
  { focus: 90, short: 20, long: 30 },
];

export const MODE_LABEL: Record<TimerMode, string> = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
};

// Milliseconds -> "MM:SS". Rounds UP so the display never shows 00:00 while
// there is still a fraction of a second left.
export function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
