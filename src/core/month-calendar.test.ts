import { calendarKey } from './calendar';
import { monthGrid, monthRef, monthShade, QUIET_DAY_LINES, quietDayLine, shiftMonth } from './month-calendar';
import { DayHistory } from './types';

function history(entries: Record<string, { minutes: number; sessions: number }>): DayHistory {
  const days: DayHistory = {};
  for (const [key, value] of Object.entries(entries)) {
    days[key] = { d: key, tasks: 0, claimed: [], ...value };
  }
  return days;
}

function cell(grid: ReturnType<typeof monthGrid>, key: string) {
  return grid.weeks.flat().find((entry) => entry.key === key);
}

describe('monthGrid', () => {
  it('pads the month and gives a gap inside it zero minutes rather than no cell', () => {
    // November 2026 starts on a Sunday, so the 1st is the first cell of row one.
    const now = new Date(2026, 10, 12, 21, 40).getTime();
    const grid = monthGrid(now, history({ '2026-11-2': { minutes: 25, sessions: 1 } }), 2026, 10);

    expect(grid.weeks).toHaveLength(6);
    expect(grid.weeks.every((week) => week.length === 7)).toBe(true);
    expect(grid.weeks[0][0].key).toBe('2026-11-1');
    expect(grid.weeks[0][0].inMonth).toBe(true);

    const studied = cell(grid, '2026-11-2');
    expect(studied?.minutes).toBe(25);
    expect(studied?.sessions).toBe(1);
    expect(studied?.inMonth).toBe(true);

    // The 3rd has no history entry at all, and is still a cell of this month.
    const gap = cell(grid, '2026-11-3');
    expect(gap?.inMonth).toBe(true);
    expect(gap?.minutes).toBe(0);
    expect(gap?.sessions).toBe(0);
    expect(gap?.day).toBe(3);

    expect(grid.minutes).toBe(25);
    expect(grid.sessions).toBe(1);
    expect(grid.label).toBe('November 2026');
  });

  it('pads with the adjacent months and keeps their minutes out of the total', () => {
    // March 2027 starts on a Monday, so its first row carries the tail of
    // February, and its last row runs past the end of the month.
    const grid = monthGrid(new Date(2027, 2, 15, 9).getTime(), history({
      '2027-2-28': { minutes: 90, sessions: 3 },
      '2027-4-1': { minutes: 45, sessions: 1 },
    }), 2027, 2);

    const february = grid.weeks[0][0];
    expect(february.key).toBe('2027-2-28');
    expect(february.inMonth).toBe(false);
    expect(february.minutes).toBe(0);
    expect(february.sessions).toBe(0);

    const april = cell(grid, '2027-4-1');
    expect(april?.inMonth).toBe(false);
    expect(april?.minutes).toBe(0);

    expect(grid.minutes).toBe(0);
    expect(grid.sessions).toBe(0);
    expect(cell(grid, '2027-3-1')?.inMonth).toBe(true);
  });

  it('keeps a local midnight in its own cell and out of the next day', () => {
    // 23:59 and 00:01 either side of the same local midnight, and a study day
    // that has a history entry only for the earlier one.
    const before = new Date(2026, 10, 30, 23, 59, 30).getTime();
    const after = new Date(2026, 11, 1, 0, 0, 30).getTime();
    expect(calendarKey(before)).toBe('2026-11-30');
    expect(calendarKey(after)).toBe('2026-12-1');

    const days = history({ '2026-11-30': { minutes: 50, sessions: 2 } });
    const beforeGrid = monthGrid(before, days, 2026, 10);
    const afterGrid = monthGrid(after, days, 2026, 11);

    expect(cell(beforeGrid, '2026-11-30')?.minutes).toBe(50);
    expect(cell(beforeGrid, '2026-12-1')?.minutes).toBe(0);
    expect(beforeGrid.minutes).toBe(50);

    // The month grid only counts its own month, so the 30th is a padding cell in
    // December and does not carry its 50 minutes across the line.
    expect(cell(afterGrid, '2026-12-1')?.minutes).toBe(0);
    expect(afterGrid.minutes).toBe(0);

    // Midnight of the 1st is that day's first cell, not the 30th's last.
    const december = monthGrid(new Date(2026, 11, 1, 0, 0, 30).getTime(), days, 2026, 11);
    expect(cell(december, '2026-12-1')?.today).toBe(true);
    expect(cell(december, '2026-11-30')?.today).toBe(false);
  });

  it('marks today inside the month and steps months across a year boundary', () => {
    const now = new Date(2026, 10, 12, 8).getTime();
    const grid = monthGrid(now, history({}), 2026, 10);
    expect(cell(grid, '2026-11-12')?.today).toBe(true);
    expect(grid.weeks.flat().filter((entry) => entry.today)).toHaveLength(1);

    // A different month has no today cell at all.
    const other = monthGrid(now, history({}), 2026, 9);
    expect(other.weeks.flat().some((entry) => entry.today)).toBe(false);

    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(monthRef(new Date(2026, 10, 12).getTime()), -3)).toEqual({ year: 2026, month: 7 });
  });

  it('marks the days after today as future and counts the rest, including today, as pickable', () => {
    const now = new Date(2026, 10, 12, 21, 40).getTime();
    const grid = monthGrid(now, history({}), 2026, 10);

    expect(cell(grid, '2026-11-11')?.future).toBe(false);
    expect(cell(grid, '2026-11-12')?.future).toBe(false);
    expect(cell(grid, '2026-11-13')?.future).toBe(true);
    expect(cell(grid, '2026-11-30')?.future).toBe(true);

    // Padding days carry the flag too. January 2027 opens on the last days of
    // December and closes in February, so its leading cells are pickable and its
    // trailing ones are not.
    const january = monthGrid(new Date(2027, 0, 15, 10).getTime(), history({}), 2027, 0);
    expect(cell(january, '2026-12-27')?.inMonth).toBe(false);
    expect(cell(january, '2026-12-27')?.future).toBe(false);
    expect(cell(january, '2027-2-6')?.inMonth).toBe(false);
    expect(cell(january, '2027-2-6')?.future).toBe(true);

    // Late in the day is still today, not tomorrow.
    const late = monthGrid(new Date(2026, 10, 12, 23, 59, 59).getTime(), history({}), 2026, 10);
    expect(cell(late, '2026-11-12')?.future).toBe(false);
    expect(cell(late, '2026-11-13')?.future).toBe(true);

    // The whole of a past month is pickable, and the whole of a future one is not.
    expect(monthGrid(now, history({}), 2026, 9).weeks.flat().some((entry) => entry.future)).toBe(false);
    expect(monthGrid(now, history({}), 2026, 11).weeks.flat().every((entry) => entry.future)).toBe(true);
  });
});

describe('quietDayLine', () => {
  it('picks every line in the set and never falls off either end', () => {
    const count = QUIET_DAY_LINES.length;
    // The middle of each band, so each line is reachable.
    const middles = QUIET_DAY_LINES.map((_, index) => () => (index + 0.5) / count);
    expect(middles.map(quietDayLine)).toEqual([...QUIET_DAY_LINES]);

    // A random source at or beyond the ends still returns a real line.
    expect(quietDayLine(() => 0)).toBe(QUIET_DAY_LINES[0]);
    expect(quietDayLine(() => 1)).toBe(QUIET_DAY_LINES[count - 1]);
    expect(quietDayLine(() => 0.999999)).toBe(QUIET_DAY_LINES[count - 1]);

    // Both ends of every band, so the boundaries land where the floor says.
    expect(quietDayLine(() => 1 / count)).toBe(QUIET_DAY_LINES[1]);
    expect(quietDayLine(() => 1 / count - 0.000001)).toBe(QUIET_DAY_LINES[0]);
  });
});

describe('monthShade', () => {
  it('steps at 1, 25 and 60 minutes', () => {
    expect([0, 1, 24, 25, 59, 60, 240].map(monthShade)).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect(monthShade(-5)).toBe(0);
  });
});
