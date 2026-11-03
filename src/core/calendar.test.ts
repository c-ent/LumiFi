import { calendarKey, shiftCalendarDays } from './calendar';

describe('midnight', () => {
  it('starts a new local day at midnight', () => {
    const before = new Date(2026, 10, 2, 23, 59, 30).getTime();
    const after = new Date(2026, 10, 3, 0, 0, 30).getTime();
    expect(calendarKey(before)).toBe('2026-11-2');
    expect(calendarKey(after)).toBe('2026-11-3');
    expect(calendarKey(shiftCalendarDays(after, -1))).toBe('2026-11-2');
  });

  it('steps across a month and a year by calendar date', () => {
    const newYear = new Date(2026, 0, 1, 0, 5).getTime();
    expect(calendarKey(shiftCalendarDays(newYear, -1))).toBe('2025-12-31');
    expect(calendarKey(shiftCalendarDays(new Date(2026, 2, 9, 0, 30).getTime(), -1))).toBe('2026-3-8');
  });
});
