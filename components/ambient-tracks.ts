import type { AmbientKey } from '@/src/core/ambient';

// Licensed loops listed in MUSIC_LICENSES.md. Keyed by every sound in
// `src/core/ambient.ts`, so a sound without a file does not compile.
export const AMBIENT_SOURCES: Record<AmbientKey, number> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  rain: require('../assets/audio/ambient/Rain.ogg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cafe: require('../assets/audio/ambient/Cafe.ogg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  fire: require('../assets/audio/ambient/Fireplace.ogg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  wind: require('../assets/audio/ambient/Wind.ogg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  clock: require('../assets/audio/ambient/ClockTick.ogg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  brown: require('../assets/audio/ambient/BrownNoise.ogg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  forest: require('../assets/audio/ambient/Forest.ogg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  keyboard: require('../assets/audio/ambient/Keyboard.ogg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  waves: require('../assets/audio/ambient/Waves.ogg'),
};
