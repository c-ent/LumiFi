import { DayRecord, ProgressLog, SessionRecord } from './progress-log';
import { Task } from './types';

// How a device's progress and an account's progress are combined. Pure: the
// Firestore side lives in `src/data/progress-remote.ts`, and the caller hands
// the account's records in.
//
// To keep Firestore reads low (fix B, owner 2026-11-13), a device normally
// reads only the records written since its last sync (`SyncMeta.since`), not
// the whole account. So a reconcile gets either:
// - a delta: only what changed. A record missing from it is simply unchanged.
// - a full copy: everything the account holds (first link, a new device, or
//   after the account was reset from another device). Here a record the device
//   once saw that is missing was removed there, and is dropped.
//
// - Sessions and day records are kept once each, by id. One the account has
//   not confirmed is pushed.
// - Tasks: the latest edit wins, and a delete wins over any edit. A deleted
//   task stays in the account as a small tombstone, which is removed after
//   30 days (`TOMBSTONE_KEEP_MS`).
// - Only what matters across devices is synced: a task's open subtask list
//   and its session count are left out (the count comes from the session
//   records, see `withSessionCounts`).
// `SyncMeta` is what the device last saw in the account. The caller passes
// only copies the server has confirmed, so a write that never reached the
// server is never counted as seen.

/** How long a deleted task's tombstone stays in the account. */
export const TOMBSTONE_KEEP_MS = 30 * 24 * 60 * 60 * 1000;

/** A task as the account holds it. A tombstone carries only `id`, `updatedAt` and `deleted`. */
export interface RemoteTask {
  id: number;
  text: string;
  done: boolean;
  doneOn: string | null;
  parentId: number | null;
  date: string | null;
  /** When this copy was written, epoch ms (the writing device's clock). */
  updatedAt: number;
  deleted: boolean;
}

export interface RemoteProgress {
  sessions: SessionRecord[];
  legacy: DayRecord[];
  tasks: RemoteTask[];
  /** The account's reset count, when the reset marker was among the records read. */
  epoch: number | null;
  /** The newest server write time among the records read, epoch ms; 0 when none. */
  latest: number;
}

export interface SyncMeta {
  /** The account this device's progress is linked to. */
  uid: string;
  /** The account's reset count when last seen. A higher one means re-read everything. */
  epoch: number;
  /** Records written at or after this server time are what the next read asks for. */
  since: number;
  /** Session ids seen in the account. */
  sessions: string[];
  /** Day record keys seen in the account. */
  days: string[];
  /** Each live task as last seen in the account: when it was written and its synced content. */
  tasks: Record<string, { stamp: number; sig: string }>;
  /** Tombstones seen, by task id, with their time, so old ones can be removed. */
  tombs: Record<string, number>;
}

export interface SyncPush {
  sessions: SessionRecord[];
  days: DayRecord[];
  tasks: RemoteTask[];
  /** Task ids whose tombstones are older than 30 days and can be deleted. */
  purge: number[];
}

export interface Reconciled {
  log: ProgressLog;
  tasks: Task[];
  meta: SyncMeta;
  push: SyncPush;
}

export function emptyMeta(uid: string, epoch = 0, since = 0): SyncMeta {
  return { uid, epoch, since, sessions: [], days: [], tasks: {}, tombs: {} };
}

export function emptyRemote(): RemoteProgress {
  return { sessions: [], legacy: [], tasks: [], epoch: null, latest: 0 };
}

/** True when the account holds anything worth keeping. */
export function remoteHasProgress(remote: RemoteProgress): boolean {
  return remote.sessions.length > 0 || remote.legacy.length > 0 || remote.tasks.some((task) => !task.deleted);
}

type SyncedFields = Pick<Task, 'text' | 'done' | 'doneOn' | 'parentId' | 'date'>;

/** The synced fields of a task, in a fixed order, to tell whether it changed. */
export function taskSig(task: SyncedFields): string {
  return JSON.stringify([task.text, task.done, task.doneOn, task.parentId, task.date]);
}

