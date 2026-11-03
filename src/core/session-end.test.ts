import {
  FOCUS_END_LINES,
  focusEndLine,
  LOWERED_MUSIC_RATIO,
  MUSIC_FADE_MS,
  musicLevelAtSessionEnd,
} from './session-end';

describe('session end', () => {
  it('picks one encouraging line from the bundled list', () => {
    expect(focusEndLine(() => 0)).toBe(FOCUS_END_LINES[0]);
    expect(focusEndLine(() => 0.34)).toBe(FOCUS_END_LINES[1]);
    expect(focusEndLine(() => 0.99)).toBe(FOCUS_END_LINES[2]);
    expect(FOCUS_END_LINES).toEqual(['Keep up the good work!', 'You made it!', 'Good job!']);
  });

  it('keeps, halves, or fades the music level', () => {
    expect(musicLevelAtSessionEnd('keep', 0.8, 1_000)).toEqual({ level: 0.8, stop: false });
    expect(musicLevelAtSessionEnd('lower', 0.8, 0).level).toBeCloseTo(0.8 * LOWERED_MUSIC_RATIO);
    expect(musicLevelAtSessionEnd('fade', 0.8, 0)).toEqual({ level: 0.8, stop: false });
    expect(musicLevelAtSessionEnd('fade', 0.8, MUSIC_FADE_MS / 2).level).toBeCloseTo(0.4);
    expect(musicLevelAtSessionEnd('fade', 0.8, MUSIC_FADE_MS)).toEqual({ level: 0, stop: true });
  });
});