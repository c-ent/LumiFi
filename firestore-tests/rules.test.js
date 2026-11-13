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
  return { id: `s_${end}-${minutes}`, data: { kind: 's', end, minutes, task: null, at: serverTimestamp(), ...extra } };
}

function day(extra = {}) {
  return { kind: 'd', minutes: 30, sessions: 1, tasks: 0, at: serverTimestamp(), ...extra };
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
    at: serverTimestamp(),
    ...extra,
  };
}

function tombstone() {
  return { kind: 't', updatedAt: Date.now(), deleted: true, at: serverTimestamp() };
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
});
