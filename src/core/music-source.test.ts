import { activeStreamId, LOCAL_SOURCE, MusicSource, MusicSourceEvent, stepMusicSource } from './music-source';

// Runs a list of events from the local player and returns the last step.
function run(events: MusicSourceEvent[], from: MusicSource = LOCAL_SOURCE) {
  let step = { source: from, local: null as 'play' | 'pause' | null };
  for (const event of events) step = stepMusicSource(step.source, event);
  return step;
}

describe('music source', () => {
  it('pauses the local player when an embed opens and resumes it when the stream ends', () => {
    const opened = run([{ type: 'openEmbed', streamId: 'a', localPlaying: true }]);
    expect(opened.local).toBe('pause');
    expect(activeStreamId(opened.source)).toBe('a');
    const closed = stepMusicSource(opened.source, { type: 'closeStream' });
    expect(closed).toEqual({ source: LOCAL_SOURCE, local: 'play' });
  });

  it('does not start the local player on close when it was not playing before', () => {
    const closed = run([
      { type: 'openEmbed', streamId: 'a', localPlaying: false },
      { type: 'closeStream' },
    ]);
    expect(closed).toEqual({ source: LOCAL_SOURCE, local: null });
  });

  it('remembers the local player across a switch from one embed to another', () => {
    // The local player is already paused when the second embed opens.
    const closed = run([
      { type: 'openEmbed', streamId: 'a', localPlaying: true },
      { type: 'openEmbed', streamId: 'b', localPlaying: false },
      { type: 'closeStream' },
    ]);
    expect(closed.local).toBe('play');
  });

  it('drops the stream without a command when the user plays local music', () => {
    const step = run([
      { type: 'openEmbed', streamId: 'a', localPlaying: true },
      { type: 'playLocal' },
    ]);
    expect(step).toEqual({ source: LOCAL_SOURCE, local: null });
    // Nothing is left to resume afterwards.
    expect(stepMusicSource(step.source, { type: 'closeStream' }).local).toBeNull();
  });

  it('leaves an embed alone when a session starts', () => {
    const opened = run([{ type: 'openEmbed', streamId: 'a', localPlaying: true }]);
    const started = stepMusicSource(opened.source, { type: 'sessionStart' });
    expect(started).toEqual({ source: opened.source, local: null });
  });

  it('plays the local player when a session starts with no embed up', () => {
    expect(run([{ type: 'sessionStart' }])).toEqual({ source: LOCAL_SOURCE, local: 'play' });
    const afterHandoff = run([
      { type: 'handOff', localPlaying: true },
      { type: 'sessionStart' },
    ]);
    expect(afterHandoff).toEqual({ source: LOCAL_SOURCE, local: 'play' });
    // The hand-off is forgotten, so coming back later does nothing.
    expect(run([{ type: 'appBackground' }, { type: 'appActive' }], afterHandoff.source).local).toBeNull();
  });

  it('resumes after a hand-off only once the app has left and come back', () => {
    const handed = run([{ type: 'handOff', localPlaying: true }]);
    expect(handed.local).toBe('pause');
    expect(activeStreamId(handed.source)).toBeNull();
    // The hand-off itself fires "active" before the app has gone anywhere.
    const early = stepMusicSource(handed.source, { type: 'appActive' });
    expect(early).toEqual({ source: handed.source, local: null });
    const back = run([{ type: 'appBackground' }, { type: 'appActive' }], handed.source);
    expect(back).toEqual({ source: LOCAL_SOURCE, local: 'play' });
  });

  it('does not resume after a hand-off when the local player was not playing', () => {
    const back = run([
      { type: 'handOff', localPlaying: false },
      { type: 'appBackground' },
      { type: 'appActive' },
    ]);
    expect(back).toEqual({ source: LOCAL_SOURCE, local: null });
  });

  it('keeps what an embed remembered when its link is then handed off', () => {
    const back = run([
      { type: 'openEmbed', streamId: 'a', localPlaying: true },
      { type: 'handOff', localPlaying: false },
      { type: 'appBackground' },
      { type: 'appActive' },
    ]);
    expect(back.local).toBe('play');
  });

  it('keeps what the first hand-off remembered when a second one follows', () => {
    const back = run([
      { type: 'handOff', localPlaying: true },
      { type: 'handOff', localPlaying: false },
      { type: 'appBackground' },
      { type: 'appActive' },
    ]);
    expect(back.local).toBe('play');
  });

  it('resumes when a hand-off fails and the stream is closed', () => {
    const failed = run([{ type: 'handOff', localPlaying: true }, { type: 'closeStream' }]);
    expect(failed).toEqual({ source: LOCAL_SOURCE, local: 'play' });
  });

  it('ignores background and active while the local player owns the sound', () => {
    expect(run([{ type: 'appBackground' }, { type: 'appActive' }])).toEqual({ source: LOCAL_SOURCE, local: null });
    const embed = run([{ type: 'openEmbed', streamId: 'a', localPlaying: true }]);
    expect(run([{ type: 'appBackground' }, { type: 'appActive' }], embed.source)).toEqual({ source: embed.source, local: null });
  });
});
