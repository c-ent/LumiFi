import { calendarKey } from './calendar';
import {
  appendSession,
  emptyLog,
  hasProgress,
  legacyFromHistory,
  logMinutes,
  rebuildProgress,
  sessionRecord,
  withSessionCounts,
} from './progress-log';
import { Task } from './types';

const at = (year: number, month: number, day: number, hour = 10) => new Date(year, month - 1, day, hour).getTime();

function task(id: number, doneOn: string | null, parentId: number | null = null): Task {
  return { id, text: `t${id}`, done: doneOn != null, pomos: 0, doneOn, parentId, date: null, open: false };
}

describe('session records', () => {
  it('rejects a session under a minute or over 180 minutes', () => {
    expect(sessionRecord(at(2026, 11, 3), 0)).toBeNull();
    expect(sessionRecord(at(2026, 11, 3), 181)).toBeNull();
    expect(sessionRecord(at(2026, 11, 3), 2.5)).toBeNull();
    expect(sessionRecord(at(2026, 11, 3), 25)).toEqual({ id: `${at(2026, 11, 3)}-25`, end: at(2026, 11, 3), minutes: 25, task: null });
    expect(sessionRecord(at(2026, 11, 3), 25, 7)?.task).toBe(7);
  });

  it('accepts exactly 1 and exactly 180 minutes', () => {
    expect(sessionRecord(at(2026, 11, 3), 1)?.minutes).toBe(1);
    expect(sessionRecord(at(2026, 11, 3), 180)?.minutes).toBe(180);
  });

  it('keeps a session once by id', () => {
    const record = sessionRecord(at(2026, 11, 3), 25);
    const once = appendSession(emptyLog(), record);
    expect(appendSession(once, record)).toBe(once);
    expect(once.sessions).toHaveLength(1);
  });
});

describe('legacyFromHistory', () => {
  it('turns days with progress into records and caps a day at 1440 minutes', () => {
    const records = legacyFromHistory({
      '2026-11-2': { d: '2026-11-2', minutes: 2000, sessions: 3, tasks: 1, claimed: ['q1'] },
      '2026-11-3': { d: '2026-11-3', minutes: 0, sessions: 0, tasks: 0, claimed: [] },
      '2026-11-1': { d: '2026-11-1', minutes: 30, sessions: 1, tasks: 0, claimed: [] },
    });
    expect(records).toEqual([
      { d: '2026-11-1', minutes: 30, sessions: 1, tasks: 0 },
      { d: '2026-11-2', minutes: 1440, sessions: 3, tasks: 1 },
    ]);
  });
});

