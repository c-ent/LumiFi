// The native half of the preload pair. `preload-track.web.ts` is its web
// sibling: Metro resolves the `.web` file for the web bundle and this one
// everywhere else, so `use-music.ts` imports a single name and gets the right
// call for the platform. The pair must keep the same file name in this folder.
//
// The wrapper exists because web needs a different call than native. Native has
// no swap to make, so a one-line pass-through is all this side needs.

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
