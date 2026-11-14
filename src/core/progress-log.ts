import { calendarKey } from './calendar';
import { emptyDay } from './history';
import { reachedQuests } from './quests';
import { streakAfterFocus } from './streak';
import { DayHistory, DayStats, StreakState, Task } from './types';
import { countsAsRewardSession, focusSessionXp } from './xp';

// The record that progress is built from, so two devices can be combined.
//
// Each finished focus session is one `SessionRecord`, kept once by its id.
// Progress from before records existed is one `DayRecord` per day (the daily
// totals the device already had). XP, streak and the per-day history are
// worked out from these by `rebuildProgress`, never stored as editable totals
// in the account. This is the sync model the owner chose on 2026-11-13.

/** The longest focus a record may hold, matching the Firestore rules. */
export const MAX_RECORD_MINUTES = 180;
/** The most minutes one day record may hold: a whole day. */
export const MAX_DAY_MINUTES = 1440;
/** The most tasks one day record may hold, matching the rules. */
export const MAX_DAY_TASKS = 500;

export interface SessionRecord {
  /** `${end}-${minutes}`: the same finish gives the same id, so it is kept once. */
  id: string;
  /** When the session ended, epoch ms. */
  end: number;
  minutes: number;
  /** The task the session was focused on, or null. Each device counts a task's sessions from these. */
  task: number | null;
}

export interface DayRecord {
  /** Local calendar key, `calendarKey` format (`2026-11-3`). */
  d: string;
  minutes: number;
  /** Sessions of at least 10 minutes. */
  sessions: number;
  tasks: number;
}

/**
 * A finished top-level task that was then deleted. Deleting a finished task
 * keeps its credit (owner, 2026-11-14), so the day it was finished keeps its
 * count. Reopening a task still takes the credit back: it is no longer done.
 */
export interface FinishedRecord {
  task: number;
  /** The day it was finished, `calendarKey` format. */
  d: string;
}

export interface ProgressLog {
  sessions: SessionRecord[];
  legacy: DayRecord[];
  /** Deleted finished tasks. Missing in saves from before it existed. */
  finished?: FinishedRecord[];
}

export function emptyLog(): ProgressLog {
  return { sessions: [], legacy: [] };
}

export function sessionRecordId(end: number, minutes: number): string {
  return `${end}-${minutes}`;
}

/** A focus session as a record, or null when it cannot be one (under a minute, or too long). */
export function sessionRecord(end: number, minutes: number, task: number | null = null): SessionRecord | null {
  if (!Number.isInteger(end) || end <= 0) return null;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_RECORD_MINUTES) return null;
  const focused = typeof task === 'number' && Number.isSafeInteger(task) ? task : null;
  return { id: sessionRecordId(end, minutes), end, minutes, task: focused };
}

/**
 * Each task's session count (the tomato count), at least the number of
 * records that name it. The count is not synced (it would be one more write
 * per session); every device works it out from the session records instead.
 * A count from before records existed is kept on the device that has it.
 *
 * `previous` is the log the tasks' counts were last right for (the device's
 * log before a sync). What a task counted beyond its records there is its
 * pre-record count, and records added since are counted on top of it, so a
 * new session from another device is not hidden by an old count.
 */
export function withSessionCounts(tasks: Task[], log: ProgressLog, previous: ProgressLog = log): Task[] {
  const counts = countByTask(log);
  const before = previous === log ? counts : countByTask(previous);
  let changed = false;
  const next = tasks.map((task) => {
    const base = Math.max(0, task.pomos - (before.get(task.id) ?? 0));
    const pomos = base + (counts.get(task.id) ?? 0);
    if (pomos === task.pomos) return task;
    changed = true;
    return { ...task, pomos };
  });
  return changed ? next : tasks;
}

function countByTask(log: ProgressLog): Map<number, number> {
  const counts = new Map<number, number>();
  for (const record of log.sessions) {
    if (record.task != null) counts.set(record.task, (counts.get(record.task) ?? 0) + 1);
  }
  return counts;
}

/** Keeps the credit of a finished task being deleted, once per task. */
export function appendFinished(log: ProgressLog, task: Task): ProgressLog {
  if (task.parentId != null || !task.done || !task.doneOn) return log;
  const finished = log.finished ?? [];
  if (finished.some((item) => item.task === task.id)) return log;
  return { ...log, finished: [...finished, { task: task.id, d: task.doneOn }] };
}

/** Adds a record, once by id, keeping the list in end order. */
export function appendSession(log: ProgressLog, record: SessionRecord | null): ProgressLog {
  if (!record || log.sessions.some((item) => item.id === record.id)) return log;
  return { ...log, sessions: [...log.sessions, record].sort((a, b) => a.end - b.end) };
}

