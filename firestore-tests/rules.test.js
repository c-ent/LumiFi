/* global describe, it, beforeAll, afterAll, beforeEach, __dirname */
// Firestore security rules, tested against the local emulator. Run with
// `npm run test:rules`, which starts the emulator (needs Java) and runs this
// file. It never touches the live project: `demo-` project ids are offline.
const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
  where,
} = require('firebase/firestore');

// Refused writes are what most of these tests expect; keep their warnings out.
setLogLevel('error');

let env;
const MINUTE = 60000;

function session(end, minutes, extra = {}) {
  return { id: `s_${end}-${minutes}`, data: { kind: 's', end, minutes, task: null, epoch: 0, at: serverTimestamp(), ...extra } };
}

function day(extra = {}) {
  return { kind: 'd', minutes: 30, sessions: 1, tasks: 0, epoch: 0, at: serverTimestamp(), ...extra };
}

function task(extra = {}) {
  return {
    kind: 't',
    text: 'Read chapter 3',
    done: false,
    doneOn: null,
    parentId: null,
    date: null,
    updatedAt: Date.now(),
    deleted: false,
    epoch: 0,
    at: serverTimestamp(),
    ...extra,
  };
}

function tombstone(extra = {}) {
  return { kind: 't', updatedAt: Date.now(), deleted: true, epoch: 0, at: serverTimestamp(), ...extra };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-wickglow',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const guest = () => env.unauthenticatedContext().firestore();
const rec = (db, uid, id) => doc(db, `users/${uid}/records/${id}`);

describe('ownership (two users)', () => {
  it('lets a user write and read their own records, and ask for only the new ones', async () => {
    const { id, data } = session(Date.now() - MINUTE, 25);
    await assertSucceeds(setDoc(rec(alice(), 'alice', id), data));
    await assertSucceeds(getDoc(rec(alice(), 'alice', id)));
    await assertSucceeds(getDocs(collection(alice(), 'users/alice/records')));
    const since = query(collection(alice(), 'users/alice/records'), where('at', '>=', Timestamp.fromMillis(Date.now() - 60 * MINUTE)));
    const result = await assertSucceeds(getDocs(since));
    if (result.size !== 1) throw new Error(`expected 1 new record, got ${result.size}`);
  });

  it('stops another user reading, writing or deleting them', async () => {
    const end = Date.now() - MINUTE;
    const { id, data } = session(end, 25);
    await setDoc(rec(alice(), 'alice', id), data);
    await assertFails(getDoc(rec(bob(), 'alice', id)));
    await assertFails(getDocs(collection(bob(), 'users/alice/records')));
    const other = session(end + 1, 25);
    await assertFails(setDoc(rec(bob(), 'alice', other.id), other.data));
    await assertFails(deleteDoc(rec(bob(), 'alice', id)));
  });

  it('denies a signed-out visitor', async () => {
    const { id, data } = session(Date.now() - MINUTE, 25);
    await assertFails(setDoc(rec(guest(), 'alice', id), data));
    await assertFails(getDocs(collection(guest(), 'users/alice/records')));
  });

  it('denies anything outside users/{uid}/records', async () => {
    await assertFails(setDoc(doc(alice(), 'leaderboard/alice'), { xp: 1 }));
    await assertFails(setDoc(doc(alice(), 'users/alice'), { xp: 1000000 }));
    await assertFails(setDoc(doc(alice(), 'users/alice/sessions/x'), { end: 1, minutes: 25 }));
    await assertFails(setDoc(rec(alice(), 'alice', 'xp'), { kind: 'x', xp: 1000000, at: serverTimestamp() }));
  });
});

describe('the server time stamp', () => {
  it('refuses a record whose time is not the server time of the write', async () => {
    const end = Date.now() - MINUTE;
    const { id, data } = session(end, 25, { at: Timestamp.fromMillis(Date.now() + 365 * 24 * 60 * MINUTE) });
    await assertFails(setDoc(rec(alice(), 'alice', id), data));
    const missing = session(end, 25);
    delete missing.data.at;
    await assertFails(setDoc(rec(alice(), 'alice', missing.id), missing.data));
  });
});

describe('sessions', () => {
  it('accepts 1 to 180 minutes, with or without a task, and refuses anything else', async () => {
    const end = Date.now() - MINUTE;
    for (const minutes of [1, 180]) {
      const { id, data } = session(end, minutes);
      await assertSucceeds(setDoc(rec(alice(), 'alice', id), data));
    }
    const withTask = session(end - 1, 25, { task: 1731500000000 });
    await assertSucceeds(setDoc(rec(alice(), 'alice', withTask.id), withTask.data));
    for (const minutes of [0, 181, 2.5]) {
      const { id, data } = session(end, minutes);
      await assertFails(setDoc(rec(alice(), 'alice', id), data));
    }
    const badTask = session(end - 2, 25, { task: 'essay' });
    await assertFails(setDoc(rec(alice(), 'alice', badTask.id), badTask.data));
  });

  it('accepts the writer\'s day within 3 days of the end, and refuses any other', async () => {
    const end = Date.now() - MINUTE;
    const keyOf = (ms) => {
      const date = new Date(ms);
      return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
    };
    const DAY = 24 * 60 * MINUTE;
    // Its own day, and a day either side (a time zone far east or west).
    for (const [offset, shift] of [[0, 0], [1, -DAY], [2, DAY]]) {
      const ok = session(end - offset, 25, { day: keyOf(end + shift) });
      await assertSucceeds(setDoc(rec(alice(), 'alice', ok.id), ok.data));
    }
    const far = session(end - 3, 25, { day: keyOf(end - 5 * DAY) });
    await assertFails(setDoc(rec(alice(), 'alice', far.id), far.data));
    const ahead = session(end - 4, 25, { day: keyOf(end + 5 * DAY) });
    await assertFails(setDoc(rec(alice(), 'alice', ahead.id), ahead.data));
    for (const [offset, bad] of [[5, 'today'], [6, 20261114], [7, '2026-13-40'], [8, null]]) {
      const wrong = session(end - offset, 25, { day: bad });
      await assertFails(setDoc(rec(alice(), 'alice', wrong.id), wrong.data));
    }
  });

  it('refuses an end time in the future', async () => {
    const { id, data } = session(Date.now() + 60 * MINUTE, 25);
    await assertFails(setDoc(rec(alice(), 'alice', id), data));
  });

  it('refuses an id that does not match the record, or extra fields', async () => {
    const end = Date.now() - MINUTE;
    const { data } = session(end, 25);
    await assertFails(setDoc(rec(alice(), 'alice', 's_anything'), data));
    const extra = session(end, 25, { xp: 9999 });
    await assertFails(setDoc(rec(alice(), 'alice', extra.id), extra.data));
  });

  it('is create-only: a session cannot be changed, only deleted', async () => {
    const { id, data } = session(Date.now() - MINUTE, 25);
    const ref = rec(alice(), 'alice', id);
    await setDoc(ref, data);
    await assertFails(updateDoc(ref, { minutes: 26, at: serverTimestamp() }));
    await assertFails(setDoc(ref, data));
    await assertSucceeds(deleteDoc(ref));
  });
});

describe('day records', () => {
  it('accepts a day up to 1440 minutes and refuses more', async () => {
    await assertSucceeds(setDoc(rec(alice(), 'alice', 'd_2026-11-3'), day({ minutes: 1440, sessions: 4, tasks: 2 })));
    await assertFails(setDoc(rec(alice(), 'alice', 'd_2026-11-4'), day({ minutes: 1441 })));
    await assertFails(setDoc(rec(alice(), 'alice', 'd_2026-11-5'), day({ sessions: 145 })));
    await assertFails(setDoc(rec(alice(), 'alice', 'd_2026-11-6'), day({ minutes: -1 })));
  });

  it('refuses a bad day key and is create-only', async () => {
    await assertFails(setDoc(rec(alice(), 'alice', 'd_yesterday'), day()));
    const ref = rec(alice(), 'alice', 'd_2026-11-3');
    await setDoc(ref, day());
    await assertFails(setDoc(ref, day({ minutes: 1440 })));
  });
});

describe('tasks', () => {
  it('accepts a task and its edits', async () => {
    const ref = rec(alice(), 'alice', 't_1731500000000');
    await assertSucceeds(setDoc(ref, task()));
    await assertSucceeds(setDoc(ref, task({ done: true, doneOn: '2026-11-3' })));
  });

  it('refuses a bad shape, including the fields that are not synced', async () => {
    await assertFails(setDoc(rec(alice(), 'alice', 't_abc'), task()));
    await assertFails(setDoc(rec(alice(), 'alice', 't_1'), task({ text: '' })));
    await assertFails(setDoc(rec(alice(), 'alice', 't_1'), task({ text: 'x'.repeat(201) })));
    await assertFails(setDoc(rec(alice(), 'alice', 't_1'), task({ xp: 50 })));
    await assertFails(setDoc(rec(alice(), 'alice', 't_1'), task({ pomos: 3 })));
    await assertFails(setDoc(rec(alice(), 'alice', 't_1'), task({ open: true })));
    await assertFails(setDoc(rec(alice(), 'alice', 't_1'), task({ updatedAt: Date.now() + 60 * MINUTE })));
  });

  it('keeps a deleted task deleted, and lets its small tombstone be cleared', async () => {
    const ref = rec(alice(), 'alice', 't_1');
    await setDoc(ref, task());
    await assertSucceeds(setDoc(ref, tombstone()));
    await assertFails(setDoc(ref, task({ text: 'back again' })));
    await assertSucceeds(deleteDoc(ref));
  });

  it('refuses a tombstone that carries task fields', async () => {
    await assertFails(setDoc(rec(alice(), 'alice', 't_2'), { ...tombstone(), text: 'hidden' }));
  });

  it('lets a tombstone carry the day its task was finished, gained once and never lost', async () => {
    await assertFails(setDoc(rec(alice(), 'alice', 't_3'), tombstone({ doneOn: 'soon' })));
    await assertFails(setDoc(rec(alice(), 'alice', 't_3'), tombstone({ doneOn: null })));
    await assertSucceeds(setDoc(rec(alice(), 'alice', 't_3'), tombstone({ doneOn: '2026-11-3' })));
    // Neither changed nor dropped.
    await assertFails(setDoc(rec(alice(), 'alice', 't_3'), tombstone({ doneOn: '2026-11-4' })));
    await assertFails(setDoc(rec(alice(), 'alice', 't_3'), tombstone()));
    // A plain tombstone may gain it once.
    const ref = rec(alice(), 'alice', 't_4');
    await setDoc(ref, tombstone());
    await assertSucceeds(setDoc(ref, tombstone({ doneOn: '2026-11-3' })));
    await assertFails(setDoc(ref, tombstone({ doneOn: '2026-11-4' })));
    // A live task becomes one with it too.
    const live = rec(alice(), 'alice', 't_5');
    await setDoc(live, task({ done: true, doneOn: '2026-11-3' }));
    await assertSucceeds(setDoc(live, tombstone({ doneOn: '2026-11-3' })));
  });

  it('keeps the latest task edit: an older one is refused, a delete always wins', async () => {
    const ref = rec(alice(), 'alice', 't_6');
    const at = Date.now() - 10 * MINUTE;
    await setDoc(ref, task({ updatedAt: at }));
    await assertFails(setDoc(ref, task({ text: 'older', updatedAt: at - MINUTE })));
    await assertSucceeds(setDoc(ref, task({ text: 'same time', updatedAt: at })));
    await assertSucceeds(setDoc(ref, task({ text: 'newer', updatedAt: at + MINUTE })));
    await assertSucceeds(setDoc(ref, tombstone({ updatedAt: at - 5 * MINUTE })));
  });
});

describe('the reset count', () => {
  it('starts at 1 or more and only goes up', async () => {
    const ref = rec(alice(), 'alice', 'reset');
    await assertFails(setDoc(ref, { kind: 'r', epoch: 0, at: serverTimestamp() }));
    await assertSucceeds(setDoc(ref, { kind: 'r', epoch: 1, at: serverTimestamp() }));
    await assertSucceeds(setDoc(ref, { kind: 'r', epoch: 2, at: serverTimestamp() }));
    await assertFails(setDoc(ref, { kind: 'r', epoch: 2, at: serverTimestamp() }));
    await assertFails(setDoc(ref, { kind: 'r', epoch: 1, at: serverTimestamp() }));
  });

  it('cannot be deleted, so it cannot be started over lower', async () => {
    const ref = rec(alice(), 'alice', 'reset');
    await assertSucceeds(setDoc(ref, { kind: 'r', epoch: 2, at: serverTimestamp() }));
    await assertSucceeds(getDoc(ref));
    await assertFails(deleteDoc(ref));
    await assertFails(setDoc(ref, { kind: 'r', epoch: 1, at: serverTimestamp() }));
  });

  it('refuses a record without the reset count, or with another than the account has', async () => {
    const end = Date.now() - MINUTE;
    const missing = session(end, 25);
    delete missing.data.epoch;
    await assertFails(setDoc(rec(alice(), 'alice', missing.id), missing.data));
    const ahead = session(end, 25, { epoch: 1 });
    await assertFails(setDoc(rec(alice(), 'alice', ahead.id), ahead.data));
    await assertFails(setDoc(rec(alice(), 'alice', 'd_2026-11-3'), day({ epoch: '0' })));
  });

  it('after a reset, refuses records from before it and accepts ones from after', async () => {
    await setDoc(rec(alice(), 'alice', 'reset'), { kind: 'r', epoch: 1, at: serverTimestamp() });
    const end = Date.now() - MINUTE;
    const old = session(end, 25);
    await assertFails(setDoc(rec(alice(), 'alice', old.id), old.data));
    await assertFails(setDoc(rec(alice(), 'alice', 't_1'), task()));
    await assertFails(setDoc(rec(alice(), 'alice', 'd_2026-11-3'), day()));
    const fresh = session(end, 25, { epoch: 1 });
    await assertSucceeds(setDoc(rec(alice(), 'alice', fresh.id), fresh.data));
    await assertSucceeds(setDoc(rec(alice(), 'alice', 't_1'), task({ epoch: 1 })));
  });

  it('lets a record left from before a reset be written over, but not one from after', async () => {
    const end = Date.now() - MINUTE;
    const old = session(end, 25);
    await setDoc(rec(alice(), 'alice', old.id), old.data);
    await setDoc(rec(alice(), 'alice', 't_1'), tombstone());
    await setDoc(rec(alice(), 'alice', 'reset'), { kind: 'r', epoch: 1, at: serverTimestamp() });
    // The same session again, and the old tombstone's task back, under the new reset.
    await assertSucceeds(setDoc(rec(alice(), 'alice', old.id), { ...old.data, epoch: 1 }));
    await assertSucceeds(setDoc(rec(alice(), 'alice', 't_1'), task({ epoch: 1 })));
    // Now from this reset: create-only again, and a delete still wins.
    await assertFails(setDoc(rec(alice(), 'alice', old.id), { ...old.data, epoch: 1 }));
    await assertSucceeds(setDoc(rec(alice(), 'alice', 't_1'), tombstone({ epoch: 1 })));
    await assertFails(setDoc(rec(alice(), 'alice', 't_1'), task({ epoch: 1 })));
  });
});
