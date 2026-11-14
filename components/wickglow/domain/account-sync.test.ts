import type { DayRecord, SessionRecord } from '@/src/core/progress-log';
import { completeSession, removeTask, toggleTask } from '@/src/core/session';
import { RemoteProgress, RemoteTask, SyncPush } from '@/src/core/sync';
import { addTask, renameTask } from '@/src/core/tasks';
import { AccountSync, createAccountSync, ProgressRemote, SESSION_DELAY_MS, TASK_DELAY_MS } from './account-sync';
import { createInitialState, SavedState } from './saved-state';

// An in-memory account shared by fake devices, shaped like the Firestore
// records collection: every record carries the server time it was written
// (`at`), a listener asks for records at or after a time, and a push lands at
// once and reaches every listener, like Firestore after the server ack.
// `reads` counts what Firestore would charge: a listener's first answer is
// every matching record (at least 1), and after that each changed record.
type Stored =
  | { kind: 's'; at: number; record: SessionRecord }
  | { kind: 'd'; at: number; record: DayRecord }
  | { kind: 't'; at: number; record: RemoteTask }
  | { kind: 'r'; at: number; epoch: number };

function fakeAccount() {
  const records = new Map<string, Stored>();
  const listeners = new Set<{ since: number; onConfirmed: (remote: RemoteProgress) => void }>();
  // The server's clock, a little before the devices' `NOW`, one ms per write.
  let clock = NOW - 3600000;
  let online = true;
  // While `holding`, new pushes wait in `held` instead of landing, like a slow
  // connection. `letThrough` lets later pushes land while held ones still wait.
  let holding = false;
  let held: (() => void)[] = [];
  const counts = { reads: 0, writes: 0 };

  const copy = (since: number): RemoteProgress => {
    const remote: RemoteProgress = { sessions: [], legacy: [], tasks: [], epoch: null, latest: 0 };
    for (const item of records.values()) {
      if (item.at < since) continue;
      remote.latest = Math.max(remote.latest, item.at);
      if (item.kind === 's') remote.sessions.push(item.record);
      else if (item.kind === 'd') remote.legacy.push(item.record);
      else if (item.kind === 't') remote.tasks.push(item.record);
      else remote.epoch = item.epoch;
    }
    return remote;
  };
  const write = (key: string, value: Stored) => {
    records.set(key, value);
    counts.writes += 1;
  };
  const emit = (changed: number) => {
    for (const listener of [...listeners]) {
      counts.reads += changed;
      listener.onConfirmed(copy(listener.since));
    }
  };
  const remote: ProgressRemote = {
    fetch: async () => {
      if (!online) throw new Error('offline');
      counts.reads += Math.max(1, records.size);
      return copy(0);
    },
    listen: (_uid, since, onConfirmed) => {
      const entry = { since, onConfirmed };
      listeners.add(entry);
      if (online) {
        const first = copy(since);
        counts.reads += Math.max(1, first.sessions.length + first.legacy.length + first.tasks.length + (first.epoch != null ? 1 : 0));
        onConfirmed(first);
      }
      return () => listeners.delete(entry);
    },
    push: async (_uid, push: SyncPush) => {
      if (holding) await new Promise<void>((resolve) => held.push(resolve));
      let changed = 0;
      for (const record of push.sessions) {
        if (records.has(`s_${record.id}`)) continue;
        write(`s_${record.id}`, { kind: 's', at: clock++, record });
        changed += 1;
      }
      for (const record of push.days) {
        if (records.has(`d_${record.d}`)) continue;
        write(`d_${record.d}`, { kind: 'd', at: clock++, record });
        changed += 1;
      }
      for (const task of push.tasks) {
        const known = records.get(`t_${task.id}`);
        const stored = known?.kind === 't' ? known.record : null;
        // A tombstone stays one; it may only gain the day its task was finished.
        if (stored?.deleted && !(task.deleted && task.doneOn && !stored.doneOn)) continue;
        // An edit older than the stored one is refused by the rules, and
        // pushProgress counts that as saved (the newer edit is there).
        if (stored && !stored.deleted && !task.deleted && task.updatedAt < stored.updatedAt) continue;
        // A delete keeps the credit of a finish stored there that is newer
        // than the device last saw (pushProgress reads the stored copy in a
        // transaction).
        const after = push.creditAfter?.[String(task.id)];
        const credit = task.deleted && !task.doneOn && after != null && stored && !stored.deleted && stored.done
          && stored.parentId == null && stored.updatedAt > after
          ? stored.doneOn
          : null;
        write(`t_${task.id}`, { kind: 't', at: clock++, record: credit ? { ...task, doneOn: credit } : task });
        changed += 1;
      }
      for (const id of push.purge) {
        records.delete(`t_${id}`);
        counts.writes += 1;
      }
      if (changed > 0) emit(changed);
      return 0;
    },
    reset: async () => {
      if (!online) throw new Error('offline');
      counts.reads += Math.max(1, records.size);
      const before = records.get('reset');
      const epoch = (before?.kind === 'r' ? before.epoch : 0) + 1;
      for (const key of [...records.keys()]) if (key !== 'reset') records.delete(key);
      write('reset', { kind: 'r', at: clock++, epoch });
      emit(1);
      return epoch;
    },
  };
  return {
    remote,
    counts,
    sessions: () => [...records.values()].filter((item) => item.kind === 's').length,
    tasks: () => [...records.values()].filter((item) => item.kind === 't').map((item) => (item as { record: RemoteTask }).record),
    hold: () => {
      holding = true;
    },
    letThrough: () => {
      holding = false;
    },
    release: () => {
      const waiting = held;
      holding = false;
      held = [];
      for (const resolve of waiting) resolve();
    },
    /** Removes a record without telling anyone, like a tombstone cleared after 30 days. */
    drop: (key: string) => records.delete(key),
    setOnline: (value: boolean) => {
      online = value;
    },
  };
}

