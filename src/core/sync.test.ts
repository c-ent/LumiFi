import { emptyLog, ProgressLog, SessionRecord } from './progress-log';
import {
  adoptRemote,
  emptyMeta,
  emptyRemote,
  isQuiet,
  reconcile,
  RemoteProgress,
  RemoteTask,
  remoteHasProgress,
  SyncMeta,
  taskSig,
  TOMBSTONE_KEEP_MS,
} from './sync';
import { Task } from './types';

const NOW = 1_800_000_000_000;

function task(id: number, text = `t${id}`, extra: Partial<Task> = {}): Task {
  return { id, text, done: false, pomos: 0, doneOn: null, parentId: null, date: null, open: false, ...extra };
}

function remoteTask(base: Task, updatedAt: number, deleted = false): RemoteTask {
  return { id: base.id, text: base.text, done: base.done, doneOn: base.doneOn, parentId: base.parentId, date: base.date, updatedAt, deleted };
}

function tomb(id: number, updatedAt: number): RemoteTask {
  return { id, text: '', done: false, doneOn: null, parentId: null, date: null, updatedAt, deleted: true };
}

function session(end: number, minutes = 25): SessionRecord {
  return { id: `${end}-${minutes}`, end, minutes, task: null };
}

function log(sessions: SessionRecord[] = []): ProgressLog {
  return { sessions, legacy: [] };
}

function remote(extra: Partial<RemoteProgress>): RemoteProgress {
  return { ...emptyRemote(), ...extra };
}

function seen(meta: SyncMeta, tasks: RemoteTask[]): SyncMeta {
  const next = { ...meta, tasks: { ...meta.tasks } };
  for (const item of tasks) next.tasks[String(item.id)] = { stamp: item.updatedAt, sig: taskSig(item) };
  return next;
}

describe('sessions and day records', () => {
  it('pushes a session the account has never seen and keeps both sides once', () => {
    const local = { log: log([session(1000), session(2000)]), tasks: [] };
    const result = reconcile(local, emptyMeta('u1'), remote({ sessions: [session(2000), session(3000)] }), NOW, true);
    expect(result.push.sessions).toEqual([session(1000)]);
    expect(result.log.sessions.map((item) => item.end)).toEqual([1000, 2000, 3000]);
  });

  it('marks only confirmed records as seen, so a lost push is pushed again', () => {
    const first = reconcile({ log: log([session(1000)]), tasks: [] }, emptyMeta('u1'), emptyRemote(), NOW, false);
    expect(first.meta.sessions).toEqual([]);
    const second = reconcile({ log: first.log, tasks: first.tasks }, first.meta, emptyRemote(), NOW, false);
    expect(second.push.sessions).toEqual([session(1000)]);
  });

  it('keeps a seen session that is not in a delta, and drops it only on a full read', () => {
    const meta = { ...emptyMeta('u1'), sessions: [session(1000).id] };
    const delta = reconcile({ log: log([session(1000)]), tasks: [] }, meta, emptyRemote(), NOW, false);
    expect(delta.log.sessions).toHaveLength(1);
    expect(delta.push.sessions).toEqual([]);
    const full = reconcile({ log: log([session(1000)]), tasks: [] }, meta, emptyRemote(), NOW, true);
    expect(full.log.sessions).toEqual([]);
  });

  it('adds what a delta brings and keeps the seen list growing', () => {
    const meta = { ...emptyMeta('u1'), sessions: [session(1000).id] };
    const result = reconcile({ log: log([session(1000)]), tasks: [] }, meta, remote({ sessions: [session(5000)], latest: 9 }), NOW, false);
    expect(result.log.sessions.map((item) => item.end)).toEqual([1000, 5000]);
    expect(result.meta.sessions).toEqual([session(1000).id, session(5000).id]);
    expect(result.meta.since).toBe(9);
  });

  it('pushes day records once and keeps the account copy on a clash', () => {
    const local = { log: { sessions: [], legacy: [{ d: '2026-11-1', minutes: 30, sessions: 1, tasks: 0 }, { d: '2026-11-2', minutes: 5, sessions: 0, tasks: 0 }] }, tasks: [] };
    const result = reconcile(local, emptyMeta('u1'), remote({ legacy: [{ d: '2026-11-2', minutes: 60, sessions: 2, tasks: 1 }] }), NOW, true);
    expect(result.push.days.map((day) => day.d)).toEqual(['2026-11-1']);
    expect(result.log.legacy.find((day) => day.d === '2026-11-2')?.minutes).toBe(60);
  });
});

