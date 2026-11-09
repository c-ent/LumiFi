import {
  decideStreamNavigation,
  parseStreamLink,
  parseStreamLinks,
  keepsWebPlaybackWhenHidden,
  playbackFor,
  publicCheckUrl,
  sameStreamDocument,
} from './stream-links';

const SPOTIFY = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
const YOUTUBE_LIST = 'https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt';
const APPLE = 'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb';

function linkFrom(input: string) {
  const parsed = parseStreamLink(input);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.link;
}

function reasonOf(input: string) {
  const parsed = parseStreamLink(input);
  if (parsed.ok) throw new Error('expected a calm failure');
  return parsed.reason;
}

describe('parseStreamLink', () => {
  it('stores a Spotify playlist, album, and track without the share token', () => {
    const playlist = linkFrom(`${SPOTIFY}?si=abc123`);
    expect(playlist).toMatchObject({
      id: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
      service: 'spotify',
      kind: 'playlist',
      url: SPOTIFY,
      title: 'Spotify playlist',
    });
    expect(linkFrom('https://open.spotify.com/intl-de/album/1X8oZFz3pJz9Q0k2mN3vLY').kind).toBe('album');
    expect(linkFrom('spotify:track:11dFghVXANMlKmJXsNCbNl').url).toBe(
      'https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl',
    );
    expect(linkFrom('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M').id).toBe(playlist.id);
    expect(linkFrom('https://open.spotify.com/user/ada/playlist/37i9dQZF1DXcBWIGoYBM5M').id).toBe(playlist.id);
  });

  it('embeds a youtube.com playlist and opens a music.youtube.com link', () => {
    const playlist = linkFrom('https://m.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt');
    expect(playlist.service).toBe('youtube');
    expect(playlist.url).toBe(YOUTUBE_LIST);
    const withVideo = linkFrom('https://youtu.be/dQw4w9WgXcQ?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt');
    expect(withVideo.kind).toBe('playlist');
    expect(linkFrom('https://www.youtube.com/shorts/dQw4w9WgXcQ').kind).toBe('video');

    const music = linkFrom('https://music.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt');
    expect(music.service).toBe('youtube-music');
    expect(music.url).toBe('https://music.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt');
    expect(playbackFor(music)).toEqual({ kind: 'open' });
    expect(playbackFor(linkFrom('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).kind).toBe('open');
  });

  it('keeps the YouTube player visible and leaves autoplay and the player API off', () => {
    const playback = playbackFor(linkFrom(YOUTUBE_LIST));
    expect(playback.kind).toBe('embed');
    if (playback.kind !== 'embed') return;
    expect(playback.height).toBeGreaterThanOrEqual(200);
    expect(playback.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/videoseries?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt',
    );
    expect(playback.embedUrl).not.toMatch(/autoplay=1|enablejsapi=1/);
    expect(playback.embedUrl).not.toMatch(/\.(mp3|mp4|m4a|ogg|wav)($|\?)/);
  });

  it('uses Apple embed host for a public playlist and a song, and refuses the library', () => {
    const playlist = linkFrom(APPLE);
    expect(playlist.service).toBe('apple-music');
    expect(playlist.title).toBe('Apple Music · Todays Hits');
    const playback = playbackFor(playlist);
    expect(playback).toMatchObject({
      kind: 'embed',
      embedUrl: 'https://embed.music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb',
    });
    const pastedEmbed = linkFrom(
      '<iframe src="https://embed.music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb"></iframe>',
    );
    expect(pastedEmbed.url).toBe(APPLE);
    const song = linkFrom('https://music.apple.com/us/album/night-drive/1234567890?i=1234567891');
    expect(song.kind).toBe('track');
    expect(playbackFor(song).kind).toBe('embed');
    expect(reasonOf('https://music.apple.com/us/library/playlist/p.123')).toBe('private');
  });

  it('fails calmly for a blank, private, or unrecognized link', () => {
    expect(reasonOf('  ')).toBe('empty');
    expect(reasonOf('https://example.com/playlist/1')).toBe('unsupported');
    expect(reasonOf('javascript:alert(1)')).toBe('unsupported');
    expect(reasonOf('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('unsupported');
    expect(reasonOf('https://www.youtube.com/playlist?list=WL')).toBe('private');
    expect(reasonOf('https://www.youtube.com/playlist?list=LL')).toBe('private');
    expect(reasonOf('https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF')).toBe('unsupported');
  });
});

describe('embed height', () => {
  it('gives every service its own player height', () => {
    expect(playbackFor(linkFrom(SPOTIFY))).toMatchObject({ height: 352 });
    expect(playbackFor(linkFrom('spotify:track:11dFghVXANMlKmJXsNCbNl'))).toMatchObject({ height: 152 });
    expect(playbackFor(linkFrom(YOUTUBE_LIST))).toMatchObject({ height: 270 });
    expect(playbackFor(linkFrom(APPLE))).toMatchObject({ height: 450 });
  });

  it('leaves Spotify and Apple Music playing in a hidden browser tab, and removes YouTube', () => {
    expect(keepsWebPlaybackWhenHidden('spotify')).toBe(true);
    expect(keepsWebPlaybackWhenHidden('apple-music')).toBe(true);
    expect(keepsWebPlaybackWhenHidden('youtube')).toBe(false);
    expect(keepsWebPlaybackWhenHidden('youtube-music')).toBe(false);
  });
});

describe('playback and navigation', () => {
  it('allows the embed document and the service hosts, and blocks everything else', () => {
    const youtube = linkFrom(YOUTUBE_LIST);
    const playback = playbackFor(youtube);
    if (playback.kind !== 'embed') throw new Error('expected embed');
    expect(decideStreamNavigation(playback.embedUrl, 'youtube')).toBe('allow');
    expect(decideStreamNavigation('https://i.ytimg.com/vi/x/hqdefault.jpg', 'youtube')).toBe('allow');
    expect(decideStreamNavigation('https://evil.example/watch', 'youtube')).toBe('block');
    expect(decideStreamNavigation('http://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube')).toBe('block');
    expect(decideStreamNavigation('about:blank', 'spotify')).toBe('allow');
    expect(decideStreamNavigation('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M', 'spotify')).toBe('external');
    expect(decideStreamNavigation('intent://open#Intent;package=com.spotify.music;end', 'spotify')).toBe('external');
    expect(decideStreamNavigation('intent://open#Intent;package=com.other.app;end', 'spotify')).toBe('block');
    expect(decideStreamNavigation('intent://open#Intent;package=com.other.app;scheme=spotify;end', 'spotify')).toBe('block');
    expect(decideStreamNavigation('intent://open#Intent;package=com.spotify.music;component=com.other.app/.Main;end', 'spotify')).toBe('block');
    expect(decideStreamNavigation('intent://open#Intent;scheme=spotify;end', 'spotify')).toBe('external');
    expect(sameStreamDocument(playback.embedUrl, `${playback.embedUrl}&autoplay=1`)).toBe(true);
  });

  it('probes Spotify and a YouTube video, and skips the services that have no trustworthy check', () => {
    expect(publicCheckUrl(linkFrom(SPOTIFY))).toBe(`https://open.spotify.com/oembed?url=${encodeURIComponent(SPOTIFY)}`);
    const video = linkFrom('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(publicCheckUrl(video)).toContain('https://www.youtube.com/oembed?url=');
    expect(publicCheckUrl(linkFrom(YOUTUBE_LIST))).toBeNull();
    expect(publicCheckUrl(linkFrom('https://music.youtube.com/watch?v=dQw4w9WgXcQ'))).toBeNull();
    expect(publicCheckUrl(linkFrom(APPLE))).toBeNull();
  });
});

describe('parseStreamLinks', () => {
  it('keeps valid rows, drops a bad one, and ignores a duplicate', () => {
    const links = parseStreamLinks([
      { url: SPOTIFY },
      { url: 'javascript:alert(1)' },
      null,
      { url: `${SPOTIFY}?si=again` },
      { title: 'no url' },
      { url: YOUTUBE_LIST },
    ]);
    expect(links.map((item) => item.id)).toEqual([
      'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
      'youtube:playlist:PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt',
    ]);
    expect(parseStreamLinks(null)).toEqual([]);
  });
});
