import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { MAX_DAY_MINUTES, MAX_DAY_TASKS, sessionRecord, type DayRecord, type SessionRecord } from '@/src/core/progress-log';
import type { RemoteProgress, RemoteTask, SyncPush } from '@/src/core/sync';
import { cleanTitle, parseDueDate } from '@/src/core/tasks';
import { getFirebase } from './firebase';

// The account's progress in Firestore. Everything is one collection, so
// "anything new since my last sync?" is a single query (Firestore charges at
// least one read per query, even an empty one). Rules: firestore.rules.
//
//   users/{uid}/records/s_{end}-{minutes}  a session   { kind: 's', end, minutes, task, at }   create-only
//   users/{uid}/records/d_{calendarKey}    a pre-sync day total { kind: 'd', minutes, sessions, tasks, at }   create-only
//   users/{uid}/records/t_{taskId}         a task      { kind: 't', text, done, doneOn, parentId, date, updatedAt, deleted: false, at }
//                                           or its tombstone { kind: 't', deleted: true, updatedAt, at }, plus doneOn if it was finished
//   users/{uid}/records/reset              { kind: 'r', epoch, at }, raised when a device's progress replaces the account's
//
// `at` is the server's write time on every record; a device asks only for
// records with `at` at or after its last sync. Every s/d/t record also carries
// `epoch`, the reset it was written under, which the rules check against the
// marker; records from an older reset are ignored and cleared. Every record read is checked
// before it reaches the app. Writes go one by one, not in a batch, so one
// refused write cannot take the others down with it.

const DAY_KEY = /^\d{4}-\d{1,2}-\d{1,2}$/;
const RESET_ID = 'reset';

function records(uid: string) {
  const client = getFirebase();
  if (!client) throw new Error('Accounts are not available in this build.');
  return { db: client.db, path: `users/${uid}/records` };
}

function isCount(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
}

function readAt(data: DocumentData): number {
  return data.at instanceof Timestamp ? data.at.toMillis() : 0;
}

function readTask(id: number, data: DocumentData): RemoteTask | null {
  if (typeof data.updatedAt !== 'number' || !Number.isFinite(data.updatedAt)) return null;
  if (data.deleted === true) {
    // `doneOn` on a tombstone: the task was finished, and keeps its credit.
    const doneOn = typeof data.doneOn === 'string' && DAY_KEY.test(data.doneOn) ? data.doneOn : null;
    return { id, text: '', done: false, doneOn, parentId: null, date: null, updatedAt: data.updatedAt, deleted: true };
  }
  const text = typeof data.text === 'string' ? cleanTitle(data.text) : null;
  if (!text || typeof data.done !== 'boolean') return null;
  return {
    id,
    text,
    done: data.done,
    doneOn: typeof data.doneOn === 'string' && DAY_KEY.test(data.doneOn) ? data.doneOn : null,
    parentId: typeof data.parentId === 'number' && Number.isSafeInteger(data.parentId) ? data.parentId : null,
    date: typeof data.date === 'string' ? parseDueDate(data.date) : null,
    updatedAt: data.updatedAt,
    deleted: false,
  };
}

/** The reset a record was written under. Records from before epochs existed count as 0. */
function recordEpoch(data: DocumentData): number {
  return isCount(data.epoch, Number.MAX_SAFE_INTEGER) ? data.epoch : 0;
}

/**
 * The records read, as progress. When the reset marker is among them, a record
 * written under an older reset is left out (and listed in `stale`, to be
 * cleared): the reset raised the marker first, so those are already gone as
 * far as every device is concerned. When the marker is not among them (a
 * delta after the last reset), every record is from the current reset, since
 * the rules refuse any other.
 */
