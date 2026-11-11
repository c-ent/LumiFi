import { timerProgress } from './deadline';

describe('deadline math', () => {
  it('reports progress as remaining over the full duration', () => {
    expect(timerProgress(15_000, 60_000)).toBe(0.25);
    expect(timerProgress(0, 60_000)).toBe(0);
    expect(timerProgress(-5, 60_000)).toBe(0);
    expect(timerProgress(90_000, 60_000)).toBe(1);
    expect(timerProgress(10, 0)).toBe(0);
  });
});
