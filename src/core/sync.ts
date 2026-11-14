import { DayRecord, FinishedRecord, ProgressLog, SessionRecord } from './progress-log';
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
// - Tasks: the latest edit wins, and a delete wins over any edit. An edit
//   carries the time it was made on its device (`SyncMeta.edits`), not the
//   time it was sent, so an edit made offline does not beat a newer one. A
//   deleted task stays in the account as a small tombstone, which is removed
//   after 30 days (`TOMBSTONE_KEEP_MS`).
// - A finished task that is deleted keeps its credit: its tombstone carries
//   the day it was finished (`doneOn`) and is kept, not removed after 30 days.
//   A tombstone can gain that day once and never lose it.
// - Only what matters across devices is synced: a task's open subtask list
//   and its session count are left out (the count comes from the session
//   records, see `withSessionCounts`).
// `SyncMeta` is what the device last saw in the account. The caller passes
// only copies the server has confirmed, so a write that never reached the
// server is never counted as seen.

/** How long a deleted task's tombstone stays in the account. */
export const TOMBSTONE_KEEP_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * A task as the account holds it. A tombstone carries only `id`, `updatedAt`
 * and `deleted`, plus `doneOn` when the task was finished before it was deleted.
 */
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
  /**
   * When the account received it (server time), on a copy read from the
   * account. A tombstone's 30 days run from here, so a delete sent long after
   * it was made is still kept long enough for other devices to see it.
   */
  writtenAt?: number;
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
  /**
   * Each live task as last seen in the account: when it was written and its
   * synced content. `sentDoneAt`: the time of the newest finished copy this
   * device sent and the account has not confirmed, so a finished copy there
   * from that time is our own, and only a newer one is another device's.
   */
  tasks: Record<string, KnownTask>;
  /** Tombstones seen, by task id, with their time, so old ones can be removed. */
  tombs: Record<string, number>;
  /**
   * When this device last had a confirmed read, on its own clock. Away longer
   * than tombstones are kept means a full read (`since` cannot tell: it stays
   * old while nobody writes). Missing on a link from before it existed.
   */
  checked?: number;
  /** Ids of deleted finished tasks whose credit was seen in the account. */
  finished?: string[];
  /**
   * When each task edit not yet confirmed by the account was made, on this
   * device's clock, by task id. Sent as the edit's `updatedAt` and compared
   * with the account's copy, so the latest edit wins however late it is sent.
   */
  edits?: Record<string, number>;
}

export interface KnownTask {
  stamp: number;
  sig: string;
  sentDoneAt?: number;
}

export interface SyncPush {
  sessions: SessionRecord[];
  days: DayRecord[];
  tasks: RemoteTask[];
  /** Task ids whose tombstones are older than 30 days and can be deleted. */
  purge: number[];
  /**
   * For a tombstone sent without credit, by task id: the newest of the last
   * copy this device saw and any finish it sent itself. A finish stored in the
   * account counts only if it is newer (another device's, unseen here); one
   * this device saw or sent and then undid stays undone. Missing: never take
   * the stored finish.
   */
  creditAfter?: Record<string, number>;
}

export interface Reconciled {
  log: ProgressLog;
  tasks: Task[];
  meta: SyncMeta;
  push: SyncPush;
}

/**
 * A task this device sent and the account has not confirmed yet. It counts as
 * edited (its sig matches nothing) and older than any copy the account holds.
 */
const UNCONFIRMED = { stamp: -1, sig: '' } as const;

/**
 * A known task with an edit sent and not confirmed yet. Its sig matches
 * nothing, so it stays edited here until a confirmed read settles it: undoing
 * back to the last confirmed text before then is still a local edit, and the
 * confirmation of the sent copy cannot replace it. It also remembers the time
 * of the newest finished copy sent since (`sentDoneAt`, the time it was sent
 * with), so a later delete can tell our own finish from another device's.
 */
function sent(known: KnownTask | undefined, mine: Task, at: number): KnownTask {
  const base = known ?? UNCONFIRMED;
  const doneAt = mine.done ? Math.max(known?.sentDoneAt ?? at, at) : known?.sentDoneAt;
  return { stamp: base.stamp, sig: '', ...(doneAt != null ? { sentDoneAt: doneAt } : {}) };
}