describe('tasks', () => {
  it('pushes a new task with the time it was seen', () => {
    const result = reconcile({ log: emptyLog(), tasks: [task(1)] }, emptyMeta('u1'), emptyRemote(), NOW, false);
    expect(result.push.tasks).toEqual([remoteTask(task(1), NOW)]);
    expect(result.tasks).toEqual([task(1)]);
  });

  it('does not sync the open subtask list or the session count', () => {
    const synced = remoteTask(task(1), 100);
    const meta = seen(emptyMeta('u1'), [synced]);
    const result = reconcile({ log: emptyLog(), tasks: [task(1, 't1', { open: true, pomos: 3 })] }, meta, emptyRemote(), NOW, false);
    expect(result.push.tasks).toEqual([]);
    // An edit from the account keeps this device's open list and count.
    const edited = reconcile({ log: emptyLog(), tasks: [task(1, 't1', { open: true, pomos: 3 })] }, meta, remote({ tasks: [remoteTask(task(1, 'renamed'), 200)] }), NOW, false);
    expect(edited.tasks[0]).toEqual(task(1, 'renamed', { open: true, pomos: 3 }));
  });

  it('takes an edit from the account when this device did not edit the task', () => {
    const meta = seen(emptyMeta('u1'), [remoteTask(task(1, 'old'), 100)]);
    const result = reconcile({ log: emptyLog(), tasks: [task(1, 'old')] }, meta, remote({ tasks: [remoteTask(task(1, 'new'), 200)] }), NOW, false);
    expect(result.tasks[0].text).toBe('new');
    expect(result.push.tasks).toEqual([]);
  });

  it('pushes an edit made here even when the delta does not include the task', () => {
    const meta = seen(emptyMeta('u1'), [remoteTask(task(1, 'old'), 100)]);
    const result = reconcile({ log: emptyLog(), tasks: [task(1, 'mine')] }, meta, emptyRemote(), NOW, false);
    expect(result.tasks[0].text).toBe('mine');
    expect(result.push.tasks).toEqual([remoteTask(task(1, 'mine'), NOW)]);
    // Remembered as it was until the account confirms the new copy.
    expect(result.meta.tasks['1']).toEqual(meta.tasks['1']);
  });

  it('lets the latest edit win when both sides edited', () => {
    const meta = seen(emptyMeta('u1'), [remoteTask(task(1, 'old'), 100)]);
    const theirs = remoteTask(task(1, 'theirs'), NOW + 5000);
    const result = reconcile({ log: emptyLog(), tasks: [task(1, 'mine')] }, meta, remote({ tasks: [theirs] }), NOW, false);
    expect(result.tasks[0].text).toBe('theirs');
    expect(result.push.tasks).toEqual([]);
  });

  it('lets a delete in the account win over an edit here', () => {
    const meta = seen(emptyMeta('u1'), [remoteTask(task(1, 'old'), 100)]);
    const result = reconcile({ log: emptyLog(), tasks: [task(1, 'edited here')] }, meta, remote({ tasks: [tomb(1, 50)] }), NOW, false);
    expect(result.tasks).toEqual([]);
    expect(result.meta.tasks['1']).toBeUndefined();
  });

  it('sends a small tombstone for a task deleted here, and remembers it until confirmed', () => {
    const meta = seen(emptyMeta('u1'), [remoteTask(task(1, 'old'), 100)]);
    const result = reconcile({ log: emptyLog(), tasks: [] }, meta, emptyRemote(), NOW, false);
    expect(result.push.tasks).toEqual([tomb(1, NOW)]);
    expect(result.meta.tasks['1']).toEqual(meta.tasks['1']);
    const confirmed = reconcile({ log: emptyLog(), tasks: [] }, result.meta, remote({ tasks: [tomb(1, NOW)] }), NOW, false);
    expect(confirmed.push.tasks).toEqual([]);
    expect(confirmed.meta.tasks['1']).toBeUndefined();
    expect(confirmed.meta.tombs).toEqual({ 1: NOW });
  });

  it('removes a tombstone from the account after 30 days', () => {
    const meta = { ...emptyMeta('u1'), tombs: { 1: NOW - TOMBSTONE_KEEP_MS - 1, 2: NOW - 1000 } };
    const result = reconcile({ log: emptyLog(), tasks: [] }, meta, emptyRemote(), NOW, false);
    expect(result.push.purge).toEqual([1]);
    expect(result.meta.tombs).toEqual({ 2: NOW - 1000 });
  });

  it('adds a task that is new in the account and ignores a tombstone it never had', () => {
    const result = reconcile({ log: emptyLog(), tasks: [task(1)] }, emptyMeta('u1'), remote({ tasks: [remoteTask(task(2), 100), tomb(3, 100)] }), NOW, false);
    expect(result.tasks.map((item) => item.id)).toEqual([2, 1]);
  });

  it('drops a task the account no longer has only on a full read', () => {
    const meta = seen(emptyMeta('u1'), [remoteTask(task(1), 100)]);
    expect(reconcile({ log: emptyLog(), tasks: [task(1)] }, meta, emptyRemote(), NOW, false).tasks).toHaveLength(1);
    expect(reconcile({ log: emptyLog(), tasks: [task(1)] }, meta, emptyRemote(), NOW, true).tasks).toEqual([]);
  });

  it('makes a subtask whose task is gone a task of its own', () => {
    const sub = task(2, 'sub', { parentId: 1 });
    const result = reconcile({ log: emptyLog(), tasks: [] }, emptyMeta('u1'), remote({ tasks: [tomb(1, 100), remoteTask(sub, 100)] }), NOW, true);
    expect(result.tasks).toEqual([{ ...sub, parentId: null }]);
  });
});

