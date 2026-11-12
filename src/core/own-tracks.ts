// The user's own audio files. Pure logic only: parsing a saved list, deriving a
// display title, merging the bundled and own tracks into one playlist, and
// choosing the next index when a file is missing. The file system and the picker
// live in the UI layer, which hands this module plain data.

export interface OwnTrack {
  /** Stable identity, and the file name inside the app's own-tracks folder. */
  id: string;
  title: string;
  /** A `file://` URI inside the app's document folder. Never uploaded. */
  uri: string;
}

export interface BundledTrack {
  title: string;
  artist: string;
  /** An asset id from `require()`. */
  uri: number;
}

export interface PlaylistEntry {
  key: string;
  title: string;
  artist: string;
  /** `number` for a bundled asset, `string` for a `file://` URI. */
  uri: number | string;
  own: boolean;
  /** Index into the own-tracks list, or null for a bundled track. */
  ownIndex: number | null;
}

// A hand-edited save could hold an unbounded array. Far above any real playlist.
export const MAX_OWN_TRACKS = 500;

/**
 * The display title for a picked file: its name without the final extension.
 * `Lofi Mix.mp3` becomes `Lofi Mix`. A name that is only an extension or empty
 * falls back to `Untitled`.
 */
export function titleFromFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Untitled';
  const dot = trimmed.lastIndexOf('.');
  // A leading dot with nothing before it (".mp3") is an extension with no title.
  const base = dot >= 0 ? trimmed.slice(0, dot).trim() : trimmed;
  return base || 'Untitled';
}

/**
 * Reads the saved own-tracks list. A malformed entry is dropped rather than
 * throwing, so one bad row cannot empty the player. Order is preserved.
 */
export function parseOwnTracks(value: unknown): OwnTrack[] {
  if (!Array.isArray(value)) return [];
  const tracks: OwnTrack[] = [];
  // The id is the file name and the playlist key, so a repeat is dropped.
  const seen = new Set<string>();
  for (const item of value) {
    if (tracks.length >= MAX_OWN_TRACKS) break;
    if (!item || typeof item !== 'object') continue;
    const track = item as Partial<OwnTrack>;
    if (typeof track.id !== 'string' || !track.id || seen.has(track.id)) continue;
    if (typeof track.uri !== 'string' || !track.uri) continue;
    const title = typeof track.title === 'string' && track.title.trim() ? track.title : 'Untitled';
    seen.add(track.id);
    tracks.push({ id: track.id, title, uri: track.uri });
  }
  return tracks;
}

/**
 * The bundled tracks first, then the user's own files in the order added, so the
 * startup track (index 0) does not change when files are picked.
 */
export function mergePlaylist(bundled: BundledTrack[], own: OwnTrack[]): PlaylistEntry[] {
  const entries: PlaylistEntry[] = bundled.map((track) => ({
    key: `${track.title} - ${track.artist}`,
    title: track.title,
    artist: track.artist,
    uri: track.uri,
    own: false,
    ownIndex: null,
  }));
  own.forEach((track, index) => {
    entries.push({
      key: `own:${track.id}`,
      title: track.title,
      artist: 'Your file',
      uri: track.uri,
      own: true,
      ownIndex: index,
    });
  });
  return entries;
}

/**
 * The next index at or after `from` whose track is playable, wrapping once.
 * `direction` is 1 to scan forward (the default) or -1 to scan backward, so a
 * "previous" press lands on the nearest earlier playable track.
 * Returns null when nothing is playable, so a playlist of missing files settles
 * instead of looping. `isAvailable` reports whether the file for an index still
 * exists; bundled tracks are always available.
 */
export function nextPlayableIndex(
  total: number,
  from: number,
  isAvailable: (index: number) => boolean,
  direction: 1 | -1 = 1,
): number | null {
  if (total <= 0) return null;
  const start = ((from % total) + total) % total;
  for (let step = 0; step < total; step += 1) {
    const index = (((start + direction * step) % total) + total) % total;
    if (isAvailable(index)) return index;
  }
  return null;
}
