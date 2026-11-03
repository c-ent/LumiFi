import { calendarKey, shiftCalendarDays } from './calendar';
import { streakAfterFocus, streakCount } from './streak';

describe('streaks', () => {
  const mondayNight = new Date(2026, 10, 2, 23, 50).getTime();
  const tuesdayMorning = new Date(2026, 10, 3, 0, 10).getTime();
  const wednesday = new Date(2026, 10, 4, 9).getTime();

  it('continues across local midnight', () => {
    const monday = streakAfterFocus({ n: 0, last: '' }, mondayNight);
    expect(monday).toEqual({ n: 1, last: '2026-11-2' });
    expect(streakCount(monday, tuesdayMorning)).toBe(1);
    expect(streakAfterFocus(monday, tuesdayMorning)).toEqual({ n: 2, last: '2026-11-3' });
  });

  it('adds one on the next calendar day and not again the same day', () => {
    const yesterday = calendarKey(shiftCalendarDays(mondayNight, -1));
    const today = streakAfterFocus({ n: 6, last: yesterday }, mondayNight);
    expect(today).toEqual({ n: 7, last: calendarKey(mondayNight) });
    expect(streakAfterFocus(today, mondayNight + 60_000)).toBe(today);
  });

  it('resets after a skipped day', () => {
    const studiedMonday = { n: 4, last: calendarKey(mondayNight) };
    expect(streakCount(studiedMonday, wednesday)).toBe(0);
    expect(streakAfterFocus(studiedMonday, wednesday)).toEqual({ n: 1, last: '2026-11-4' });
  });
});
