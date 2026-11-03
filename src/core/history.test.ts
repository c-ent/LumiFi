import { calendarKey } from './calendar';
import { emptyDay, recentDayMinutes, restoreDayHistory, rollToToday } from './history';
import { ProgressState } from './types';

function stateOn(now: number, minutes: number): ProgressState {
  const day = { ...emptyDay(now), minutes };
  return {
    cfg: { focus: 25, short: 5, long: 15 },
    xp: 0,
    streak: { n: 1, last: day.d },
    day,
    days: { [day.d]: day },
    tasks: [],
    activeId: null,
    cycle: 1,
  };
}

describe('minutes per day', () => {
  const monday = new Date(2026, 10, 2, 12).getTime();
  const december = new Date(2026, 11, 12, 12).getTime();
  const september = new Date(2026, 8, 1, 12).getTime();

  it('keeps days outside the last week when the calendar rolls forward', () => {
    const current = stateOn(monday, 40);
    const oldKey = calendarKey(september);
    current.days[oldKey] = { d: oldKey, sessions: 1, minutes: 15, tasks: 0, claimed: [] };

    const rolled = rollToToday(current, december);
    expect(rolled.day).toEqual(emptyDay(december));
    expect(rolled.days[calendarKey(monday)].minutes).toBe(40);
    expect(rolled.days[oldKey].minutes).toBe(15);
    expect(Object.keys(rolled.days)).toHaveLength(3);
    expect(recentDayMinutes(rolled.days, december, 7).every((entry) => entry.minutes === 0)).toBe(true);
  });

  it('leaves state untouched when the day has not changed', () => {
    const current = stateOn(monday, 40);
    expect(rollToToday(current, monday + 1000)).toBe(current);
  });

  it('restores yesterday and lets the saved day win over an older copy', () => {
    const today = calendarKey(monday);
    const restored = restoreDayHistory(
      { [today]: { d: today, sessions: 1, minutes: 10, tasks: 0, claimed: [] } },
      { d: today, sessions: 2, minutes: 25, tasks: 0, claimed: [] },
      monday,
    );
    expect(restored.day.minutes).toBe(25);
    expect(restored.days[today]).toBe(restored.day);
  });
});