describe('rebuildProgress', () => {
  it('pays 2 XP a minute and each quest once a day', () => {
    let log = emptyLog();
    for (let index = 0; index < 4; index += 1) log = appendSession(log, sessionRecord(at(2026, 11, 3, 9 + index), 25));
    const rebuilt = rebuildProgress(log, [task(1, '2026-11-3')], at(2026, 11, 3, 20));
    // 100 minutes = 200 XP, + 40 sessions, + 50 minutes, + 30 task.
    expect(rebuilt.xp).toBe(320);
    expect(rebuilt.day).toEqual({ d: '2026-11-3', sessions: 4, minutes: 100, tasks: 1, claimed: ['q1', 'q2', 'q3'] });
  });

  it('does not count a session under 10 minutes toward sessions or the streak', () => {
    const log = appendSession(emptyLog(), sessionRecord(at(2026, 11, 3), 5));
    const rebuilt = rebuildProgress(log, [], at(2026, 11, 3, 20));
    expect(rebuilt.xp).toBe(10);
    expect(rebuilt.day.sessions).toBe(0);
    expect(rebuilt.streak).toEqual({ n: 0, last: '' });
  });

  it('counts a session from 10 minutes, not 9, toward sessions and the streak', () => {
    const nine = rebuildProgress(appendSession(emptyLog(), sessionRecord(at(2026, 11, 3), 9)), [], at(2026, 11, 3, 20));
    expect(nine.day).toMatchObject({ sessions: 0, minutes: 9 });
    expect(nine.xp).toBe(18);
    expect(nine.streak).toEqual({ n: 0, last: '' });
    const ten = rebuildProgress(appendSession(emptyLog(), sessionRecord(at(2026, 11, 3), 10)), [], at(2026, 11, 3, 20));
    expect(ten.day).toMatchObject({ sessions: 1, minutes: 10 });
    expect(ten.xp).toBe(20);
    expect(ten.streak).toEqual({ n: 1, last: '2026-11-3' });
  });

  it('puts sessions just before and just after midnight on their own days', () => {
    let log = emptyLog();
    log = appendSession(log, sessionRecord(new Date(2026, 10, 3, 23, 59).getTime(), 25));
    log = appendSession(log, sessionRecord(new Date(2026, 10, 4, 0, 1).getTime(), 25));
    const rebuilt = rebuildProgress(log, [], at(2026, 11, 4, 20));
    expect(rebuilt.days['2026-11-3']).toMatchObject({ sessions: 1, minutes: 25 });
    expect(rebuilt.days['2026-11-4']).toMatchObject({ sessions: 1, minutes: 25 });
    expect(rebuilt.streak).toEqual({ n: 2, last: '2026-11-4' });
  });

  it('builds the streak across days and restarts after a gap', () => {
    let log = emptyLog();
    log = appendSession(log, sessionRecord(at(2026, 11, 1), 25));
    log = appendSession(log, sessionRecord(at(2026, 11, 3), 25));
    log = appendSession(log, sessionRecord(at(2026, 11, 4), 25));
    expect(rebuildProgress(log, [], at(2026, 11, 4, 20)).streak).toEqual({ n: 2, last: '2026-11-4' });
  });

  it('carries a streak across a month end and from day records into sessions', () => {
    const log = appendSession(
      { sessions: [], legacy: [{ d: '2026-10-31', minutes: 25, sessions: 1, tasks: 0 }] },
      sessionRecord(at(2026, 11, 1), 25),
    );
    expect(rebuildProgress(log, [], at(2026, 11, 1, 20)).streak).toEqual({ n: 2, last: '2026-11-1' });
  });

  it('counts a migrated day once, and a finish after the migration on top of it', () => {
    // The old save counted 2 tasks that day: task 1 (still in the list) and one
    // deleted before records existed.
    const history = { '2026-11-3': { d: '2026-11-3', minutes: 0, sessions: 0, tasks: 2, claimed: ['q3'] } };
    const tasks = [task(1, '2026-11-3')];
    const legacy = legacyFromHistory(history, tasks);
    expect(legacy).toEqual([{ d: '2026-11-3', minutes: 0, sessions: 0, tasks: 1 }]);
    const log = { sessions: [], legacy };
    expect(rebuildProgress(log, tasks, at(2026, 11, 3, 20)).day.tasks).toBe(2);
    // A task finished after the migration adds to the day.
    expect(rebuildProgress(log, [...tasks, task(2, '2026-11-3')], at(2026, 11, 3, 20)).day.tasks).toBe(3);
    // Reopening the migrated task lowers it; the deleted one stays counted.
    expect(rebuildProgress(log, [], at(2026, 11, 3, 20)).day.tasks).toBe(1);
  });

  it('counts a deleted finished task on the day it was finished, and each task once', () => {
    const log = { sessions: [], legacy: [], finished: [{ task: 2, d: '2026-11-3' }, { task: 1, d: '2026-11-3' }] };
    // Task 1 is also live and finished: it counts once.
    const rebuilt = rebuildProgress(log, [task(1, '2026-11-3')], at(2026, 11, 3, 20));
    expect(rebuilt.day.tasks).toBe(2);
  });

  it('counts only top-level tasks', () => {
    const rebuilt = rebuildProgress(emptyLog(), [task(1, '2026-11-3', 9)], at(2026, 11, 3, 20));
    expect(rebuilt.day.tasks).toBe(0);
  });

  it('always has today in the history', () => {
    const now = at(2026, 11, 3, 20);
    const rebuilt = rebuildProgress(emptyLog(), [], now);
    expect(rebuilt.days[calendarKey(now)]).toBe(rebuilt.day);
    expect(rebuilt.xp).toBe(0);
  });
});

describe('summaries', () => {
  it('counts minutes and tells empty from not', () => {
    const log = appendSession({ sessions: [], legacy: [{ d: '2026-11-1', minutes: 30, sessions: 1, tasks: 0 }] }, sessionRecord(at(2026, 11, 3), 25));
    expect(logMinutes(log)).toBe(55);
    expect(hasProgress(emptyLog(), [])).toBe(false);
    expect(hasProgress(emptyLog(), [task(1, null)])).toBe(true);
    expect(hasProgress(log, [])).toBe(true);
  });
});

describe('withSessionCounts', () => {
  it('counts each task sessions from the records, never lowering a count the device already has', () => {
    let log = emptyLog();
    log = appendSession(log, sessionRecord(at(2026, 11, 3, 9), 25, 1));
    log = appendSession(log, sessionRecord(at(2026, 11, 3, 10), 25, 1));
    log = appendSession(log, sessionRecord(at(2026, 11, 3, 11), 25, 2));
    const tasks = [task(1, null), { ...task(2, null), pomos: 5 }, task(3, null)];
    expect(withSessionCounts(tasks, log).map((item) => item.pomos)).toEqual([2, 5, 0]);
  });

  it('adds new local and remote sessions on top of a count from before records', () => {
    // 3 sessions from before records, then one here (the device counted it: 4).
    const local = appendSession(emptyLog(), sessionRecord(at(2026, 11, 3, 9), 25, 1));
    const merged = appendSession(local, sessionRecord(at(2026, 11, 3, 10), 25, 1)); // one from another device
    const tasks = [{ ...task(1, null), pomos: 4 }];
    expect(withSessionCounts(tasks, merged, local)[0].pomos).toBe(5);
  });

  it('returns the same list when nothing changes', () => {
    const tasks = [task(1, null)];
    expect(withSessionCounts(tasks, emptyLog())).toBe(tasks);
  });
});
