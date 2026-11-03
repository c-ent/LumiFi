import { commitDurationMinutes, modeAfterComplete, modeAfterSkip, modeDurationMs } from './phase';

describe('phase cycle', () => {
  it('keeps a typed length inside its limit', () => {
    expect(commitDurationMinutes('40', 180, 25)).toBe(40);
    expect(commitDurationMinutes(' 90 ', 180, 25)).toBe(90);
    expect(commitDurationMinutes('200', 180, 25)).toBe(180);
    expect(commitDurationMinutes('0', 60, 5)).toBe(1);
    expect(commitDurationMinutes('', 180, 25)).toBe(25);
    expect(commitDurationMinutes('4.5', 180, 25)).toBe(25);
  });

  it('turns a configured length into milliseconds', () => {
    const cfg = { focus: 25, short: 5, long: 15 };
    expect(modeDurationMs(cfg, 'focus')).toBe(1_500_000);
    expect(modeDurationMs(cfg, 'short')).toBe(300_000);
    expect(modeDurationMs(cfg, 'long')).toBe(900_000);
  });

  it('follows every 4th completed focus session with a long break', () => {
    const next = [1, 2, 3, 4, 5, 6, 7, 8].map((completed) => modeAfterComplete('focus', completed));
    expect(next).toEqual(['short', 'short', 'short', 'long', 'short', 'short', 'short', 'long']);
  });

  it('returns to focus after a break', () => {
    expect(modeAfterComplete('short', 3)).toBe('focus');
    expect(modeAfterComplete('long', 4)).toBe('focus');
    expect(modeAfterSkip('short', 3)).toBe('focus');
    expect(modeAfterSkip('long', 4)).toBe('focus');
  });

  it('does not count a skipped focus session toward the long break', () => {
    expect(modeAfterSkip('focus', 0)).toBe('short');
    expect(modeAfterSkip('focus', 3)).toBe('short');
    expect(modeAfterComplete('focus', 4)).toBe('long');
    expect(modeAfterSkip('focus', 4)).toBe('long');
  });
});