function fakeStore(state: SavedState) {
  let current = state;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    commit: (next: SavedState) => {
      current = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const NOW = new Date(2026, 10, 13, 18).getTime();

function device(account: ReturnType<typeof fakeAccount>, state = createInitialState(NOW), now: number | (() => number) = NOW) {
  const store = fakeStore(state);
  const timers: { run: () => void; ms: number }[] = [];
  const sync = createAccountSync({
    store,
    remote: account.remote,
    now: typeof now === 'function' ? now : () => now,
    setTimer: (run, ms) => {
      const entry = { run, ms };
      timers.push(entry);
      return entry;
    },
    clearTimer: (id) => {
      const index = timers.indexOf(id as { run: () => void; ms: number });
      if (index >= 0) timers.splice(index, 1);
    },
  });
  // Runs waiting sends, as their delay would.
  const settle = async () => {
    for (let round = 0; round < 5; round += 1) {
      await flush();
      while (timers.length) timers.shift()?.run();
    }
    await flush();
  };
  return { store, sync, settle, timers };
}

async function flush() {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

function withFocus(state: SavedState, end: number, minutes: number): SavedState {
  return completeSession(state, 'focus', end, minutes).state;
}

let syncs: AccountSync[] = [];
afterEach(() => {
  for (const sync of syncs) sync.dispose();
  syncs = [];
});

function track(...devices: { sync: AccountSync }[]) {
  for (const item of devices) syncs.push(item.sync);
}

describe('account sync', () => {
  it('uploads a device to an empty account, and a second device gets the same XP, streak, tasks and history', async () => {
    const account = fakeAccount();
    let state = createInitialState(NOW);
    state = addTask(state, 'Read chapter 3', null, NOW);
    state = { ...state, activeId: state.tasks[0].id };
    state = withFocus(state, NOW - 3 * 3600000, 25);
    const first = device(account, state);
    track(first);
    first.sync.start('u1');
    await first.settle();
    expect(first.sync.status()).toEqual({ phase: 'synced' });
    expect(account.sessions()).toBe(1);
    expect(account.tasks()).toHaveLength(1);

    const second = device(account);
    track(second);
    second.sync.start('u1');
    await second.settle();
    const a = first.store.get();
    const b = second.store.get();
    expect(b.xp).toBe(a.xp);
    expect(b.xp).toBe(50);
    expect(b.streak).toEqual(a.streak);
    expect(b.tasks.map((task) => task.text)).toEqual(['Read chapter 3']);
    expect(b.day.minutes).toBe(25);
    // The session count comes from the session record, not a synced field.
    expect(b.tasks[0].pomos).toBe(1);
  });

  it('carries a later session and a finished task across, both ways', async () => {
    const account = fakeAccount();
    const first = device(account);
    const second = device(account);
    track(first, second);
    first.sync.start('u1');
    await first.settle();
    second.sync.start('u1');
    await second.settle();

    first.store.commit(withFocus(addTask(first.store.get(), 'Essay', null, NOW), NOW - 3600000, 50));
    await first.settle();
    await second.settle();
    const essay = second.store.get().tasks[0];
    expect(essay.text).toBe('Essay');
    second.store.commit(toggleTask(second.store.get(), essay.id, NOW).state);
    await second.settle();
    await first.settle();

    // 50 minutes = 100 XP, + 30 for the task quest.
    expect(first.store.get().tasks[0].done).toBe(true);
    expect(first.store.get().xp).toBe(130);
    expect(second.store.get().xp).toBe(130);
  });

  it('sends a burst of task edits as one write, and a session without waiting for them', async () => {
    const account = fakeAccount();
    const first = device(account);
    track(first);
    first.sync.start('u1');
    await first.settle();
    const writesBefore = account.counts.writes;

    let state = addTask(first.store.get(), 'Draft', null, NOW);
    first.store.commit(state);
    const id = state.tasks[0].id;
    state = renameTask(state, id, 'Draft 2');
    first.store.commit(state);
    state = renameTask(state, id, 'Draft 3');
    first.store.commit(state);
    expect(first.timers.map((timer) => timer.ms)).toEqual([TASK_DELAY_MS]);
    // A finished session pulls the send forward.
    first.store.commit(withFocus(first.store.get(), NOW - 60000, 25));
    expect(first.timers.map((timer) => timer.ms)).toEqual([SESSION_DELAY_MS]);
    await first.settle();
    expect(account.counts.writes - writesBefore).toBe(2);
    expect(account.tasks()[0].text).toBe('Draft 3');
  });

  it('does not write when only the open subtask list changes', async () => {
    const account = fakeAccount();
    const first = device(account, addTask(createInitialState(NOW), 'Plan', null, NOW));
    track(first);
    first.sync.start('u1');
    await first.settle();
    const writesBefore = account.counts.writes;
    const state = first.store.get();
    first.store.commit({ ...state, tasks: state.tasks.map((task) => ({ ...task, open: !task.open })) });
    await first.settle();
    expect(account.counts.writes).toBe(writesBefore);
  });

  it('reads only what is new when the app opens again', async () => {
    const account = fakeAccount();
    let state = createInitialState(NOW);
    for (let index = 0; index < 30; index += 1) state = withFocus(state, NOW - (index + 1) * 3600000, 25);
    const first = device(account, state);
    track(first);
    first.sync.start('u1');
    await first.settle();

    // The app is closed and opened again with the same save: nothing new.
    first.sync.dispose();
    const reopened = device(account, first.store.get());
    track(reopened);
    const readsBefore = account.counts.reads;
    reopened.sync.start('u1');
    await reopened.settle();
    expect(account.counts.reads - readsBefore).toBeLessThanOrEqual(1);
    expect(reopened.store.get().day.minutes).toBe(first.store.get().day.minutes);
  });

  it('reads everything once when the app opens after more than 30 days, so a delete whose tombstone was cleared still lands', async () => {
    const account = fakeAccount();
    const first = device(account, addTask(createInitialState(NOW), 'Old task', null, NOW));
    track(first);
    first.sync.start('u1');
    await first.settle();
    const id = first.store.get().tasks[0].id;
    first.sync.dispose();
    // Deleted elsewhere, and the tombstone cleared 30 days later.
    account.drop(`t_${id}`);

    const DAY = 24 * 3600000;
    const soon = device(account, first.store.get(), NOW + DAY);
    track(soon);
    soon.sync.start('u1');
    await soon.settle();
    // A day later only the new records are read, so the old copy stays.
    expect(soon.store.get().tasks.map((task) => task.id)).toEqual([id]);
    soon.sync.dispose();

    const later = device(account, first.store.get(), NOW + 31 * DAY);
    track(later);
    later.sync.start('u1');
    await later.settle();
    expect(later.store.get().tasks).toEqual([]);
  });

  it('keeps reading only what is new for a device opened regularly, even when nothing was written for over 30 days', async () => {
    const account = fakeAccount();
    let state = addTask(createInitialState(NOW), 'Quiet task', null, NOW);
    for (let index = 0; index < 5; index += 1) state = withFocus(state, NOW - (index + 1) * 3600000, 25);
    const first = device(account, state);
    track(first);
    first.sync.start('u1');
    await first.settle();
    first.sync.dispose();

    const DAY = 24 * 3600000;
    const mid = device(account, first.store.get(), NOW + 20 * DAY);
    track(mid);
    mid.sync.start('u1');
    await mid.settle();
    mid.sync.dispose();

    // 40 days after the last write, but only 20 since this device last looked.
    const later = device(account, mid.store.get(), NOW + 40 * DAY);
    track(later);
    const readsBefore = account.counts.reads;
    later.sync.start('u1');
    await later.settle();
    expect(account.counts.reads - readsBefore).toBeLessThanOrEqual(1);
    expect(later.store.get().tasks.map((task) => task.text)).toEqual(['Quiet task']);
  });

  it('says saving while a change is on its way, and saved once the account has it', async () => {
    const account = fakeAccount();
    const first = device(account);
    track(first);
    first.sync.start('u1');
    await first.settle();
    expect(first.sync.status()).toEqual({ phase: 'synced' });

    account.hold();
    first.store.commit(withFocus(first.store.get(), NOW - 60000, 25));
    await first.settle();
    expect(first.sync.status()).toEqual({ phase: 'saving' });
    account.release();
    await first.settle();
    expect(first.sync.status()).toEqual({ phase: 'synced' });
    expect(account.sessions()).toBe(1);
  });

  it('says saving while a task edit waits to be sent, and saved once it lands', async () => {
    const account = fakeAccount();
    const first = device(account);
    track(first);
    first.sync.start('u1');
    await first.settle();

    first.store.commit(addTask(first.store.get(), 'Waiting', null, NOW));
    expect(first.timers.map((timer) => timer.ms)).toEqual([TASK_DELAY_MS]);
    expect(first.sync.status()).toEqual({ phase: 'saving' });
    // Nothing settled yet: the edit is still queued, so it stays "saving".
    await flush();
    expect(first.sync.status()).toEqual({ phase: 'saving' });
    await first.settle();
    expect(first.sync.status()).toEqual({ phase: 'synced' });
    expect(account.tasks()).toHaveLength(1);
  });

  it('asks which progress to keep when both have some, and the other device follows the reset', async () => {
    const account = fakeAccount();
    const first = device(account, withFocus(createInitialState(NOW), NOW - 3600000, 25));
    track(first);
    first.sync.start('u1');
    await first.settle();

    const second = device(account, withFocus(createInitialState(NOW), NOW - 7200000, 60));
    track(second);
    second.sync.start('u1');
    await second.settle();
    const status = second.sync.status();
    expect(status.phase).toBe('choose');
    if (status.phase !== 'choose') return;
    expect(status.device.minutes).toBe(60);
    expect(status.account.minutes).toBe(25);

    second.sync.choose('device');
    await second.settle();
    await first.settle();
    expect(account.sessions()).toBe(1);
    // The first device saw the reset, read everything once, and dropped its old session.
    expect(first.store.get().day.minutes).toBe(60);
    expect(second.store.get().day.minutes).toBe(60);
  });

  it('takes the account copy when picked', async () => {
    const account = fakeAccount();
    const first = device(account, withFocus(createInitialState(NOW), NOW - 3600000, 25));
    track(first);
    first.sync.start('u1');
    await first.settle();
    const second = device(account, withFocus(createInitialState(NOW), NOW - 7200000, 60));
    track(second);
    second.sync.start('u1');
    await second.settle();
    second.sync.choose('account');
    await second.settle();
    expect(second.store.get().day.minutes).toBe(25);
    expect(account.sessions()).toBe(1);
  });

  it('removes a deleted task everywhere', async () => {
    const account = fakeAccount();
    const first = device(account, addTask(createInitialState(NOW), 'Old', null, NOW));
    const second = device(account);
    track(first, second);
    first.sync.start('u1');
    await first.settle();
    second.sync.start('u1');
    await second.settle();
    expect(second.store.get().tasks).toHaveLength(1);
    first.store.commit({ ...first.store.get(), tasks: [] });
    await first.settle();
    await second.settle();
    expect(second.store.get().tasks).toEqual([]);
    expect(account.tasks()[0].deleted).toBe(true);
  });

  it('keeps the credit of a finished task deleted on one device, on both', async () => {
    const account = fakeAccount();
    const first = device(account, addTask(createInitialState(NOW), 'Essay', null, NOW));
    const second = device(account);
    track(first, second);
    first.sync.start('u1');
    await first.settle();
    second.sync.start('u1');
    await second.settle();
    const id = first.store.get().tasks[0].id;
    first.store.commit(toggleTask(first.store.get(), id, NOW).state);
    await first.settle();
    await second.settle();
    expect(second.store.get().xp).toBe(30);
    first.store.commit(removeTask(first.store.get(), id, NOW).state);
    await first.settle();
    await second.settle();
    expect(second.store.get().tasks).toEqual([]);
    expect(first.store.get().xp).toBe(30);
    expect(second.store.get().xp).toBe(30);
    expect(account.tasks()[0]).toMatchObject({ deleted: true, doneOn: first.store.get().day.d });
  });

  it('lets the newer edit win over an older one sent later', async () => {
    const account = fakeAccount();
    let clock = NOW;
    const first = device(account, addTask(createInitialState(NOW), 'Essay', null, NOW), () => clock);
    const second = device(account, createInitialState(NOW), () => clock);
    track(first, second);
    first.sync.start('u1');
    await first.settle();
    second.sync.start('u1');
    await second.settle();
    const id = first.store.get().tasks[0].id;
    // Edited on the first device while signed out, so it waits.
    first.sync.stop();
    clock += 60_000;
    first.store.commit(renameTask(first.store.get(), id, 'Older edit'));
    // Edited on the second device a minute later, and sent.
    clock += 60_000;
    second.store.commit(renameTask(second.store.get(), id, 'Newer edit'));
    await second.settle();
    // The first device comes back later: its older edit does not win.
    clock += 3_600_000;
    first.sync.start('u1');
    await first.settle();
    await second.settle();
    expect(first.store.get().tasks[0].text).toBe('Newer edit');
    expect(second.store.get().tasks[0].text).toBe('Newer edit');
    expect(first.store.get().sync?.edits).toBeUndefined();
  });

  it('keeps the newer edit when an older one lands after it', async () => {
    const account = fakeAccount();
    let clock = NOW;
    const first = device(account, addTask(createInitialState(NOW), 'Essay', null, NOW), () => clock);
    const second = device(account, createInitialState(NOW), () => clock);
    track(first, second);
    first.sync.start('u1');
    await first.settle();
    second.sync.start('u1');
    await second.settle();
    const id = first.store.get().tasks[0].id;
    // The first device's edit is sent and held on a slow connection.
    account.hold();
    clock += 60_000;
    first.store.commit(renameTask(first.store.get(), id, 'Older edit'));
    await first.settle();
    expect(first.sync.status()).toEqual({ phase: 'saving' });
    // A newer edit from the second device reaches the account first.
    account.letThrough();
    clock += 60_000;
    second.store.commit(renameTask(second.store.get(), id, 'Newer edit'));
    await second.settle();
    await first.settle();
    expect(first.store.get().tasks[0].text).toBe('Newer edit');
    expect(first.sync.status()).toEqual({ phase: 'saving' });
    // The older edit lands late and is refused: nothing changes, all saved.
    account.release();
    await first.settle();
    await second.settle();
    expect(account.tasks()[0].text).toBe('Newer edit');
    expect(first.store.get().tasks[0].text).toBe('Newer edit');
    expect(second.store.get().tasks[0].text).toBe('Newer edit');
    expect(first.sync.status()).toEqual({ phase: 'synced' });
    expect(second.sync.status()).toEqual({ phase: 'synced' });
  });

  it('keeps a finish from another device when this one deletes the task before seeing it', async () => {
    const account = fakeAccount();
    let clock = NOW;
    const first = device(account, addTask(createInitialState(NOW), 'Essay', null, NOW), () => clock);
    const second = device(account, createInitialState(NOW), () => clock);
    track(first, second);
    first.sync.start('u1');
    await first.settle();
    second.sync.start('u1');
    await second.settle();
    const id = first.store.get().tasks[0].id;
    clock += 60_000;
    // The second device finishes it and the first deletes it, both on a slow
    // connection: the delete was sent without knowing of the finish, and the
    // finish lands just before it.
    account.hold();
    second.store.commit(toggleTask(second.store.get(), id, NOW).state);
    await second.settle();
    first.store.commit(removeTask(first.store.get(), id, NOW).state);
    await first.settle();
    expect(first.store.get().xp).toBe(0);
    account.release();
    await second.settle();
    await first.settle();
    await second.settle();
    expect(account.tasks()[0]).toMatchObject({ deleted: true, doneOn: first.store.get().day.d });
    expect(first.store.get().tasks).toEqual([]);
    expect(second.store.get().tasks).toEqual([]);
    expect(first.store.get().xp).toBe(30);
    expect(second.store.get().xp).toBe(30);
  });

  it('does not give back the credit of a task reopened and deleted before either change was sent', async () => {
    const account = fakeAccount();
    let clock = NOW;
    const first = device(account, addTask(createInitialState(NOW), 'Essay', null, NOW), () => clock);
    const second = device(account, createInitialState(NOW), () => clock);
    track(first, second);
    first.sync.start('u1');
    await first.settle();
    second.sync.start('u1');
    await second.settle();
    const id = first.store.get().tasks[0].id;
    // Finished, and the finish reaches the account and the other device.
    clock += 60_000;
    first.store.commit(toggleTask(first.store.get(), id, clock).state);
    await first.settle();
    await second.settle();
    expect(second.store.get().xp).toBe(30);
    // Reopened, then deleted, within one send wait: neither change has gone up.
    clock += 60_000;
    first.store.commit(toggleTask(first.store.get(), id, clock).state);
    first.store.commit(removeTask(first.store.get(), id, clock).state);
    expect(first.store.get().day.tasks).toBe(0);
    expect(first.store.get().xp).toBe(0);
    await first.settle();
    await second.settle();
    expect(account.tasks()[0]).toMatchObject({ deleted: true, doneOn: null });
    expect(first.store.get().log.finished ?? []).toEqual([]);
    expect(first.store.get().xp).toBe(0);
    expect(second.store.get().xp).toBe(0);
    expect(second.store.get().tasks).toEqual([]);
  });

  it('keeps everything on the device after signing out, and sends what was done meanwhile on the next sign-in', async () => {
    const account = fakeAccount();
    const first = device(account, withFocus(createInitialState(NOW), NOW - 3600000, 25));
    track(first);
    first.sync.start('u1');
    await first.settle();
    first.sync.stop();
    first.store.commit(withFocus(first.store.get(), NOW - 600000, 10));
    await first.settle();
    expect(first.store.get().day.minutes).toBe(35);
    expect(account.sessions()).toBe(1);
    first.sync.start('u1');
    await first.settle();
    expect(account.sessions()).toBe(2);
  });

  it('sends waiting task edits at once when the app leaves the foreground', async () => {
    const account = fakeAccount();
    const first = device(account);
    track(first);
    first.sync.start('u1');
    await first.settle();
    first.store.commit(addTask(first.store.get(), 'Now', null, NOW));
    first.sync.flush();
    await flush();
    expect(account.tasks().map((task) => task.text)).toEqual(['Now']);
  });

  it('reports offline when the first check cannot reach the account', async () => {
    const account = fakeAccount();
    account.setOnline(false);
    const first = device(account, withFocus(createInitialState(NOW), NOW - 3600000, 25));
    track(first);
    first.sync.start('u1');
    await first.settle();
    expect(first.sync.status()).toEqual({ phase: 'offline' });
    expect(first.store.get().day.minutes).toBe(25);
    account.setOnline(true);
    first.sync.retry();
    await first.settle();
    expect(first.sync.status()).toEqual({ phase: 'synced' });
    expect(account.sessions()).toBe(1);
  });
});
