import { formatTrackTime, trackLength, trackPosition } from './track-time';

describe('trackLength', () => {
  it('keeps a real length', () => {
    expect(trackLength(199.8)).toBe(199.8);
  });

  it('reads an unloaded or broken length as 0', () => {
    expect(trackLength(0)).toBe(0);
    expect(trackLength(-1)).toBe(0);
    expect(trackLength(Number.NaN)).toBe(0);
    expect(trackLength(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('trackPosition', () => {
  it('keeps a position inside the track', () => {
    expect(trackPosition(42.5, 120)).toBe(42.5);
  });

  it('holds the position inside 0..length', () => {
    expect(trackPosition(130, 120)).toBe(120);
    expect(trackPosition(-3, 120)).toBe(0);
    expect(trackPosition(Number.NaN, 120)).toBe(0);
  });

  it('is 0 while the length is unknown', () => {
    expect(trackPosition(12, Number.NaN)).toBe(0);
  });
});

describe('formatTrackTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatTrackTime(0)).toBe('0:00');
    expect(formatTrackTime(9.9)).toBe('0:09');
    expect(formatTrackTime(199.8)).toBe('3:19');
    expect(formatTrackTime(600)).toBe('10:00');
  });

  it('adds hours from an hour up', () => {
    expect(formatTrackTime(3600)).toBe('1:00:00');
    expect(formatTrackTime(3725)).toBe('1:02:05');
  });

  it('reads a broken value as 0:00', () => {
    expect(formatTrackTime(Number.NaN)).toBe('0:00');
    expect(formatTrackTime(-5)).toBe('0:00');
  });
});
