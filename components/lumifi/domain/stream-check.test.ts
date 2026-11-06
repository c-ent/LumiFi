import { checkStreamLink } from './stream-check';
import { parseStreamLink } from '@/src/core/stream-links';

function linkFrom(input: string) {
  const parsed = parseStreamLink(input);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.link;
}

describe('checkStreamLink', () => {
  const original = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = original;
  });

  it('treats a Spotify 404 as private and a 200 as public', async () => {
    const link = linkFrom('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(checkStreamLink(link)).resolves.toBe('private');
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await expect(checkStreamLink(link)).resolves.toBe('public');
  });

  it('does not call the network for a YouTube Music link', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
    const link = linkFrom('https://music.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt');
    await expect(checkStreamLink(link)).resolves.toBe('unknown');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stays unknown when the check cannot be reached', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const link = linkFrom('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await expect(checkStreamLink(link)).resolves.toBe('unknown');
  });

  it('gives the request a deadline, so a stalled service cannot hang the Add button', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    globalThis.fetch = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      // Never settles on its own: only the deadline ends this request.
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    });
    const link = linkFrom('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    const result = checkStreamLink(link);
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toBe('unknown');
    expect(signal?.aborted).toBe(true);
    jest.useRealTimers();
  });
});
