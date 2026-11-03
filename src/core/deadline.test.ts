import { hasReachedDeadline, pausedRemaining, remainingMs, resumeEndAt, timerProgress } from './deadline';

describe('deadline math', () => {
  it('keeps remaining equal to endAt minus now', () => {
    expect(remainingMs(1_000_000, 400_000)).toBe(600_000);
    expect(remainingMs(1_000, 1_000)).toBe(0);
    expect(remainingMs(1_000, 1_500)).toBe(-500);
  });

  it('reaches the deadline at endAt and after it', () => {
    expect(hasReachedDeadline(5_000, 4_999)).toBe(false);
    expect(hasReachedDeadline(5_000, 5_000)).toBe(true);
    expect(hasReachedDeadline(5_000, 5_001)).toBe(true);
  });

  it('freezes a non-negative remaining on pause and resumes from that remainder', () => {
    const left = pausedRemaining(10_000, 4_000);
    expect(left).toBe(6_000);
    expect(pausedRemaining(1_000, 1_500)).toBe(0);
    expect(remainingMs(resumeEndAt(34_000, left), 34_000)).toBe(left);
  });

  it('reports progress as remaining over the full duration', () => {
    expect(timerProgress(15_000, 60_000)).toBe(0.25);
    expect(timerProgress(0, 60_000)).toBe(0);
    expect(timerProgress(-5, 60_000)).toBe(0);
    expect(timerProgress(90_000, 60_000)).toBe(1);
    expect(timerProgress(10, 0)).toBe(0);
  });
});
