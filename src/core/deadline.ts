// The session clock itself (remaining time, pause, resume, the deadline) lives
// in `clock.ts`. This is the one piece of deadline math the screens read.

export function timerProgress(remaining: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, remaining / total));
}
