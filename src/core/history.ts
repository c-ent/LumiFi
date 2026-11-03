import { calendarKey, shiftCalendarDays } from './calendar';
import { DayHistory, DayStats, ProgressState } from './types';

export function emptyDay(now: number): DayStats {
  return { d: calendarKey(now), sessions: 0, minutes: 0, tasks: 0, claimed: [] };
}

function copyDay(day: DayStats): DayStats {
  return { ...day, claimed: [...day.claimed] };
}

export function restoreDayHistory(
  history: DayHistory,
  current: DayStats | null,
  now: number,
): { day: DayStats; days: DayHistory } {
  const days: DayHistory = {};
  for (const value of Object.values(history)) {
    days[value.d] = copyDay(value);
  }
  if (current) days[current.d] = copyDay(current);
  const today = calendarKey(now);
  if (!days[today]) days[today] = emptyDay(now);
  return { day: days[today], days };
}

export function rollToToday<T extends ProgressState>(state: T, now: number): T {
  const key = calendarKey(now);
  const archived = state.days[state.day.d] === state.day
    ? state.days
    : { ...state.days, [state.day.d]: state.day };
  if (state.day.d === key && archived === state.days) return state;

  const days = archived[key] ? archived : { ...archived, [key]: emptyDay(now) };
  return { ...state, day: days[key], days };
}

export function recentDayMinutes(days: DayHistory, now: number, count: number): { at: number; minutes: number }[] {
  const entries: { at: number; minutes: number }[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const at = shiftCalendarDays(now, -back);
    entries.push({ at, minutes: days[calendarKey(at)]?.minutes ?? 0 });
  }
  return entries;
}
