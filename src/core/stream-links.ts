// Public playlist links for Spotify, YouTube, YouTube Music, and Apple Music.
// Pure parsing only. The embed is the service's own page. Nothing here is a
// media file, a playback SDK, or a sign-in. Playback hosts and the oEmbed
// probe URL live here so tests can lock the rules that came out of the terms
// read (visible YouTube player, no autoplay, YouTube Music opens, Apple uses
// the embed host rather than MusicKit).

export type StreamService = 'spotify' | 'youtube' | 'youtube-music' | 'apple-music';

export type StreamKind = 'playlist' | 'album' | 'track' | 'video';

export interface StreamLink {
  id: string;
  service: StreamService;
  kind: StreamKind;
  /** Canonical https page. This is what we store and what a handoff opens. */
  url: string;
  title: string;
}

export type StreamParse =
  | { ok: true; link: StreamLink }
  | { ok: false; reason: 'empty' | 'unsupported' | 'private' };

export interface StreamEmbed {
  kind: 'embed';
  embedUrl: string;
  /** On-screen height. YouTube's minimum viewport is 200. */
  height: number;
}

export type StreamPlayback = StreamEmbed | { kind: 'open' };

export type StreamNavigation = 'allow' | 'block' | 'external';

// A bound on how many stored rows are read back, so a hand-edited save cannot
// hold an unbounded list. It is not the product limit: `addStreamLink` in
// `logic.tsx` keeps one saved link at a time.
export const MAX_STREAM_LINKS = 30;

const MAX_INPUT_LENGTH = 2000;
const SPOTIFY_ID = /^[A-Za-z0-9]{10,40}$/;
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_LIST_ID = /^[A-Za-z0-9_-]{8,128}$/;
const APPLE_PLAYLIST_ID = /^pl\.[A-Za-z0-9._-]{4,100}$/;
const APPLE_NUMERIC_ID = /^\d{4,20}$/;
const APPLE_SLUG = /^[A-Za-z0-9-]+$/;

const HOST_SUFFIXES: Record<StreamService, readonly string[]> = {
  spotify: ['spotify.com', 'scdn.co', 'spotifycdn.com'],
  youtube: [
    'youtube.com',
    'youtube-nocookie.com',
    'youtu.be',
    'googlevideo.com',
    'ytimg.com',
    'ggpht.com',
    'gstatic.com',
    'googleapis.com',
    'google.com',
    'googleusercontent.com',
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
  ],
  'youtube-music': ['music.youtube.com', 'youtube.com', 'googlevideo.com', 'ytimg.com', 'google.com'],
  'apple-music': ['apple.com', 'mzstatic.com', 'cdn-apple.com'],
};

const INTENT_PACKAGES: Record<StreamService, readonly string[]> = {
  spotify: ['com.spotify.music'],
  youtube: ['com.google.android.youtube'],
  'youtube-music': ['com.google.android.apps.youtube.music'],
  'apple-music': ['com.apple.android.music'],
};

const INTENT_SCHEMES: Record<StreamService, readonly string[]> = {
  spotify: ['spotify'],
  youtube: ['vnd.youtube', 'youtube'],
  'youtube-music': ['youtubemusic'],
  'apple-music': ['music', 'itmss'],
};

export function streamServiceName(service: StreamService): string {
  switch (service) {
    case 'spotify':
      return 'Spotify';
    case 'youtube':
      return 'YouTube';
    case 'youtube-music':
      return 'YouTube Music';
    case 'apple-music':
      return 'Apple Music';
  }
}

/**
 * Reads a pasted link or an embed snippet. A blank paste is `empty`. A link
 * this app cannot show is `unsupported`. A link that is the listener's own
 * private library is `private`. Anything else is a stored public page.
 */
export function parseStreamLink(input: string): StreamParse {
  const raw = extractCandidate(input);
  if (raw == null) return { ok: false, reason: input.trim() ? 'unsupported' : 'empty' };
  const spotifyUri = /^spotify:(playlist|album|track):([A-Za-z0-9]{10,40})$/i.exec(raw);
  if (spotifyUri) {
    const kind = spotifyUri[1].toLowerCase() as 'playlist' | 'album' | 'track';
    return accept(spotifyLink(kind, spotifyUri[2]));
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'unsupported' };
  }
  if (url.protocol !== 'https:' || url.username || url.password) return { ok: false, reason: 'unsupported' };
  const host = hostname(url);
  if (host === 'open.spotify.com') return parseSpotify(url);
  if (host === 'music.youtube.com' || host.endsWith('.music.youtube.com')) return parseYouTubeMusic(url);
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com')) {
    return parseYouTube(url);
  }
  if (host === 'music.apple.com' || host === 'embed.music.apple.com' || host === 'geo.music.apple.com') {
    return parseApple(url);
  }
  return { ok: false, reason: 'unsupported' };
}