function readRecords(docs: QueryDocumentSnapshot<DocumentData>[]): { progress: RemoteProgress; stale: QueryDocumentSnapshot<DocumentData>[] } {
  const sessions: SessionRecord[] = [];
  const legacy: DayRecord[] = [];
  const tasks: RemoteTask[] = [];
  const stale: QueryDocumentSnapshot<DocumentData>[] = [];
  let epoch: number | null = null;
  let latest = 0;
  for (const item of docs) {
    if (item.id !== RESET_ID) continue;
    const data = item.data();
    if (isCount(data.epoch, Number.MAX_SAFE_INTEGER)) epoch = data.epoch;
  }
  for (const item of docs) {
    const data = item.data();
    latest = Math.max(latest, readAt(data));
    const id = item.id;
    if (id === RESET_ID) continue;
    if (epoch != null && recordEpoch(data) !== epoch) {
      stale.push(item);
    } else if (id.startsWith('s_')) {
      const record = typeof data.end === 'number' && typeof data.minutes === 'number'
        ? sessionRecord(data.end, data.minutes, typeof data.task === 'number' ? data.task : null)
        : null;
      if (record && `s_${record.id}` === id) sessions.push(record);
    } else if (id.startsWith('d_')) {
      const d = id.slice(2);
      if (!DAY_KEY.test(d)) continue;
      if (!isCount(data.minutes, MAX_DAY_MINUTES) || !isCount(data.sessions, MAX_DAY_MINUTES / 10) || !isCount(data.tasks, MAX_DAY_TASKS)) continue;
      legacy.push({ d, minutes: data.minutes, sessions: data.sessions, tasks: data.tasks });
    } else if (id.startsWith('t_')) {
      const taskId = Number(id.slice(2));
      if (!Number.isSafeInteger(taskId)) continue;
      const task = readTask(taskId, data);
      if (task) tasks.push(task);
    }
  }
  return { progress: { sessions, legacy, tasks, epoch, latest }, stale };
}

/**
 * Deletes records left from before a reset, best effort. A reset clears them
 * itself; this finishes the job on a later full read if it was cut short.
 * Each delete re-reads the record and the marker in a transaction, so a record
 * rewritten under the current reset since it was read is kept (a concurrent
 * write makes the transaction retry with the new copy).
 * `asked` keeps one listener from asking twice for the same record.
 */
function clearStale(stale: QueryDocumentSnapshot<DocumentData>[], asked = new Set<string>()) {
  for (const item of stale) {
    if (asked.has(item.id)) continue;
    asked.add(item.id);
    const ref = item.ref;
    const marker = doc(ref.parent, RESET_ID);
    runTransaction(ref.firestore, async (transaction) => {
      const current = await transaction.get(marker);
      const record = await transaction.get(ref);
      if (!current.exists() || !record.exists()) return;
      const epoch = recordEpoch(current.data());
      if (recordEpoch(record.data()) !== epoch) transaction.delete(ref);
    }).catch(() => asked.delete(item.id));
  }
}

/** Everything the account holds, read from the server (not a cache). Throws when offline. */
export async function fetchProgress(uid: string): Promise<RemoteProgress> {
  const { db, path } = records(uid);
  const snapshot = await getDocsFromServer(collection(db, path));
  const { progress, stale } = readRecords(snapshot.docs);
  clearStale(stale);
  return progress;
}

/**
 * Calls `onConfirmed` with the records written at or after `since` (server
 * time, epoch ms; 0 reads everything), now and each time more arrive. Only
 * copies the server has confirmed are passed on: not from a cache, and with
 * no write of ours still pending. That is what lets the sync tell "not
 * uploaded yet" from "already in the account" (src/core/sync.ts).
 */
export function listenProgress(
  uid: string,
  since: number,
  onConfirmed: (remote: RemoteProgress) => void,
  onError: (error: unknown) => void,
): () => void {
  if (!getFirebase()) return () => {};
  const { db, path } = records(uid);
  const source = since > 0
    ? query(collection(db, path), where('at', '>=', Timestamp.fromMillis(since)))
    : collection(db, path);
  const asked = new Set<string>();
  return onSnapshot(
    source,
    { includeMetadataChanges: true },
    (snapshot: QuerySnapshot<DocumentData>) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      const { progress, stale } = readRecords(snapshot.docs);
      clearStale(stale, asked);
      onConfirmed(progress);
    },
    onError,
  );
}

/**
 * Sends each record on its own, and removes old tombstones. Every record
 * carries `epoch`, the reset this device last saw: the rules refuse one from
 * an older reset, so a device that has not seen a reset cannot put old
 * progress back. Resolves with how many were refused.
 */
