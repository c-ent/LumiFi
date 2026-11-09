// The month grid behind the stats calendar. Pure: it takes `now` and the stored
// per-day history and returns the cells, so the panel only renders them.
//
// Dates are built with `new Date(year, monthIndex, day)` and keyed with
// `calendarKey`, so a cell is the same local day the history writes, and a late
// hour or a DST change cannot slip a day into the next cell.

import { calendarKey, shiftCalendarDays } from './calendar';
import { DayHistory } from './types';

/** One day cell. Empty days are cells with zero minutes, never missing. */
export interface MonthCell {
  /** The local `calendarKey` for the cell's own day, and its identity. */
  key: string;
  /** The date this cell shows. Shifted by calendar days, not by a fixed length. */
  at: number;
  /** The day of the month, 1 to 31. */
  day: number;
  /** False for the adjacent-month days that pad the first and last weeks. */
  inMonth: boolean;
  minutes: number;
  sessions: number;
  today: boolean;
  /** True for a day after today, which has no focus time yet and cannot be picked. */
  future: boolean;
}

export interface MonthGrid {
  year: number;
  month: number;
  /** For the panel heading. */
  label: string;
  /** Six weeks of seven, so every month draws the same grid height. */
  weeks: MonthCell[][];
  /** The month's own minutes. Padding days from next door are left out. */
  minutes: number;
  sessions: number;
}

/** A month on a calendar. `month` is 0-based, matching `Date`. */
export interface MonthRef {
  year: number;
  month: number;
}

/** The minutes each shade step starts at. Step 0 is the empty day. */
export const MONTH_SHADE_STEPS = [0, 1, 25, 60] as const;

export type MonthShade = 0 | 1 | 2 | 3;

/**
 * Which of the four steps a day's minutes fall in: 0, 1 to 24, 25 to 59, and 60
 * or more. Kept beside the grid so the panel holds no threshold of its own.
 */
export function monthShade(minutes: number): MonthShade {
  if (minutes <= 0) return 0;
  if (minutes < MONTH_SHADE_STEPS[2]) return 1;
  if (minutes < MONTH_SHADE_STEPS[3]) return 2;
  return 3;
}

/**
 * What a day with no focus time says in the day detail, instead of a bare zero.
 * Drawn per view rather than per day, so a month full of gaps does not read as
 * one line repeated.
 */
export const QUIET_DAY_LINES = [
  'Rest is part of the work',
  'A quiet day',
  'Some days are for resting',
  'There\'s a room to begin',
] as const;

/** One of `QUIET_DAY_LINES`, the way `focusEndLine` picks a session-end line. */
export function quietDayLine(random: () => number): string {
  const rolled = random();
  const index = Math.min(
    QUIET_DAY_LINES.length - 1,
    Math.max(0, Math.floor(rolled * QUIET_DAY_LINES.length)),
  );
  return QUIET_DAY_LINES[index];
}

export function monthRef(now: number): MonthRef {
  const date = new Date(now);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * Steps the displayed month. Accepts any month, so the arrows never stop at a
 * year edge, and builds from the first of the month so a 31st cannot skip one.
 */
export function shiftMonth(month: MonthRef, by: number): MonthRef {
  const date = new Date(month.year, month.month + by, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * The month grid: padded weeks, and each day's minutes and sessions. A day with
 * no history entry is a gap with zero minutes, so the month keeps its shape.
 */
export function monthGrid(now: number, days: DayHistory, year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1);
  // Compared as a local key, like the history is stored, so "today" is a
  // calendar fact rather than a millisecond comparison.
  const today = calendarKey(now);
  // Midnight today, so a cell is future only when its own day is later. Cells are
  // built the same way, so a DST change cannot shift one across the line.
  const todayAt = shiftCalendarDays(now, 0);
  // Back to the Sunday that starts the week holding the 1st. Those leading cells
  // and the trailing ones that finish the last week are the padding.
  const start = shiftCalendarDays(first.getTime(), -first.getDay());

  const weeks: MonthCell[][] = [];
  let minutes = 0;
  let sessions = 0;
  for (let week = 0; week < 6; week += 1) {
    const row: MonthCell[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const at = shiftCalendarDays(start, week * 7 + weekday);
      const date = new Date(at);
      const key = calendarKey(at);
      const record = days[key];
      const inMonth = date.getFullYear() === year && date.getMonth() === month;
      const cellMinutes = inMonth ? record?.minutes ?? 0 : 0;
      if (inMonth) {
        minutes += cellMinutes;
        sessions += record?.sessions ?? 0;
      }
      row.push({
        key,
        at,
        day: date.getDate(),
        inMonth,
        minutes: cellMinutes,
        sessions: inMonth ? record?.sessions ?? 0 : 0,
        today: key === today,
        future: at > todayAt,
      });
    }
    weeks.push(row);
  }

  return {
    year,
    month,
    label: first.toLocaleDateString('en', { month: 'long', year: 'numeric' }),
    weeks,
    minutes,
    sessions,
  };
}
