/**
 * The one import point for components. It re-exports types, colors and a few
 * core helpers, and defines the screen themes (SCENES for desktop, MOODS for
 * phone), timer presets and the time formatter. Components import from here
 * so they never reach into `src/core` directly.
 */
import { hasOpenQuests, QUESTS } from '@/src/core/quests';
import type { DayStats, Task, TimerCfg, TimerMode } from '@/src/core/types';
import { LEVEL_NAMES, levelInfo } from '@/src/core/xp';
import { moods, type MoodId } from '@/src/theme/tokens';

export type { DayStats, Task, TimerCfg, TimerMode };
export type { MoodId };
export type { MonthCell, MonthGrid, MonthRef, MonthShade } from '@/src/core/month-calendar';
export { monthGrid, monthRef, monthShade, quietDayLine, shiftMonth } from '@/src/core/month-calendar';
export { hasOpenQuests, LEVEL_NAMES, QUESTS, levelInfo };
export { breakWax, colors, fonts, radius, rounded } from '@/src/theme/tokens';

// Desktop scenes and phone moods are the same nine themes (owner decision,
// 2026-11-14), so a scene is always the same id as a mood.
export type SceneId = MoodId;

// Volume sliders, each 0..100. The ambient sounds are listed in src/core/ambient.ts.
export type { MixLevels } from '@/src/core/ambient';

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

// Insertion order of `moods` (src/theme/tokens.ts) is the one display order
// for both pickers, so Amber/Moonlit/Rose/... land in the same spot on
// desktop and on phone/tablet.
const THEME_ORDER = Object.keys(moods) as MoodId[];

const moodNames: Record<MoodId, string> = {
  amber: 'Amber', moon: 'Moonlit',
  rose: 'Rose', violet: 'Violet', ash: 'Ash',
  forest: 'Forest', tide: 'Tide',
};

// Desktop scenes are built from the same mood palettes: the background
// base/mid/glow become the gradient's three stops, and the three flame colors
// become the three drifting orbs. A scene is always the same name and the
// same colors as its mood (owner decision, 2026-11-14).
export const SCENES: SceneTheme[] = THEME_ORDER.map((id) => ({
  id,
  name: moodNames[id],
  b1: moods[id].bgBase,
  b2: moods[id].bgMid,
  b3: moods[id].bgGlow,
  o1: moods[id].flame1,
  o2: moods[id].flame2,
  o3: moods[id].flame3,
  accent: moods[id].accent,
}));

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
  rose: {
    glow: 'rgba(255, 120, 180, 0.42)', wax: '#F8E6EE', waxS: '#D6B7C5', melt: '#F0C6D8',
    dish: '#2E1424', dishHi: '#45203A',
  },
  violet: {
    glow: 'rgba(170, 120, 255, 0.42)', wax: '#EEE8F8', waxS: '#C5BADB', melt: '#D9CCF2',
    dish: '#221A3D', dishHi: '#33285A',
  },
  ash: {
    glow: 'rgba(235, 230, 220, 0.3)', wax: '#EDEAE4', waxS: '#C2BEB6', melt: '#DAD5CC',
    dish: '#1E1E22', dishHi: '#2C2C32',
  },
  forest: {
    glow: 'rgba(167, 217, 107, 0.4)', wax: '#EAF3DC', waxS: '#BFCDA8', melt: '#DCEAC4',
    dish: '#17301C', dishHi: '#234A2C',
  },
  tide: {
    glow: 'rgba(94, 227, 240, 0.4)', wax: '#DFF4F6', waxS: '#AFD0D4', melt: '#CBEBEF',
    dish: '#0E2E38', dishHi: '#184654',
  },
} as const;

// Merge the base mood tokens with the candle art into the full mood objects.
export const MOODS: MoodTheme[] = THEME_ORDER.map((id) => ({
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

export { MODE_LABEL } from '@/src/core/session-face';

// Milliseconds -> "MM:SS". Rounds UP so the display never shows 00:00 while
// there is still a fraction of a second left.
export function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
