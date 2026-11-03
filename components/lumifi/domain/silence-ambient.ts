import { MixLevels } from '@/components/lumifi/theme';

// Music stays. Every other slider is an ambient loop.
export function silenceAmbientMix(mix: MixLevels): MixLevels {
  const next = { ...mix };
  for (const key of Object.keys(next) as (keyof MixLevels)[]) {
    if (key !== 'music') next[key] = 0;
  }
  return next;
}