/** The service player for a stored link. YouTube Music is never an embed. */
export function playbackFor(link: StreamLink): StreamPlayback {
  if (link.service === 'youtube-music') return { kind: 'open' };
  if (link.service === 'spotify') {
    const kind = link.kind === 'video' ? 'track' : link.kind;
    return {
      kind: 'embed',
      embedUrl: `https://open.spotify.com/embed/${kind}/${idOf(link)}`,
      height: kind === 'track' ? 152 : 352,
    };
  }
  if (link.service === 'youtube') {
    const list = listOf(link);
    const video = videoOf(link);
    const embedUrl = list
      ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}`
      : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video)}`;
    return { kind: 'embed', embedUrl, height: 270 };
  }
  return { kind: 'embed', embedUrl: appleEmbedUrl(link.url), height: 450 };
}

/**
 * On the web, a hidden browser tab can keep Spotify and Apple Music playing
 * because their frame stays mounted. YouTube's rules require the player to
 * leave when it is off screen, so that frame is removed.
 */
export function keepsWebPlaybackWhenHidden(service: StreamService): boolean {
  return service === 'spotify' || service === 'apple-music';
}

/**
 * Where an embed may navigate. The player stays on the service's own hosts
 * so a redirect cannot wander off, and a service app link is `external`.
 */
export function decideStreamNavigation(url: string, service: StreamService): StreamNavigation {
  const trimmed = url.trim();
  if (!trimmed) return 'block';
  if (/^about:(blank|srcdoc)$/i.test(trimmed)) return 'allow';
  if (isExternalScheme(trimmed, service)) return 'external';
  if (/^intent:/i.test(trimmed)) return decideIntentNavigation(trimmed, service);
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'block';
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return 'block';
  const host = hostname(parsed);
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return 'block';
  const allowed = HOST_SUFFIXES[service].some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  return allowed ? 'allow' : 'block';
}

/** True when two URLs are the same document, ignoring query order. */
export function sameStreamDocument(left: string, right: string): boolean {
  try {
    const a = new URL(left);
    const b = new URL(right);
    return a.origin === b.origin && a.pathname === b.pathname;
  } catch {
    return false;
  }
}

/**
 * A public oEmbed check, or null when the service has no check that can be
 * trusted. YouTube playlists, YouTube Music, and Apple Music are null: a
 * playlist oEmbed miss would reject public links, and the other two have no
 * public oEmbed.
 */
export function publicCheckUrl(link: StreamLink): string | null {
  if (link.service === 'spotify') {
    return `https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`;
  }
  if (link.service === 'youtube' && link.kind === 'video') {
    return `https://www.youtube.com/oembed?url=${encodeURIComponent(link.url)}&format=json`;
  }
  return null;
}

/** Drops a malformed or non-public row instead of throwing. Order is kept. */
export function parseStreamLinks(value: unknown): StreamLink[] {
  if (!Array.isArray(value)) return [];
  const links: StreamLink[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (links.length >= MAX_STREAM_LINKS) break;
    if (!item || typeof item !== 'object') continue;
    const url = (item as { url?: unknown }).url;
    if (typeof url !== 'string') continue;
    const parsed = parseStreamLink(url);
    if (!parsed.ok || seen.has(parsed.link.id)) continue;
    seen.add(parsed.link.id);
    links.push(parsed.link);
  }
  return links;
}

function accept(link: StreamLink): StreamParse {
  return { ok: true, link };
}

function extractCandidate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_INPUT_LENGTH) return null;
  const src = /src\s*=\s*["']([^"']+)["']/i.exec(trimmed);
  const raw = (src?.[1] ?? trimmed).replace(/&amp;/g, '&').trim();
  if (/^spotify:/i.test(raw)) return raw.split('?')[0];
  const match = /https:\/\/[^\s"'<>]+/i.exec(raw);
  if (!match) return null;
  return match[0].replace(/[),.;]+$/, '');
}

function hostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/\.$/, '');
}

function parseSpotify(url: URL): StreamParse {
  let parts = url.pathname.split('/').filter(Boolean);
  if (parts[0]?.toLowerCase().startsWith('intl-')) parts = parts.slice(1);
  if (parts[0] === 'embed') parts = parts.slice(1);
  if (parts[0] === 'user' && parts[2] === 'playlist' && parts[3]) parts = ['playlist', parts[3]];
  const type = parts[0];
  const id = parts[1];
  if (!type || !id || parts.length !== 2) return { ok: false, reason: 'unsupported' };
  if (type !== 'playlist' && type !== 'album' && type !== 'track') return { ok: false, reason: 'unsupported' };
  if (!SPOTIFY_ID.test(id)) return { ok: false, reason: 'unsupported' };
  return accept(spotifyLink(type, id));
}

function spotifyLink(kind: 'playlist' | 'album' | 'track', id: string): StreamLink {
  return {
    id: `spotify:${kind}:${id}`,
    service: 'spotify',
    kind,
    url: `https://open.spotify.com/${kind}/${id}`,
    title: `Spotify ${kind}`,
  };
}

function parseYouTube(url: URL): StreamParse {
  const list = url.searchParams.get('list');
  if (list && isPrivateYouTubeList(list)) return { ok: false, reason: 'private' };
  const video = youtubeVideoId(url);
  if (list && YOUTUBE_LIST_ID.test(list)) return accept(youtubeLink('playlist', list));
  if (video && YOUTUBE_VIDEO_ID.test(video)) return accept(youtubeLink('video', video));
  return { ok: false, reason: 'unsupported' };
}

function parseYouTubeMusic(url: URL): StreamParse {
  const list = url.searchParams.get('list');
  const video = url.searchParams.get('v');
  if (list && isPrivateYouTubeList(list)) return { ok: false, reason: 'private' };
  if (list && YOUTUBE_LIST_ID.test(list)) {
    return accept({
      id: `youtube-music:playlist:${list}`,
      service: 'youtube-music',
      kind: 'playlist',
      url: `https://music.youtube.com/playlist?list=${encodeURIComponent(list)}`,
      title: 'YouTube Music playlist',
    });
  }
  if (video && YOUTUBE_VIDEO_ID.test(video)) {
    return accept({
      id: `youtube-music:video:${video}`,
      service: 'youtube-music',
      kind: 'video',
      url: `https://music.youtube.com/watch?v=${encodeURIComponent(video)}`,
      title: 'YouTube Music',
    });
  }
  return { ok: false, reason: 'unsupported' };
}

function isPrivateYouTubeList(list: string): boolean {
  return list === 'WL' || list === 'LL' || list === 'FL';
}

function youtubeVideoId(url: URL): string | null {
  const host = hostname(url);
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id ?? null;
  }
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'watch') return url.searchParams.get('v');
  if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1] && parts[1] !== 'videoseries') {
    return parts[1];
  }
  return null;
}

function youtubeLink(kind: 'playlist' | 'video', id: string): StreamLink {
  const url = kind === 'playlist'
    ? `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`
    : `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  return {
    id: `youtube:${kind}:${id}`,
    service: 'youtube',
    kind,
    url,
    title: kind === 'playlist' ? 'YouTube playlist' : 'YouTube video',
  };
}

function parseApple(url: URL): StreamParse {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.includes('library')) return { ok: false, reason: 'private' };
  if (parts.length < 3) return { ok: false, reason: 'unsupported' };
  const storefront = parts[0].toLowerCase();
  const type = parts[1];
  if (!/^[a-z]{2}$/.test(storefront)) return { ok: false, reason: 'unsupported' };
  if (type !== 'playlist' && type !== 'album' && type !== 'song') return { ok: false, reason: 'unsupported' };
  const id = parts[parts.length - 1];
  const slug = parts.length >= 4 ? parts.slice(2, -1).join('-') : '';
  if (slug && !APPLE_SLUG.test(slug)) return { ok: false, reason: 'unsupported' };
  if (type === 'playlist' && !APPLE_PLAYLIST_ID.test(id)) return { ok: false, reason: 'unsupported' };
  if (type !== 'playlist' && !APPLE_NUMERIC_ID.test(id)) return { ok: false, reason: 'unsupported' };
  const songId = url.searchParams.get('i');
  if (songId && !APPLE_NUMERIC_ID.test(songId)) return { ok: false, reason: 'unsupported' };
  const kind: StreamKind = type === 'playlist' ? 'playlist' : type === 'song' || songId ? 'track' : 'album';
  const path = slug
    ? `/${storefront}/${type}/${slug}/${id}`
    : `/${storefront}/${type}/${id}`;
  const page = songId ? `https://music.apple.com${path}?i=${songId}` : `https://music.apple.com${path}`;
  const pretty = wordsFromSlug(slug);
  return accept({
    id: `apple-music:${storefront}:${type}:${id}${songId ? `:${songId}` : ''}`,
    service: 'apple-music',
    kind,
    url: page,
    title: pretty ? `Apple Music · ${pretty}` : `Apple Music ${kind === 'track' ? 'song' : kind}`,
  });
}

