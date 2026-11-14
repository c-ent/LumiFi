import { hasProgress, logMinutes, rebuildProgress, withSessionCounts } from '@/src/core/progress-log';
import {
  adoptRemote,
  emptyMeta,
  emptyRemote,
  hasUnsaved,
  isQuiet,
  reconcile,
  Reconciled,
  RemoteProgress,
  remoteHasProgress,
  SyncMeta,
  SyncPush,
  taskSig,
  TOMBSTONE_KEEP_MS,
} from '@/src/core/sync';
import type { Task } from '@/src/core/types';
import { levelInfo } from '@/src/core/xp';
import { withoutProgress, type SavedState } from './saved-state';

// Keeps the saved state and the signed-in account in step. Not React and not
// Firebase: the store and the Firestore calls are handed in, so the tests run
// it with fakes. The rules for combining are in src/core/sync.ts.
//
// - Signing in links this device to the account. If both hold progress, the
//   user picks which to keep (owner, 2026-11-13); the other is dropped.
// - While linked, the device listens only for records written since its last
//   sync, and reconciles on each confirmed batch. If the account was reset
//   from another device, or this device was away longer than deleted tasks
//   are remembered (30 days), it reads everything once and starts from there.
// - Local changes are sent after a short wait: 1.5 s after a finished
//   session, 10 s after the last task edit (so a burst of edits is one write
//   per task), and at once when the app leaves the foreground (`flush`).
// - XP, streak and history are rebuilt from the log while linked.
// - Signing out (`forget`) clears the progress from the device (owner,
//   2026-11-14), so the next account to sign in here cannot take it. The
//   caller first waits for it to be saved (`whenSaved`) and warns if it is
//   not (`unsaved`). `stop` (the session ended without a sign-out) keeps it.

export interface ProgressRemote {
  /** Everything the account holds. */
  fetch: (uid: string) => Promise<RemoteProgress>;
  /** Records written at or after `since` (0: everything), now and as more arrive. */
  listen: (uid: string, since: number, onConfirmed: (remote: RemoteProgress) => void, onError: (error: unknown) => void) => () => void;
  /** Sends the records, written under reset `epoch`. Resolves with how many were refused. */
  push: (uid: string, push: SyncPush, epoch: number) => Promise<number>;
  /** Empties the account and raises its reset count. Resolves with the new count. */
  reset: (uid: string) => Promise<number>;
}

export interface ProgressSummary {
  level: number;
  xp: number;
  minutes: number;
  tasks: number;
}

export type SyncStatus =
  | { phase: 'off' }
  | { phase: 'checking' }
  | { phase: 'choose'; device: ProgressSummary; account: ProgressSummary }
  | { phase: 'synced' }
  /** Linked, with local changes sent and not yet confirmed by the account. */
  | { phase: 'saving' }
  | { phase: 'offline' }
  | { phase: 'error'; message: string };

export interface SyncStore {
  get: () => SavedState;
  commit: (next: SavedState) => void;
  subscribe: (listener: () => void) => () => void;
}

export interface AccountSync {
  /** Links (or resumes) syncing for this account. */
  start: (uid: string) => void;
  /** Stops syncing; the device keeps its progress. */
  stop: () => void;
  /** True when this device holds progress the signed-in account has not confirmed. */
  unsaved: () => boolean;
  /** Resolves true once nothing is unsaved, or false after `ms` if something still is. */
  whenSaved: (ms: number) => Promise<boolean>;
  /** Signing out: stops syncing and clears the progress from the device. */
  forget: () => void;
  /** Answers the first sign-in question. */
  choose: (keep: 'device' | 'account') => void;
  /** Tries again after the account could not be reached. */
  retry: () => void;
  /** Sends waiting changes now, for when the app leaves the foreground. */
  flush: () => void;
  status: () => SyncStatus;
  subscribe: (listener: () => void) => () => void;
  /** Stops everything for good. */
  dispose: () => void;
}

/** How long after a finished session it is sent. */
export const SESSION_DELAY_MS = 1500;
/** How long after the last task edit the tasks are sent. */
export const TASK_DELAY_MS = 10000;
/** How often the time of the last confirmed read is saved (it only needs to be about right). */
const CHECKED_EVERY_MS = 60 * 60 * 1000;

