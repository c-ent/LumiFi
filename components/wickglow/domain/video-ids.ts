// The video backdrop ids (looping videos in assets/backgrounds/videos), kept
// apart from the files the same way pixel-art-ids.ts is, so saved-state can
// validate a stored id without pulling video assets into its imports (and
// tests). 'classic' is the original single video background; older saves
// stored it as the boolean `true`, which parseSavedState maps to 'classic'.
export const VIDEO_IDS = [
  'classic',
  'cyberpunk_desk',
  'frog_lily_pond',
  'snowy_sled',
  'mossy_branch',
  'night_hills',
] as const;

export type VideoId = (typeof VIDEO_IDS)[number];

/** Returns the id when it names a known video, otherwise null. */
export function readVideoId(value: unknown): VideoId | null {
  return VIDEO_IDS.find((id) => id === value) ?? null;
}
