import { TimerCfg, TimerMode } from './types';

export function modeDurationMs(cfg: TimerCfg, mode: TimerMode): number {
  return cfg[mode] * 60000;
}

export function commitDurationMinutes(raw: string, max: number, fallback: number): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return fallback;
  return Math.min(max, Math.max(1, Number(trimmed)));
}

export function modeAfterComplete(mode: TimerMode, completedFocusSessions: number): TimerMode {
  if (mode !== 'focus') return 'focus';
  return completedFocusSessions % 4 === 0 ? 'long' : 'short';
}

export function modeAfterSkip(mode: TimerMode, completedFocusSessions: number): TimerMode {
  if (mode !== 'focus') return 'focus';
  return completedFocusSessions % 4 === 0 && completedFocusSessions > 0 ? 'long' : 'short';
}