/** The account's copy as a device task, keeping what only this device knows. */
function fromRemote(remote: RemoteTask, mine: Task | undefined): Task {
  return {
    id: remote.id,
    text: remote.text,
    done: remote.done,
    doneOn: remote.doneOn,
    parentId: remote.parentId,
    date: remote.date,
    pomos: mine?.pomos ?? 0,
    open: mine?.open ?? false,
  };
}

function toRemote(task: Task, now: number): RemoteTask {
  return {
    id: task.id,
    text: task.text,
    done: task.done,
    doneOn: task.doneOn,
    parentId: task.parentId,
    date: task.date,
    updatedAt: now,
    deleted: false,
  };
}

function tombstone(id: number, now: number): RemoteTask {
  return { id, text: '', done: false, doneOn: null, parentId: null, date: null, updatedAt: now, deleted: true };
}

/** First sign-in, when the account's copy is kept: the device takes it as it is. */
export function adoptRemote(remote: RemoteProgress, uid: string, now: number): Reconciled {
  return reconcile({ log: { sessions: [], legacy: [] }, tasks: [] }, emptyMeta(uid), remote, now, true);
}

/**
 * Combines the device's log and tasks with the account's records (a delta,
 * or a full copy when `full`), and says what to push. `now` stamps a task
 * edited on this device since it was last synced.
 */
export function reconcile(
  local: { log: ProgressLog; tasks: Task[] },
  meta: SyncMeta,
  remote: RemoteProgress,
  now: number,
  full: boolean,
): Reconciled {
  const push: SyncPush = { sessions: [], days: [], tasks: [], purge: [] };

  // Sessions.
  const seenSessions = new Set(meta.sessions);
  const remoteSessions = new Map(remote.sessions.map((record) => [record.id, record]));
  const sessions = new Map<string, SessionRecord>();
  for (const record of local.log.sessions) {
    const there = remoteSessions.has(record.id);
    if (full && !there && seenSessions.has(record.id)) continue; // Removed there.
    sessions.set(record.id, record);
    if (!there && !seenSessions.has(record.id)) push.sessions.push(record);
  }
  for (const [id, record] of remoteSessions) if (!sessions.has(id)) sessions.set(id, record);

  // Day records.
  const seenDays = new Set(meta.days);
  const remoteDays = new Map(remote.legacy.map((record) => [record.d, record]));
  const legacy = new Map<string, DayRecord>();
  for (const record of local.log.legacy) {
    const there = remoteDays.get(record.d);
    if (full && !there && seenDays.has(record.d)) continue;
    // The account's copy wins on a clash.
    legacy.set(record.d, there ?? record);
    if (!there && !seenDays.has(record.d)) push.days.push(record);
  }
  for (const [d, record] of remoteDays) if (!legacy.has(d)) legacy.set(d, record);

  // Tasks.
  const remoteTasks = new Map(remote.tasks.map((task) => [String(task.id), task]));
  const localTasks = new Map(local.tasks.map((task) => [String(task.id), task]));
  const kept = new Map<string, Task>();
  const nextMeta: SyncMeta['tasks'] = {};
  const tombs: SyncMeta['tombs'] = full ? {} : { ...meta.tombs };
  for (const task of remote.tasks) if (task.deleted) tombs[String(task.id)] = task.updatedAt;

  for (const [id, mine] of localTasks) {
    const theirs = remoteTasks.get(id);
    const known = meta.tasks[id];
    const edited = !known || known.sig !== taskSig(mine);
    if (theirs?.deleted) continue; // The delete wins.
    if (theirs) {
      const remoteEdited = !known || theirs.updatedAt > known.stamp;
      if (edited && taskSig(mine) !== taskSig(theirs) && (!remoteEdited || now >= theirs.updatedAt)) {
        // Edited here, and this edit is the latest one. Seen once confirmed.
        push.tasks.push(toRemote(mine, now));
        kept.set(id, mine);
        if (known) nextMeta[id] = known;
      } else {
        kept.set(id, fromRemote(theirs, mine));
        nextMeta[id] = { stamp: theirs.updatedAt, sig: taskSig(theirs) };
      }
      continue;
    }
    if (known && full) continue; // Removed from the account.
    if (edited) push.tasks.push(toRemote(mine, now)); // New here, or edited since the last sync.
    kept.set(id, mine);
    if (known) nextMeta[id] = known;
  }

  // Deleted here since the last sync: the account gets a tombstone, and the
  // task is remembered until the tombstone is confirmed.
  for (const [id, known] of Object.entries(meta.tasks)) {
    if (localTasks.has(id)) continue;
    const theirs = remoteTasks.get(id);
    if (theirs?.deleted) continue;
    if (full && !theirs) continue;
    push.tasks.push(tombstone(Number(id), now));
    nextMeta[id] = known;
  }

  // New in the account.
  const added: Task[] = [];
  for (const [id, theirs] of remoteTasks) {
    if (theirs.deleted || localTasks.has(id) || meta.tasks[id]) continue;
    added.push(fromRemote(theirs, undefined));
    nextMeta[id] = { stamp: theirs.updatedAt, sig: taskSig(theirs) };
  }

  // Tombstones past their 30 days are removed from the account.
  for (const [id, at] of Object.entries(tombs)) {
    if (now - at > TOMBSTONE_KEEP_MS) {
      push.purge.push(Number(id));
      delete tombs[id];
    }
  }

  const ordered: Task[] = [];
  for (const task of local.tasks) {
    const next = kept.get(String(task.id));
    if (next) ordered.push(next);
  }
  added.sort(byNewest);
  const tasks = normaliseTasks([
    ...added.filter((task) => task.parentId == null),
    ...ordered,
    ...added.filter((task) => task.parentId != null),
  ]);

  return {
    log: {
      sessions: [...sessions.values()].sort((a, b) => a.end - b.end),
      legacy: [...legacy.values()],
    },
    tasks,
    meta: {
      uid: meta.uid,
      epoch: full && remote.epoch != null ? remote.epoch : meta.epoch,
      since: Math.max(full ? 0 : meta.since, remote.latest),
      // Only what the account has confirmed. A pushed record joins once a
      // confirmed read includes it, so a push that never lands is sent again.
      sessions: full ? [...remoteSessions.keys()] : union(meta.sessions, remoteSessions.keys()),
      days: full ? [...remoteDays.keys()] : union(meta.days, remoteDays.keys()),
      tasks: nextMeta,
      tombs,
    },
    push,
  };
}