function wordsFromSlug(slug: string): string {
  if (!slug || APPLE_PLAYLIST_ID.test(slug) || APPLE_NUMERIC_ID.test(slug)) return '';
  return slug.replace(/-/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function idOf(link: StreamLink): string {
  const parts = link.id.split(':');
  return parts[parts.length - 1] ?? '';
}

function listOf(link: StreamLink): string {
  if (link.kind !== 'playlist') return '';
  try {
    return new URL(link.url).searchParams.get('list') ?? '';
  } catch {
    return '';
  }
}

function videoOf(link: StreamLink): string {
  try {
    return new URL(link.url).searchParams.get('v') ?? '';
  } catch {
    return '';
  }
}

function appleEmbedUrl(page: string): string {
  const url = new URL(page);
  url.hostname = 'embed.music.apple.com';
  return url.toString();
}

/**
 * An Android intent is only ever `external`, so it must be the service's own
 * app. Fields are read one by one rather than searched, because a substring
 * match would accept `package=com.other.app` next to a planted `scheme`.
 */
function decideIntentNavigation(url: string, service: StreamService): StreamNavigation {
  const fields = readIntentFields(url);
  if (fields === null || fields.component) return 'block';
  const packages = fields.values('package');
  const schemes = fields.values('scheme');
  if (packages.length) {
    const allowed = INTENT_PACKAGES[service];
    return packages.every((name) => allowed.includes(name)) ? 'external' : 'block';
  }
  if (schemes.length) return schemes.every((name) => INTENT_SCHEMES[service].includes(name)) ? 'external' : 'block';
  return 'block';
}

interface IntentFields {
  component: boolean;
  values: (key: string) => string[];
}

/**
 * Android writes the fragment as `Intent;key=value;key=value;end`, separated by
 * `;` with an optional `S.` on typed extras. Parsing those fields one by one
 * rather than searching the string is the point: a substring match would accept
 * `package=com.other.app` next to a planted `scheme=spotify`. Nothing is read
 * past the `end` terminator, so a later field cannot be smuggled in.
 */
function readIntentFields(url: string): IntentFields | null {
  const hash = url.indexOf('#');
  if (hash < 0) return null;
  const segments = url.slice(hash + 1).split(';');
  if (segments[0]?.toLowerCase() !== 'intent') return null;
  let component = false;
  const groups = new Map<string, string[]>();
  for (const segment of segments.slice(1)) {
    const split = segment.indexOf('=');
    if (split < 0) {
      if (segment.toLowerCase() === 'end') break;
      continue;
    }
    const name = segment.slice(0, split).replace(/^S\./, '').toLowerCase();
    const value = decodeField(segment.slice(split + 1));
    if (name === 'component') {
      component = true;
      continue;
    }
    if (name !== 'package' && name !== 'scheme') continue;
    if (!value) continue;
    const group = groups.get(name);
    if (group) group.push(value);
    else groups.set(name, [value]);
  }
  return { component, values: (key) => groups.get(key) ?? [] };
}

function decodeField(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

function isExternalScheme(url: string, service: StreamService): boolean {
  if (service === 'spotify') return /^spotify:/i.test(url);
  if (service === 'youtube' || service === 'youtube-music') return /^(youtube|vnd\.youtube):/i.test(url);
  return /^(music|musics|itms|itms-apps|itmss):/i.test(url);
}
