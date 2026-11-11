// Which player owns the sound: the local player, a streaming embed inside the
// app, or another app the user was handed off to. Only one plays at a time, so
// every hand-off between them goes through `stepMusicSource`, which returns the
// next source and what the local player should do.

export type MusicSource =
  /** The local player is the music. */
  | { kind: 'local' }
  /** A streaming embed is up. `resumeLocal`: the local player was playing when it took over. */
  | { kind: 'embed'; streamId: string; resumeLocal: boolean }
  /**
   * The link was opened in another app. `left` turns true once Wickglow has
   * actually gone to the background, so the hand-off itself does not count as
   * coming back.
   */
  | { kind: 'handoff'; resumeLocal: boolean; left: boolean };

export type MusicSourceEvent =
  /** An embed was opened in the app. */
  | { type: 'openEmbed'; streamId: string; localPlaying: boolean }
  /** A link was handed to another app, which takes the screen. */
  | { type: 'handOff'; localPlaying: boolean }
  /** The stream was ended, or its hand-off failed. */
  | { type: 'closeStream' }
  /** The user started local music, which takes over from any stream. */
  | { type: 'playLocal' }
  /** A session started and wants its music. */
  | { type: 'sessionStart' }
  | { type: 'appBackground' }
  | { type: 'appActive' };

export interface MusicSourceStep {
  source: MusicSource;
  /** What the local player should do now, or null to leave it alone. */
  local: 'play' | 'pause' | null;
}

export const LOCAL_SOURCE: MusicSource = { kind: 'local' };

/** The id of the embed that is up, or null when no embed is showing. */
export function activeStreamId(source: MusicSource): string | null {
  return source.kind === 'embed' ? source.streamId : null;
}

export function stepMusicSource(source: MusicSource, event: MusicSourceEvent): MusicSourceStep {
  switch (event.type) {
    case 'openEmbed':
      return {
        source: { kind: 'embed', streamId: event.streamId, resumeLocal: heldLocal(source, event.localPlaying) },
        local: 'pause',
      };
    case 'handOff':
      return {
        source: { kind: 'handoff', resumeLocal: heldLocal(source, event.localPlaying), left: false },
        local: 'pause',
      };
    case 'closeStream':
      return { source: LOCAL_SOURCE, local: resumesLocal(source) ? 'play' : null };
    case 'playLocal':
      // The caller starts the local player itself; this only drops the stream.
      return { source: LOCAL_SOURCE, local: null };
    case 'sessionStart':
      // An embed is the music for the session while it is up.
      if (source.kind === 'embed') return { source, local: null };
      return { source: LOCAL_SOURCE, local: 'play' };
    case 'appBackground':
      if (source.kind !== 'handoff' || source.left) return { source, local: null };
      return { source: { ...source, left: true }, local: null };
    case 'appActive':
      if (source.kind !== 'handoff' || !source.left) return { source, local: null };
      return { source: LOCAL_SOURCE, local: source.resumeLocal ? 'play' : null };
  }
}

// An embed that is already up keeps what it remembered when it first took
// over: the local player is paused by then, so asking again would forget it.
function heldLocal(source: MusicSource, localPlaying: boolean): boolean {
  return source.kind === 'embed' ? source.resumeLocal : localPlaying;
}

function resumesLocal(source: MusicSource): boolean {
  return source.kind !== 'local' && source.resumeLocal;
}