describe('first sign-in, resets and quiet runs', () => {
  it('adopts the account copy, its reset count and its newest time', () => {
    const copy = remote({
      sessions: [session(2000), session(1000)],
      legacy: [{ d: '2026-11-1', minutes: 30, sessions: 1, tasks: 0 }],
      tasks: [remoteTask(task(1), 100), tomb(2, 100)],
      epoch: 3,
      latest: 777,
    });
    const adopted = adoptRemote(copy, 'u1', NOW);
    expect(adopted.log.sessions.map((item) => item.end)).toEqual([1000, 2000]);
    expect(adopted.tasks).toEqual([task(1)]);
    expect(adopted.meta.epoch).toBe(3);
    expect(adopted.meta.since).toBe(777);
    // The next delta with nothing new changes nothing and sends nothing.
    const again = reconcile({ log: adopted.log, tasks: adopted.tasks }, adopted.meta, emptyRemote(), NOW, false);
    expect(isQuiet({ ...adopted }, again)).toBe(true);
  });

  it('starts the seen lists over on a full read after a reset', () => {
    const meta = { ...emptyMeta('u1', 1), sessions: [session(1000).id] };
    const result = reconcile({ log: log([session(1000), session(4000)]), tasks: [] }, meta, remote({ epoch: 2, latest: 50 }), NOW, true);
    // 1000 was in the old account and is gone; 4000 was never sent and goes up.
    expect(result.log.sessions.map((item) => item.end)).toEqual([4000]);
    expect(result.push.sessions).toEqual([session(4000)]);
    expect(result.meta.epoch).toBe(2);
  });

  it('tells an empty account from one with progress', () => {
    expect(remoteHasProgress(emptyRemote())).toBe(false);
    expect(remoteHasProgress(remote({ tasks: [tomb(1, 1)] }))).toBe(false);
    expect(remoteHasProgress(remote({ sessions: [session(1)] }))).toBe(true);
  });
});
