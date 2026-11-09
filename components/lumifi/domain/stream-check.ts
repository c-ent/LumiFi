import { publicCheckUrl, StreamLink } from '@/src/core/stream-links';

// Asks a streaming service whether a pasted link is public, before the link is
// saved. This fetches the service's oEmbed JSON, never the audio, and it is the
// only network call the app makes on the user's behalf. Anything short of a
// definite private answer reads as `unknown`, so adding a link still works with
// no connection.

/**
 * How long the oEmbed probe waits. `addStreamLink` awaits this before it saves
 * or reports anything, so a connection that stalls without failing would leave
 * the Add button with no result. The abort lands in the catch below and reads
 * as `unknown`, the same as a network failure.
 */
const CHECK_TIMEOUT_MS = 5000;

/**
 * Asks the service whether a pasted link is public. A network failure or a
 * timeout stays `unknown` so a public link can still be saved offline. This
 * fetches a JSON oEmbed document, never the audio.
 */
export async function checkStreamLink(link: StreamLink): Promise<'public' | 'private' | 'unknown'> {
  const endpoint = publicCheckUrl(link);
  if (!endpoint) return 'unknown';
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (response.ok) return 'public';
    if (response.status === 401 || response.status === 403 || response.status === 404) return 'private';
    return 'unknown';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(deadline);
  }
}
