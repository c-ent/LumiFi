export function remainingMs(endAt: number, now: number): number {
  return endAt - now;
}

export function hasReachedDeadline(endAt: number, now: number): boolean {
  return remainingMs(endAt, now) <= 0;
}

export function pausedRemaining(endAt: number, now: number): number {
  return Math.max(0, remainingMs(endAt, now));
}

export function resumeEndAt(now: number, remaining: number): number {
  return now + remaining;
}

export function timerProgress(remaining: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, remaining / total));
}
