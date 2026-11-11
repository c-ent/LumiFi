import { MixLevels, silentAmbient } from '@/src/core/ambient';

/**
 * Zeroes every ambient slider and leaves the music level untouched, for the
 * mixer's "Turn off" button. The loops stop; the track the user picked does
 * not.
 */
export function silenceAmbientMix(mix: MixLevels): MixLevels {
  return { ...mix, ...silentAmbient() };
}
