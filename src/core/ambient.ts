// The ambient loops, once. Adding a sound means a row here and its file in
// `components/ambient-tracks.ts`, which is keyed by `AmbientKey`, so the
// compiler points at a sound with no file. The mixer rows, the players, the
// saved defaults and the lock-screen card all read this list.
//
// Every level is a slider value from 0 to 100, the same scale as the save. The
// players convert to 0..1 in one place (`use-ambient.ts`).

/** In the order the mixer shows them. */
export const AMBIENT_SOUNDS = [
  { key: 'rain', label: 'Rain' },
  { key: 'cafe', label: 'Cafe' },
  { key: 'fire', label: 'Fireplace' },
  { key: 'wind', label: 'Wind' },
  { key: 'clock', label: 'Clock' },
  { key: 'brown', label: 'Brown noise' },
  { key: 'forest', label: 'Forest' },
  { key: 'keyboard', label: 'Keyboard' },
  { key: 'waves', label: 'Waves' },
] as const;

export type AmbientKey = (typeof AMBIENT_SOUNDS)[number]['key'];

export const AMBIENT_KEYS: readonly AmbientKey[] = AMBIENT_SOUNDS.map((sound) => sound.key);

/** Each ambient loop's slider, 0..100. */
export type AmbientMix = Record<AmbientKey, number>;

/** Every volume slider, 0..100: the music and each ambient loop. */
export type MixLevels = { music: number } & AmbientMix;

/** Every ambient loop at zero. */
export function silentAmbient(): AmbientMix {
  const mix = {} as AmbientMix;
  for (const key of AMBIENT_KEYS) mix[key] = 0;
  return mix;
}

/** True when any ambient loop is turned up. */
export function ambientOn(mix: AmbientMix): boolean {
  return AMBIENT_KEYS.some((key) => mix[key] > 0);
}

/** The first ambient loop that is turned up, in mixer order, or null. */
export function firstAudible(mix: AmbientMix): AmbientKey | null {
  return AMBIENT_KEYS.find((key) => mix[key] > 0) ?? null;
}