/**
 * The device's daily totals as day records, for a save from before records
 * existed. Minutes are capped at a whole day, as the rules cap them. A day's
 * task count leaves out the finished tasks still in `tasks`: those are counted
 * from the tasks themselves, so a day record holds only finishes no task shows
 * any more, and the rebuild adds the two (a later finish or reopen then moves
 * the total, and nothing is counted twice).
 */
export function legacyFromHistory(days: DayHistory, tasks: Task[] = []): DayRecord[] {
  const live: Record<string, number> = {};
  for (const task of tasks) {
    if (task.parentId != null || !task.done || !task.doneOn) continue;
    live[task.doneOn] = (live[task.doneOn] ?? 0) + 1;
  }
  const records: DayRecord[] = [];
  for (const day of Object.values(days)) {
    const extraTasks = Math.max(0, Math.floor(day.tasks) - (live[day.d] ?? 0));
    if (day.minutes <= 0 && day.sessions <= 0 && extraTasks <= 0) continue;
    records.push({
      d: day.d,
      minutes: Math.min(MAX_DAY_MINUTES, Math.max(0, Math.floor(day.minutes))),
      sessions: Math.min(MAX_DAY_MINUTES / 10, Math.max(0, Math.floor(day.sessions))),
      tasks: Math.min(MAX_DAY_TASKS, extraTasks),
    });
  }
  return records.sort((a, b) => dayOrder(a.d) - dayOrder(b.d));
}

/** True when the log or the task list holds anything worth keeping. */
export function hasProgress(log: ProgressLog, tasks: Task[]): boolean {
  return log.sessions.length > 0 || log.legacy.length > 0 || (log.finished?.length ?? 0) > 0 || tasks.length > 0;
}

export interface RebuiltProgress {
  xp: number;
  streak: StreakState;
  days: DayHistory;
  day: DayStats;
}

/**
 * XP, streak and the day history, worked out from the log and the tasks.
 * A day's task count is its day record (finishes from before records that no
 * task shows, see `legacyFromHistory`) plus the top-level tasks finished that
 * day (live ones, and deleted ones in `log.finished`).
 * Quests are claimed on any day that reached them. The streak walks the days
 * with at least one 10-minute session in order.
 */
export function rebuildProgress(log: ProgressLog, tasks: Task[], now: number): RebuiltProgress {
  const days: DayHistory = {};
  const at = (d: string): DayStats => {
    if (!days[d]) days[d] = { d, sessions: 0, minutes: 0, tasks: 0, claimed: [] };
    return days[d];
  };
  for (const record of log.legacy) {
    const day = at(record.d);
    day.minutes += record.minutes;
    day.sessions += record.sessions;
    day.tasks += record.tasks;
  }
  for (const record of log.sessions) {
    const day = at(calendarKey(record.end));
    day.minutes += record.minutes;
    if (countsAsRewardSession(record.minutes)) day.sessions += 1;
  }
  // Each task once, by id: a live finished task, else its deleted record.
  const finishedOn = new Map<number, string>();
  for (const record of log.finished ?? []) finishedOn.set(record.task, record.d);
  for (const task of tasks) {
    if (task.parentId != null || !task.done || !task.doneOn) continue;
    finishedOn.set(task.id, task.doneOn);
  }
  const finished: Record<string, number> = {};
  for (const d of finishedOn.values()) finished[d] = (finished[d] ?? 0) + 1;
  for (const [d, count] of Object.entries(finished)) at(d).tasks += count;

  let xp = 0;
  for (const day of Object.values(days)) {
    xp += focusSessionXp(day.minutes);
    for (const quest of reachedQuests(day)) {
      day.claimed.push(quest.id);
      xp += quest.reward;
    }
  }

  let streak: StreakState = { n: 0, last: '' };
  const streakDays = Object.values(days).filter((day) => day.sessions > 0).map((day) => day.d);
  for (const d of streakDays.sort((a, b) => dayOrder(a) - dayOrder(b))) {
    streak = streakAfterFocus(streak, noonOf(d));
  }

  const today = calendarKey(now);
  if (!days[today]) days[today] = emptyDay(now);
  return { xp, streak, days, day: days[today] };
}

/** Local noon of a calendar key, so a DST hour cannot move it to another day. */
function noonOf(d: string): number {
  const [year, month, day] = d.split('-').map(Number);
  return new Date(year, month - 1, day, 12).getTime();
}

function dayOrder(d: string): number {
  return noonOf(d);
}

/** Total focus minutes in the log, for the merge choice. */
export function logMinutes(log: ProgressLog): number {
  return log.legacy.reduce((sum, day) => sum + day.minutes, 0)
    + log.sessions.reduce((sum, record) => sum + record.minutes, 0);
}

