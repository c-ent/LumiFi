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
