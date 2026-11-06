import {
  mergePlaylist,
  nextPlayableIndex,
  parseOwnTracks,
  titleFromFileName,
  type BundledTrack,
} from './own-tracks';

const bundled: BundledTrack[] = [
  { title: 'Affogato', artist: 'Alex', uri: 1 },
  { title: 'Lofi', artist: 'Sam', uri: 2 },
];

describe('titleFromFileName', () => {
  it('drops the final extension', () => {
    expect(titleFromFileName('Lofi Mix.mp3')).toBe('Lofi Mix');
    expect(titleFromFileName('Rain - Loop.ogg')).toBe('Rain - Loop');
  });

  it('keeps dots that are not the extension', () => {
    expect(titleFromFileName('My.Study.Set.flac')).toBe('My.Study.Set');
  });

  it('falls back for an empty or extension-only name', () => {
    expect(titleFromFileName('')).toBe('Untitled');
    expect(titleFromFileName('   ')).toBe('Untitled');
    expect(titleFromFileName('.mp3')).toBe('.mp3');
  });
});

describe('parseOwnTracks', () => {
  it('reads a saved list in order', () => {
    const tracks = parseOwnTracks([
      { id: 'a', title: 'First', uri: 'file:///a.mp3' },
      { id: 'b', title: 'Second', uri: 'file:///b.mp3' },
    ]);
    expect(tracks).toEqual([
      { id: 'a', title: 'First', uri: 'file:///a.mp3' },
      { id: 'b', title: 'Second', uri: 'file:///b.mp3' },
    ]);
  });

  it('drops malformed entries without throwing', () => {
    const tracks = parseOwnTracks([
      { id: 'a', title: 'Good', uri: 'file:///a.mp3' },
      { id: '', title: 'No id', uri: 'file:///x.mp3' },
      { id: 'c', title: 'No uri' },
      { id: 'd', uri: 'file:///d.mp3' },
      null,
      'nope',
      42,
    ]);
    expect(tracks).toEqual([
      { id: 'a', title: 'Good', uri: 'file:///a.mp3' },
      { id: 'd', title: 'Untitled', uri: 'file:///d.mp3' },
    ]);
  });

  it('returns nothing for a non-array', () => {
    expect(parseOwnTracks(null)).toEqual([]);
    expect(parseOwnTracks({ id: 'a' })).toEqual([]);
    expect(parseOwnTracks(undefined)).toEqual([]);
  });
});

describe('mergePlaylist', () => {
  it('keeps the bundled tracks first and appends own files', () => {
    const playlist = mergePlaylist(bundled, [
      { id: 'a', title: 'My Song', uri: 'file:///a.mp3' },
    ]);
    expect(playlist.map((entry) => entry.key)).toEqual(['Affogato - Alex', 'Lofi - Sam', 'own:a']);
    expect(playlist[0]).toMatchObject({ uri: 1, own: false, ownIndex: null });
    expect(playlist[2]).toMatchObject({ uri: 'file:///a.mp3', own: true, ownIndex: 0 });
  });

  it('leaves index 0 as the bundled start when own files exist', () => {
    const playlist = mergePlaylist(bundled, [{ id: 'a', title: 'My Song', uri: 'file:///a.mp3' }]);
    expect(playlist[0].own).toBe(false);
  });

  it('handles an empty own list', () => {
    expect(mergePlaylist(bundled, [])).toHaveLength(2);
  });
});

describe('nextPlayableIndex', () => {
  const playable = () => true;

  it('returns the same index when it is playable', () => {
    expect(nextPlayableIndex(4, 0, playable)).toBe(0);
    expect(nextPlayableIndex(4, 2, (i) => i !== 0 && i !== 1)).toBe(2);
  });

  it('skips a missing file to the next playable one', () => {
    expect(nextPlayableIndex(4, 2, (i) => i !== 2)).toBe(3);
  });

  it('wraps around to find a playable track', () => {
    expect(nextPlayableIndex(4, 3, (i) => i === 0)).toBe(0);
  });

  it('returns null when nothing is playable', () => {
    expect(nextPlayableIndex(3, 0, () => false)).toBeNull();
    expect(nextPlayableIndex(0, 0, () => true)).toBeNull();
  });

  it('normalizes a negative or out-of-range start', () => {
    expect(nextPlayableIndex(3, -1, () => true)).toBe(2);
    expect(nextPlayableIndex(3, 7, () => true)).toBe(1);
  });
});