export function createAccountSync(options: {
  store: SyncStore;
  remote: ProgressRemote;
  now: () => number;
  setTimer?: (run: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
}): AccountSync {
  const { store, remote, now } = options;
  const setTimer = options.setTimer ?? ((run, ms) => setTimeout(run, ms));
  const clearTimer = options.clearTimer ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));

  let status: SyncStatus = { phase: 'off' };
  let uid: string | null = null;
  // Bumped on every start and stop, so a late answer from an old one is dropped.
  let generation = 0;
  let stopListening: (() => void) | null = null;
  // True once the listener has delivered a confirmed batch: only then is the
  // link's view of the account current enough to send local changes.
  let ready = false;
  let fetched: RemoteProgress | null = null;
  let timer: unknown = null;
  let timerDue = 0;
  // Writes sent and not yet settled, so a second reconcile does not send them
  // again. Keyed by account, and per task (not per edit), so one task's writes
  // go out one at a time.
  const inFlight = new Set<string>();
  // Set when a reconcile held back a write because an earlier one for the same
  // record was still out: once that settles, the device reconciles again so
  // the latest edit is sent.
  let heldBack = false;
  const listeners = new Set<() => void>();
  let seen = { log: store.get().log, tasks: store.get().tasks };

  const setStatus = (next: SyncStatus) => {
    status = next;
    for (const listener of [...listeners]) listener();
  };

  const apply = (state: SavedState, result: Omit<Reconciled, 'push'>): SavedState => {
    const rebuilt = rebuildProgress(result.log, result.tasks, now());
    const tasks = withSessionCounts(result.tasks, result.log, state.log);
    const active = tasks.find((task) => task.id === state.activeId && task.parentId == null && !task.done);
    return {
      ...state,
      log: result.log,
      tasks,
      sync: result.meta,
      xp: rebuilt.xp,
      streak: rebuilt.streak,
      days: rebuilt.days,
      day: rebuilt.day,
      activeId: active ? active.id : null,
    };
  };

  const commit = (next: SavedState) => {
    seen = { log: next.log, tasks: next.tasks };
    store.commit(next);
  };

  const send = (account: string, push: SyncPush, epoch: number, run: number) => {
    const keys: string[] = [];
    const fresh: SyncPush = { sessions: [], days: [], tasks: [], purge: [] };
    const take = <T>(name: string, item: T, list: T[]) => {
      const key = `${account}|${name}`;
      if (inFlight.has(key)) {
        heldBack = true;
        return;
      }
      keys.push(key);
      list.push(item);
    };
    for (const record of push.sessions) take(`s:${record.id}`, record, fresh.sessions);
    for (const record of push.days) take(`d:${record.d}`, record, fresh.days);
    // A task and its tombstone are one document: one write at a time.
    for (const task of push.tasks) take(`t:${task.id}`, task, fresh.tasks);
    for (const id of push.purge) take(`t:${id}`, id, fresh.purge);
    for (const task of fresh.tasks) {
      const after = push.creditAfter?.[String(task.id)];
      if (task.deleted && after != null) (fresh.creditAfter ??= {})[String(task.id)] = after;
    }
    if (keys.length === 0) return;
    for (const key of keys) inFlight.add(key);
    if (status.phase === 'synced') setStatus({ phase: 'saving' });
    const failed = () => {
      if (run === generation) setStatus({ phase: 'error', message: 'Some progress could not be saved to your account.' });
    };
    // Nothing is marked as seen until the account confirms it (src/core/sync.ts),
    // so a write that fails is sent again on the next reconcile or on Try again.
    remote.push(account, fresh, epoch).then((refused) => {
      if (refused > 0) failed();
    }, failed).finally(() => {
      for (const key of keys) inFlight.delete(key);
      if (uid !== account) return;
      // Not tied to `run`: a listener restarted meanwhile may have held a write
      // back behind this one. `ready` is only true once the current listener has
      // a confirmed read, and this reconcile uses no remote data, only what the
      // device holds against its saved view of the account.
      if (heldBack && ready) {
        heldBack = false;
        runReconcile(emptyRemote(), false);
      }
      // Saved once the account has acknowledged every write sent.
      settle(account);
    });
  };

  // Writes out, or local changes still waiting to be sent.
  const pending = (account: string) => timer != null || [...inFlight].some((key) => key.startsWith(`${account}|`));

  const settle = (account: string) => {
    if (status.phase === 'saving' && !pending(account)) setStatus({ phase: 'synced' });
  };

  const runReconcile = (copy: RemoteProgress, full: boolean) => {
    const account = uid;
    const state = store.get();
    if (!account || state.sync?.uid !== account) return;
    const result = reconcile({ log: state.log, tasks: state.tasks }, state.sync, copy, now(), full);
    if (!isQuiet({ log: state.log, tasks: state.tasks, meta: state.sync }, result)) commit(apply(state, result));
    send(account, result.push, result.meta.epoch, generation);
  };

  const cancelTimer = () => {
    if (timer != null) clearTimer(timer);
    timer = null;
    timerDue = 0;
  };

  const sendLocal = () => {
    cancelTimer();
    if (ready) runReconcile(emptyRemote(), false);
    // The wait may have ended with nothing to send (an edit undone).
    if (uid) settle(uid);
  };

  // Remembers when this device last had a confirmed read, on its own clock. The
  // read cursor (`since`) is the newest record's server time, which stays old
  // while nobody writes, so it cannot tell "away for 30 days" from "nothing new".
  const noteChecked = (account: string) => {
    const state = store.get();
    const sync = state.sync;
    if (!sync || sync.uid !== account) return;
    if (sync.checked != null && now() - sync.checked < CHECKED_EVERY_MS) return;
    store.commit({ ...state, sync: { ...sync, checked: now() } });
  };

  // Away longer than deleted-task tombstones are kept: some deletes are no
  // longer in the account to be read, so a delta read would miss them.
  const isStale = (sync: SyncMeta | null | undefined) => {
    const since = sync?.since ?? 0;
    const last = sync?.checked ?? since;
    return since > 0 && now() - last > TOMBSTONE_KEEP_MS;
  };

  const listen = (account: string, since: number) => {
    generation += 1;
    const run = generation;
    stopListening?.();
    ready = false;
    const full = since === 0;
    stopListening = remote.listen(account, since, (copy) => {
      if (run !== generation) return;
      const meta = store.get().sync;
      // Reset from another device: read everything once and start over.
      if (!full && meta && copy.epoch != null && copy.epoch !== meta.epoch) {
        listen(account, 0);
        return;
      }
      // Out of touch longer than tombstones are kept (offline with the app
      // open): this delta may miss deletes, so read everything once instead.
      if (!full && isStale(meta)) {
        listen(account, 0);
        return;
      }
      ready = true;
      runReconcile(copy, full);
      noteChecked(account);
      // "Saved" only when nothing is still waiting to be sent or confirmed.
      const next = pending(account) ? 'saving' : 'synced';
      if (status.phase !== next) setStatus({ phase: next });
    }, () => {
      if (run === generation) setStatus({ phase: 'error', message: 'Could not reach your account.' });
    });
  };

  // Notes when each task was edited, added or deleted here, in the save, so
  // the edit goes up with that time however late it is sent (offline, or
  // signed out while still linked). Changes the sync made itself never reach
  // here (`commit` marks them seen first).
  const noteEdits = (before: Task[], state: SavedState) => {
    const sync = state.sync;
    if (!sync) return;
    const at = now();
    const old = new Map(before.map((task) => [String(task.id), taskSig(task)]));
    const edits = { ...sync.edits };
    let changed = false;
    for (const task of state.tasks) {
      const id = String(task.id);
      if (old.get(id) !== taskSig(task)) {
        edits[id] = at;
        changed = true;
      }
      old.delete(id);
    }
    for (const id of old.keys()) {
      edits[id] = at;
      changed = true;
    }
    if (changed) store.commit({ ...state, sync: { ...sync, edits } });
  };

  // Local changes to the log or the tasks, sent once they settle.
  const unsubscribeStore = store.subscribe(() => {
    const state = store.get();
    const sessionChanged = state.log !== seen.log;
    if (!sessionChanged && state.tasks === seen.tasks) return;
    const before = seen.tasks;
    seen = { log: state.log, tasks: state.tasks };
    if (state.tasks !== before) noteEdits(before, state);
    if (!uid || state.sync?.uid !== uid) return;
    const delay = sessionChanged ? SESSION_DELAY_MS : TASK_DELAY_MS;
    const due = now() + delay;
    // A send already due sooner covers this change too: edits within one
    // 10 s window go out together, and a finished session can pull a
    // waiting task send forward but is never held back by one.
    if (timer != null && timerDue <= due) return;
    cancelTimer();
    timerDue = due;
    timer = setTimer(sendLocal, delay);
    // A change waiting to go out is not saved yet.
    if (status.phase === 'synced') setStatus({ phase: 'saving' });
  });

  const link = (account: string, copy: RemoteProgress, keep: 'device' | 'account') => {
    const state = store.get();
    if (keep === 'account') {
      const adopted = adoptRemote(copy, account, now());
      commit(apply(state, adopted));
      send(account, adopted.push, adopted.meta.epoch, generation);
      listen(account, adopted.meta.since);
    } else {
      // Everything here is new to the account. Records already there (old
      // tombstones, the reset marker) are not read again.
      const meta: SyncMeta = emptyMeta(account, copy.epoch ?? 0, copy.latest);
      store.commit({ ...state, sync: meta });
      listen(account, meta.since);
    }
  };

  const check = (account: string) => {
    generation += 1;
    const run = generation;
    setStatus({ phase: 'checking' });
    remote.fetch(account).then((copy) => {
      if (run !== generation) return;
      const state = store.get();
      const deviceHas = hasProgress(state.log, state.tasks);
      const accountHas = remoteHasProgress(copy);
      if (!accountHas) {
        link(account, copy, 'device');
      } else if (!deviceHas) {
        link(account, copy, 'account');
      } else {
        fetched = copy;
        setStatus({ phase: 'choose', device: summarise(state), account: summariseRemote(copy, now()) });
      }
    }).catch(() => {
      if (run === generation) setStatus({ phase: 'offline' });
    });
  };

  const resume = (account: string) => {
    setStatus({ phase: 'checking' });
    const sync = store.get().sync;
    listen(account, isStale(sync) ? 0 : sync?.since ?? 0);
  };

  const stop = () => {
    generation += 1;
    uid = null;
    fetched = null;
    ready = false;
    stopListening?.();
    stopListening = null;
    cancelTimer();
    setStatus({ phase: 'off' });
  };

  const unsaved = () => {
    const state = store.get();
    return hasUnsaved({ log: state.log, tasks: state.tasks }, state.sync, uid, now());
  };

  return {
    start: (account) => {
      if (uid === account && status.phase !== 'off') return;
      uid = account;
      fetched = null;
      if (store.get().sync?.uid === account) resume(account);
      else check(account);
    },
    stop,
    unsaved,
    // A write is saved once a confirmed read shows it, which updates the
    // save's view of the account, so every store change is a moment to check.
    whenSaved: (ms) => new Promise<boolean>((resolve) => {
      if (!unsaved()) {
        resolve(true);
        return;
      }
      let done = false;
      const finish = (saved: boolean) => {
        if (done) return;
        done = true;
        unsubscribe();
        clearTimer(deadline);
        resolve(saved);
      };
      const unsubscribe = store.subscribe(() => {
        if (!unsaved()) finish(true);
      });
      const deadline = setTimer(() => finish(!unsaved()), ms);
    }),
    forget: () => {
      stop();
      heldBack = false;
      // Through `commit`, so the cleared tasks are not noted as local edits.
      commit(withoutProgress(store.get(), now()));
    },
    choose: (keep) => {
      const account = uid;
      const copy = fetched;
      if (!account || !copy || status.phase !== 'choose') return;
      fetched = null;
      if (keep === 'account') {
        link(account, copy, 'account');
        return;
      }
      generation += 1;
      const run = generation;
      setStatus({ phase: 'checking' });
      remote.reset(account).then((epoch) => {
        if (run !== generation) return;
        // The account now holds only the reset marker; read it whole.
        store.commit({ ...store.get(), sync: emptyMeta(account, epoch, 0) });
        listen(account, 0);
      }).catch(() => {
        if (run === generation) setStatus({ phase: 'offline' });
      });
    },
    retry: () => {
      if (!uid) return;
      if (store.get().sync?.uid === uid) resume(uid);
      else check(uid);
    },
    flush: () => {
      if (timer != null) sendLocal();
    },
    status: () => status,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      generation += 1;
      // A write still out finds no account and stops there (see `send`).
      uid = null;
      ready = false;
      heldBack = false;
      fetched = null;
      stopListening?.();
      stopListening = null;
      unsubscribeStore();
      cancelTimer();
      listeners.clear();
    },
  };
}

function summarise(state: SavedState): ProgressSummary {
  return {
    level: levelInfo(state.xp).level,
    xp: state.xp,
    minutes: logMinutes(state.log),
    tasks: state.tasks.filter((task) => task.parentId == null).length,
  };
}

function summariseRemote(copy: RemoteProgress, now: number): ProgressSummary {
  const adopted = adoptRemote(copy, '', now);
  const rebuilt = rebuildProgress(adopted.log, adopted.tasks, now);
  return {
    level: levelInfo(rebuilt.xp).level,
    xp: rebuilt.xp,
    minutes: logMinutes(adopted.log),
    tasks: adopted.tasks.filter((task) => task.parentId == null).length,
  };
}