export function emptyMeta(uid: string, epoch = 0, since = 0): SyncMeta {
  return { uid, epoch, since, sessions: [], days: [], tasks: {}, tombs: {} };
}

export function emptyRemote(): RemoteProgress {
  return { sessions: [], legacy: [], tasks: [], epoch: null, latest: 0 };
}

/** True when the account holds anything worth keeping. */
export function remoteHasProgress(remote: RemoteProgress): boolean {
  return remote.sessions.length > 0 || remote.legacy.length > 0 || remote.tasks.some((task) => !task.deleted || task.doneOn != null);
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

function tombstone(id: number, now: number, doneOn: string | null = null): RemoteTask {
  return { id, text: '', done: false, doneOn, parentId: null, date: null, updatedAt: now, deleted: true };
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

  // Deleted finished tasks, kept once each by task id, like sessions. The
  // account's copy is the task's tombstone with `doneOn`.
  const seenFinished = new Set(meta.finished ?? []);
  const remoteFinished = new Map<string, string>();
  for (const task of remote.tasks) if (task.deleted && task.doneOn) remoteFinished.set(String(task.id), task.doneOn);
  const finished = new Map<string, FinishedRecord>();
  for (const record of local.log.finished ?? []) {
    const id = String(record.task);
    const there = remoteFinished.get(id);
    if (full && there == null && seenFinished.has(id)) continue; // Removed there.
    finished.set(id, there != null ? { task: record.task, d: there } : record);
  }
  for (const [id, d] of remoteFinished) if (!finished.has(id)) finished.set(id, { task: Number(id), d });

  // Tasks.
  const remoteTasks = new Map(remote.tasks.map((task) => [String(task.id), task]));
  const localTasks = new Map(local.tasks.map((task) => [String(task.id), task]));
  const kept = new Map<string, Task>();
  const nextMeta: SyncMeta['tasks'] = {};
  const tombs: SyncMeta['tombs'] = full ? {} : { ...meta.tombs };
  for (const task of remote.tasks) {
    if (!task.deleted) continue;
    // A tombstone with credit is kept for good, so it is not timed out. One
    // without is timed from when the account received it.
    if (task.doneOn) delete tombs[String(task.id)];
    else tombs[String(task.id)] = task.writtenAt || task.updatedAt;
  }
  // When each edit was made, kept until the account confirms it or another
  // copy wins. Never later than now: the rules refuse a time in the future.
  const edits = meta.edits ?? {};
  const nextEdits: Record<string, number> = {};
  const editTime = (id: string) => Math.min(edits[id] ?? now, now);
  const keepEdit = (id: string) => {
    if (edits[id] != null) nextEdits[id] = edits[id];
  };

  for (const [id, mine] of localTasks) {
    const theirs = remoteTasks.get(id);
    const known = meta.tasks[id];
    const edited = edits[id] != null || !known || known.sig !== taskSig(mine);
    if (theirs?.deleted) {
      // The delete wins. A finish made here that the account had not seen
      // keeps its credit, which the tombstone then gains below.
      if (edited && mine.parentId == null && mine.done && mine.doneOn && !finished.has(id)) {
        finished.set(id, { task: mine.id, d: mine.doneOn });
      }
      continue;
    }
    if (theirs) {
      const remoteEdited = !known || theirs.updatedAt > known.stamp;
      // A copy there that matches this one but is older than the edit waiting
      // here (an undo back to it) does not settle the edit: the edit still has
      // to reach the account, or a newer copy sent before it would win.
      const olderMatch = edits[id] != null && theirs.updatedAt < editTime(id);
      if (edited && (taskSig(mine) !== taskSig(theirs) || olderMatch) && (!remoteEdited || editTime(id) >= theirs.updatedAt)) {
        // Edited here, and this edit is the latest one. Seen once confirmed.
        push.tasks.push(toRemote(mine, editTime(id)));
        keepEdit(id);
        kept.set(id, mine);
        // As with a new task: remembered as sent, so a delete before the
        // account confirms this edit still sends a tombstone.
        nextMeta[id] = sent(known, mine, editTime(id));
      } else {
        kept.set(id, fromRemote(theirs, mine));
        nextMeta[id] = { stamp: theirs.updatedAt, sig: taskSig(theirs) };
      }
      continue;
    }
    if (known && known.stamp !== UNCONFIRMED.stamp && full) continue; // Removed from the account.
    if (edited) {
      // New here, or edited since the last sync.
      push.tasks.push(toRemote(mine, editTime(id)));
      keepEdit(id);
    }
    kept.set(id, mine);
    // A task new here is remembered as sent, so deleting it before the account
    // confirms it still sends a tombstone, and the confirmation cannot bring it back.
    nextMeta[id] = edited ? sent(known, mine, editTime(id)) : known;
  }

  // Deleted here since the last sync: the account gets a tombstone (with the
  // day it was finished, if it was), and the task is remembered until the
  // tombstone is confirmed.
  const tombstoned = new Set<string>();
  for (const [id, known] of Object.entries(meta.tasks)) {
    if (localTasks.has(id)) continue;
    const theirs = remoteTasks.get(id);
    if (theirs?.deleted) continue;
    if (full && !theirs && known.stamp !== UNCONFIRMED.stamp) continue;
    // The credit this device holds, else a finish from another device that
    // the account's copy shows: the delete wins, the finish keeps its day. A
    // finish this device already saw does not count: the task was reopened
    // here before it was deleted. A finish this device sent and has not seen
    // confirmed is excluded by its time, so a newer finish from another device
    // still counts; an unconfirmed title edit does not block anything.
    const creditAfter = Math.max(known.stamp, known.sentDoneAt ?? known.stamp);
    const remoteCredit = theirs && theirs.updatedAt > creditAfter
      && theirs.parentId == null && theirs.done && theirs.doneOn ? theirs.doneOn : null;
    const credit = finished.get(id)?.d ?? remoteCredit;
    if (credit && !finished.has(id)) finished.set(id, { task: Number(id), d: credit });
    push.tasks.push(tombstone(Number(id), editTime(id), credit));
    if (!credit) (push.creditAfter ??= {})[id] = creditAfter;
    tombstoned.add(id);
    nextMeta[id] = known;
    keepEdit(id);
  }

  // Credit the account has not seen yet: a finished task deleted before it was
  // ever synced, or one whose tombstone there has no `doneOn` (the rules let a
  // tombstone gain it once).
  for (const [id, record] of finished) {
    if (tombstoned.has(id) || remoteFinished.has(id) || seenFinished.has(id) || kept.has(id)) continue;
    push.tasks.push(tombstone(record.task, editTime(id), record.d));
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
    // Its tombstone is about to gain credit, and is then kept.
    if (finished.has(id)) {
      delete tombs[id];
      continue;
    }
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
      ...(finished.size > 0 || local.log.finished ? { finished: [...finished.values()] } : {}),
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
      ...(meta.checked != null ? { checked: meta.checked } : {}),
      ...finishedSeen(meta, remoteFinished, full),
      ...(Object.keys(nextEdits).length > 0 ? { edits: nextEdits } : {}),
    },
    push,
  };
}

/** Credit seen in the account, like the session ids: only what a confirmed read showed. */
function finishedSeen(meta: SyncMeta, remote: Map<string, string>, full: boolean): Pick<SyncMeta, 'finished'> {
  const seen = full ? [...remote.keys()] : union(meta.finished ?? [], remote.keys());
  return seen.length > 0 ? { finished: seen } : {};
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
  if ((before.log.finished?.length ?? 0) !== (after.log.finished?.length ?? 0)) return false;
  if (before.tasks.length !== after.tasks.length) return false;
  for (let index = 0; index < before.tasks.length; index += 1) {
    const a = before.tasks[index];
    const b = after.tasks[index];
    if (a.id !== b.id || taskSig(a) !== taskSig(b)) return false;
  }
  return JSON.stringify(before.meta) === JSON.stringify(after.meta);
}
