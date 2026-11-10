// The pixel-art backdrop ids (looping videos in assets/backgrounds/pixel-art),
// kept apart from the files so saved-state can validate a stored id without
// pulling video assets into its imports (and tests).
export const PIXEL_ART_IDS = ['aurora', 'meadow', 'mountain'] as const;

export type PixelArtId = (typeof PIXEL_ART_IDS)[number];

/** Returns the id when it names a known video, otherwise null. */
export function readPixelArtId(value: unknown): PixelArtId | null {
  return PIXEL_ART_IDS.find((id) => id === value) ?? null;
}
