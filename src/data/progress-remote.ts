import {
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  onSnapshot,
  query,
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
//                                           or its tombstone { kind: 't', deleted: true, updatedAt, at }
//   users/{uid}/records/reset              { kind: 'r', epoch, at }, raised when a device's progress replaces the account's
//
// `at` is the server's write time on every record; a device asks only for
// records with `at` at or after its last sync. Every record read is checked
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
    return { id, text: '', done: false, doneOn: null, parentId: null, date: null, updatedAt: data.updatedAt, deleted: true };
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

function readRecords(docs: QueryDocumentSnapshot<DocumentData>[]): RemoteProgress {
  const sessions: SessionRecord[] = [];
  const legacy: DayRecord[] = [];
  const tasks: RemoteTask[] = [];
  let epoch: number | null = null;
  let latest = 0;
  for (const item of docs) {
    const data = item.data();
    latest = Math.max(latest, readAt(data));
    const id = item.id;
    if (id === RESET_ID) {
      if (isCount(data.epoch, Number.MAX_SAFE_INTEGER)) epoch = data.epoch;
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
  return { sessions, legacy, tasks, epoch, latest };
}

/** Everything the account holds, read from the server (not a cache). Throws when offline. */
export async function fetchProgress(uid: string): Promise<RemoteProgress> {
  const { db, path } = records(uid);
  const snapshot = await getDocsFromServer(collection(db, path));
  return readRecords(snapshot.docs);
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
  return onSnapshot(
    source,
    { includeMetadataChanges: true },
    (snapshot: QuerySnapshot<DocumentData>) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      onConfirmed(readRecords(snapshot.docs));
    },
    onError,
  );
}

/** Sends each record on its own, and removes old tombstones. Resolves with how many were refused. */
export async function pushProgress(uid: string, push: SyncPush): Promise<number> {
  if (!getFirebase()) return 0;
  const { db, path } = records(uid);
  const at = serverTimestamp();
  const writes: Promise<void>[] = [];
  for (const record of push.sessions) {
    writes.push(setDoc(doc(db, path, `s_${record.id}`), { kind: 's', end: record.end, minutes: record.minutes, task: record.task, at }));
  }
  for (const record of push.days) {
    writes.push(setDoc(doc(db, path, `d_${record.d}`), { kind: 'd', minutes: record.minutes, sessions: record.sessions, tasks: record.tasks, at }));
  }
  for (const task of push.tasks) {
    const ref = doc(db, path, `t_${task.id}`);
    writes.push(task.deleted
      ? setDoc(ref, { kind: 't', deleted: true, updatedAt: task.updatedAt, at })
      : setDoc(ref, {
        kind: 't',
        text: task.text,
        done: task.done,
        doneOn: task.doneOn,
        parentId: task.parentId,
        date: task.date,
        updatedAt: task.updatedAt,
        deleted: false,
        at,
      }));
  }
  for (const id of push.purge) writes.push(deleteDoc(doc(db, path, `t_${id}`)));
  const results = await Promise.allSettled(writes);
  return results.filter((result) => result.status === 'rejected').length;
}

/**
 * Replaces the account's progress with nothing, for when the user keeps this
 * device's progress over the account's: deletes every record, then raises
 * the reset marker so other devices read everything again. Resolves with the
 * new reset count. Throws when offline.
 */
export async function resetProgress(uid: string): Promise<number> {
  const { db, path } = records(uid);
  const snapshot = await getDocsFromServer(collection(db, path));
  const current = readRecords(snapshot.docs).epoch ?? 0;
  await Promise.all(snapshot.docs.filter((item) => item.id !== RESET_ID).map((item) => deleteDoc(item.ref)));
  const epoch = current + 1;
  await setDoc(doc(db, path, RESET_ID), { kind: 'r', epoch, at: serverTimestamp() });
  return epoch;
}
