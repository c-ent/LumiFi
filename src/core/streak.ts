import { calendarKey, shiftCalendarDays } from './calendar';
import { StreakState } from './types';

export function streakAfterFocus(streak: StreakState, now: number): StreakState {
  const today = calendarKey(now);
  if (streak.last === today) return streak;
  const yesterday = calendarKey(shiftCalendarDays(now, -1));
  if (streak.last === yesterday) return { n: streak.n + 1, last: today };
  return { n: 1, last: today };
}

export function streakCount(streak: StreakState, now: number): number {
  const today = calendarKey(now);
  const yesterday = calendarKey(shiftCalendarDays(now, -1));
  if (streak.last === today || streak.last === yesterday) return streak.n;
  return 0;
}
