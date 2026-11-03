export const FOCUS_END_LINES = [
  'Keep up the good work!',
  'You made it!',
  'Good job!',
] as const;

export type MusicEnd = 'keep' | 'lower' | 'fade';

export const LOWERED_MUSIC_RATIO = 0.5;
export const MUSIC_FADE_MS = 4000;

export function focusEndLine(random: () => number): string {
  const rolled = random();
  const index = Math.min(
    FOCUS_END_LINES.length - 1,
    Math.max(0, Math.floor(rolled * FOCUS_END_LINES.length)),
  );
  return FOCUS_END_LINES[index];
}

export function musicLevelAtSessionEnd(
  setting: MusicEnd,
  level: number,
  elapsedMs: number,
): { level: number; stop: boolean } {
  if (setting === 'keep') return { level, stop: false };
  if (setting === 'lower') return { level: level * LOWERED_MUSIC_RATIO, stop: false };
  const elapsed = Math.max(0, elapsedMs);
  const t = Math.min(1, elapsed / MUSIC_FADE_MS);
  return { level: level * (1 - t), stop: elapsed >= MUSIC_FADE_MS };
}
