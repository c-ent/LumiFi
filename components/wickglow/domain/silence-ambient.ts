import { MixLevels } from '@/components/wickglow/theme';

/**
 * Zeroes every ambient slider and leaves the music level untouched, for a
 * session end set to keep the track playing. The loops are what should stop
 * when the timer does; the track the user picked is not.
 *
 * Music stays. Every other slider is an ambient loop.
 */
export function silenceAmbientMix(mix: MixLevels): MixLevels {
  const next = { ...mix };
  for (const key of Object.keys(next) as (keyof MixLevels)[]) {
    if (key !== 'music') next[key] = 0;
  }
  return next;
}
