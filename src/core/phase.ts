import { TimerCfg, TimerMode } from './types';

/** Focus sessions in a cycle. The one that completes it is followed by a long break. */
export const CYCLE_LENGTH = 4;

/**
 * The longest each timer can be set to, in minutes. The settings fields stop
 * here, and a stored save is clamped to the same ceilings, so a hand-edited
 * value cannot pay out more minutes, XP or quest progress than the UI allows.
 */
export const MAX_MINUTES: Record<TimerMode, number> = { focus: 180, short: 60, long: 90 };
export const MIN_MINUTES = 1;
export const DEFAULT_MINUTES: TimerCfg = { focus: 25, short: 5, long: 15 };

export function modeDurationMs(cfg: TimerCfg, mode: TimerMode): number {
  return cfg[mode] * 60000;
}

export function durationMinutes(totalMs: number): number {
  return Math.max(1, Math.round(totalMs / 60000));
}

export function commitDurationMinutes(raw: string, max: number, fallback: number): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return fallback;
  return Math.min(max, Math.max(1, Number(trimmed)));
}

export function modeAfterComplete(mode: TimerMode, completedFocusSessions: number): TimerMode {
  if (mode !== 'focus') return 'focus';
  return completedFocusSessions % CYCLE_LENGTH === 0 ? 'long' : 'short';
}

export function modeAfterSkip(mode: TimerMode, completedFocusSessions: number): TimerMode {
  if (mode !== 'focus') return 'focus';
  return completedFocusSessions % CYCLE_LENGTH === 0 && completedFocusSessions > 0 ? 'long' : 'short';
}
