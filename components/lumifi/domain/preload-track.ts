import { preload } from 'expo-audio';

/**
 * Warms the audio cache for a track that is not playing yet.
 *
 * Native players stream progressively once told to play, so loading a source
 * ahead of time is enough on its own and no element swap is needed.
 */
export function preloadTrack(uri: number | string): Promise<void> {
  return preload(uri);
}
