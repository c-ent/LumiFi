import { publicCheckUrl, StreamLink } from '@/src/core/stream-links';

/**
 * Asks the service whether a pasted link is public. A network failure stays
 * `unknown` so a public link can still be saved offline. This fetches a JSON
 * oEmbed document, never the audio.
 */
export async function checkStreamLink(link: StreamLink): Promise<'public' | 'private' | 'unknown'> {
  const endpoint = publicCheckUrl(link);
  if (!endpoint) return 'unknown';
  try {
    const response = await fetch(endpoint);
    if (response.ok) return 'public';
    if (response.status === 401 || response.status === 403 || response.status === 404) return 'private';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
