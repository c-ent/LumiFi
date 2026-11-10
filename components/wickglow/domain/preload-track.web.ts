// The web half of the preload pair. The shared rationale for the wrapper lives
// in `preload-track.ts`; this file exists because web must swap the element
// onto a fetched copy, which native does not need.

import { AudioModule } from 'expo-audio';

/**
 * The web build's audio module exposes `preloadAsync`, which resolves once the
 * source has been fetched into the preload cache. TypeScript resolves the
 * native typings for this file, which do not carry that method, and the public
 * `preload` returns nothing at all on web despite being typed as a promise, so
 * the shape used here is described locally instead.
 */
type WebAudioModule = { preloadAsync: (source: number | string) => Promise<void> };

/**
 * Warms the audio cache for a track that is not playing yet, and resolves once
 * the fetched copy is ready to be used as a source.
 *
 * The player only opens a connection to a source when `play()` is called, so a
 * bundled track used to start buffering on the first press of Start and the
 * music landed seconds behind the timer. Fetching ahead of time and swapping
 * the element onto the cached copy takes that fetch off the start path.
 */
export async function preloadTrack(uri: number | string): Promise<void> {
  await (AudioModule as unknown as WebAudioModule).preloadAsync(uri);
}