function union(known: string[], more: Iterable<string>): string[] {
  const all = new Set(known);
  for (const item of more) all.add(item);
  return all.size === known.length ? known : [...all];
}

function byNewest(a: Task, b: Task): number {
  return b.id - a.id;
}

/** A subtask whose task is gone becomes a task, so its title is not lost. */
function normaliseTasks(tasks: Task[]): Task[] {
  const parents = new Set(tasks.filter((task) => task.parentId == null).map((task) => task.id));
  return tasks.map((task) => (
    task.parentId != null && !parents.has(task.parentId) ? { ...task, parentId: null } : task
  ));
}

/** True when the reconcile changed nothing on the device and has nothing to push. */
export function isQuiet(
  before: { log: ProgressLog; tasks: Task[]; meta: SyncMeta | null },
  after: Reconciled,
): boolean {
  const { push } = after;
  if (push.sessions.length || push.days.length || push.tasks.length || push.purge.length) return false;
  if (before.log.sessions.length !== after.log.sessions.length) return false;
  if (before.log.legacy.length !== after.log.legacy.length) return false;
  if (before.tasks.length !== after.tasks.length) return false;
  for (let index = 0; index < before.tasks.length; index += 1) {
    const a = before.tasks[index];
    const b = after.tasks[index];
    if (a.id !== b.id || taskSig(a) !== taskSig(b)) return false;
  }
  return JSON.stringify(before.meta) === JSON.stringify(after.meta);
}