export async function pushProgress(uid: string, push: SyncPush, epoch: number): Promise<number> {
  if (!getFirebase()) return 0;
  const { db, path } = records(uid);
  const at = serverTimestamp();
  const writes: Promise<void>[] = [];
  // Sessions and day records are create-only. Sending one the account already
  // holds (its write landed, but no confirmed read has shown it yet) is refused
  // as an update: that is not a failure, the record is saved. For a day record
  // whose numbers differ, the account's copy wins, as the sync already does
  // (src/core/sync.ts), and the device takes it on its next read.
  const createOnce = (ref: ReturnType<typeof doc>, data: DocumentData) => setDoc(ref, data).catch(async (error: unknown) => {
    if ((error as { code?: unknown } | null)?.code !== 'permission-denied') throw error;
    const existing = await getDocFromServer(ref);
    if (existing.exists() && recordEpoch(existing.data()) === epoch) return;
    throw error;
  });
  for (const record of push.sessions) {
    writes.push(createOnce(doc(db, path, `s_${record.id}`), { kind: 's', end: record.end, minutes: record.minutes, task: record.task, epoch, at }));
  }
  for (const record of push.days) {
    writes.push(createOnce(doc(db, path, `d_${record.d}`), { kind: 'd', minutes: record.minutes, sessions: record.sessions, tasks: record.tasks, epoch, at }));
  }
  // A live task edit older than the account's copy is refused (the rules keep
  // the latest edit). That is not a failure: the newer edit is already saved,
  // and the device takes it on its next read.
  const editOnce = (ref: ReturnType<typeof doc>, data: DocumentData) => setDoc(ref, data).catch(async (error: unknown) => {
    if ((error as { code?: unknown } | null)?.code !== 'permission-denied') throw error;
    const existing = await getDocFromServer(ref);
    const stored = existing.exists() ? existing.data() : null;
    if (stored && recordEpoch(stored) === epoch && typeof stored.updatedAt === 'number' && stored.updatedAt > data.updatedAt) return;
    throw error;
  });
  // A delete reads the stored copy in a transaction, so a finish from another
  // device that this one has not read yet keeps its credit: the tombstone takes
  // that day when this device has none. Only a finish newer than the last copy
  // this device saw (`creditAfter`) counts: one it saw and then reopened stays
  // undone. A tombstone already there is left as it is unless this write gives
  // it the day it lacks (the rules allow nothing else), so it counts as saved
  // rather than refused.
  const deleteOnce = (ref: ReturnType<typeof doc>, task: RemoteTask, creditAfter: number | undefined) => runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    const stored = existing.exists() && recordEpoch(existing.data()) === epoch ? existing.data() : null;
    if (stored?.deleted === true && (stored.doneOn != null || !task.doneOn)) return;
    const storedCredit = stored && creditAfter != null && stored.deleted === false && stored.done === true && stored.parentId == null
      && typeof stored.updatedAt === 'number' && stored.updatedAt > creditAfter
      && typeof stored.doneOn === 'string' && DAY_KEY.test(stored.doneOn) ? stored.doneOn : null;
    const doneOn = task.doneOn ?? storedCredit;
    transaction.set(ref, {
      kind: 't',
      deleted: true,
      updatedAt: task.updatedAt,
      // A finished task keeps its credit: the day it was finished.
      ...(doneOn ? { doneOn } : {}),
      epoch,
      at,
    });
  });
  for (const task of push.tasks) {
    const ref = doc(db, path, `t_${task.id}`);
    writes.push(task.deleted
      ? deleteOnce(ref, task, push.creditAfter?.[String(task.id)])
      : editOnce(ref, {
        kind: 't',
        text: task.text,
        done: task.done,
        doneOn: task.doneOn,
        parentId: task.parentId,
        date: task.date,
        updatedAt: task.updatedAt,
        deleted: false,
        epoch,
        at,
      }));
  }
  // An old tombstone is deleted only if it is still a tombstone without credit
  // when the transaction reads it (a record written over after a reset, or a
  // tombstone that gained a finished day meanwhile, is kept).
  for (const id of push.purge) {
    const ref = doc(db, path, `t_${id}`);
    writes.push(runTransaction(db, async (transaction) => {
      const current = await transaction.get(ref);
      if (current.exists() && current.data().deleted === true && current.data().doneOn == null) transaction.delete(ref);
    }));
  }
  const results = await Promise.allSettled(writes);
  return results.filter((result) => result.status === 'rejected').length;
}

/**
 * Replaces the account's progress with nothing, for when the user keeps this
 * device's progress over the account's. The switch is one write: raising the
 * reset marker. From then on every device ignores records from an older reset
 * and the rules refuse new ones, so a reset cut short later never leaves a
 * half-empty account. Other devices see the new marker and read everything
 * again. The old records are then deleted; if that is cut short, the next full
 * read finishes it. Resolves with the new reset count. Throws when offline.
 */
export async function resetProgress(uid: string): Promise<number> {
  const { db, path } = records(uid);
  const marker = doc(db, path, RESET_ID);
  const before = await getDocFromServer(marker);
  const current = before.exists() ? recordEpoch(before.data()) : 0;
  const epoch = current + 1;
  // Refused if another device raised it meanwhile (it may only go up).
  await setDoc(marker, { kind: 'r', epoch, at: serverTimestamp() });
  try {
    const snapshot = await getDocsFromServer(collection(db, path));
    clearStale(readRecords(snapshot.docs).stale);
  } catch {
    // The next full read clears what is left.
  }
  return epoch;
}
