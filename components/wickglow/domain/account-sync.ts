import { hasProgress, logMinutes, rebuildProgress, withSessionCounts } from '@/src/core/progress-log';
import {
  adoptRemote,
  emptyMeta,
  emptyRemote,
  isQuiet,
  reconcile,
  Reconciled,
  RemoteProgress,
  remoteHasProgress,
  SyncMeta,
  SyncPush,
  taskSig,
} from '@/src/core/sync';
import { levelInfo } from '@/src/core/xp';
import type { SavedState } from './saved-state';

// Keeps the saved state and the signed-in account in step. Not React and not
// Firebase: the store and the Firestore calls are handed in, so the tests run
// it with fakes. The rules for combining are in src/core/sync.ts.
//
// - Signing in links this device to the account. If both hold progress, the
//   user picks which to keep (owner, 2026-11-13); the other is dropped.
// - While linked, the device listens only for records written since its last
//   sync, and reconciles on each confirmed batch. If the account was reset
//   from another device, it reads everything once and starts from there.
// - Local changes are sent after a short wait: 1.5 s after a finished
//   session, 10 s after the last task edit (so a burst of edits is one write
//   per task), and at once when the app leaves the foreground (`flush`).
// - XP, streak and history are rebuilt from the log while linked.
// - Signing out stops syncing and keeps everything on the device.

export interface ProgressRemote {
  /** Everything the account holds. */
  fetch: (uid: string) => Promise<RemoteProgress>;
  /** Records written at or after `since` (0: everything), now and as more arrive. */
  listen: (uid: string, since: number, onConfirmed: (remote: RemoteProgress) => void, onError: (error: unknown) => void) => () => void;
  push: (uid: string, push: SyncPush) => Promise<number>;
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
  // Writes sent and not yet settled, so a second reconcile does not send them again.
  const inFlight = new Set<string>();
  const listeners = new Set<() => void>();
  let seen = { log: store.get().log, tasks: store.get().tasks };

  const setStatus = (next: SyncStatus) => {
    status = next;
    for (const listener of [...listeners]) listener();
  };

  const apply = (state: SavedState, result: Omit<Reconciled, 'push'>): SavedState => {
    const rebuilt = rebuildProgress(result.log, result.tasks, now());
    const tasks = withSessionCounts(result.tasks, result.log);
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

  const send = (account: string, push: SyncPush, run: number) => {
    const keys: string[] = [];
    const fresh: SyncPush = { sessions: [], days: [], tasks: [], purge: [] };
    const take = <T>(key: string, item: T, list: T[]) => {
      if (inFlight.has(key)) return;
      keys.push(key);
      list.push(item);
    };
    for (const record of push.sessions) take(`s:${record.id}`, record, fresh.sessions);
    for (const record of push.days) take(`d:${record.d}`, record, fresh.days);
    for (const task of push.tasks) take(`t:${task.id}:${task.deleted}:${taskSig(task)}`, task, fresh.tasks);
    for (const id of push.purge) take(`p:${id}`, id, fresh.purge);
    if (keys.length === 0) return;
    for (const key of keys) inFlight.add(key);
    remote.push(account, fresh).then((refused) => {
      if (run === generation && refused > 0) {
        setStatus({ phase: 'error', message: 'Some progress could not be saved to your account.' });
      }
    }).catch(() => undefined).finally(() => {
      for (const key of keys) inFlight.delete(key);
    });
  };

  const runReconcile = (copy: RemoteProgress, full: boolean) => {
    const account = uid;
    const state = store.get();
    if (!account || state.sync?.uid !== account) return;
    const result = reconcile({ log: state.log, tasks: state.tasks }, state.sync, copy, now(), full);
    if (!isQuiet({ log: state.log, tasks: state.tasks, meta: state.sync }, result)) commit(apply(state, result));
    send(account, result.push, generation);
  };

  const cancelTimer = () => {
    if (timer != null) clearTimer(timer);
    timer = null;
    timerDue = 0;
  };

  const sendLocal = () => {
    cancelTimer();
    if (ready) runReconcile(emptyRemote(), false);
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
      ready = true;
      runReconcile(copy, full);
      if (status.phase !== 'synced') setStatus({ phase: 'synced' });
    }, () => {
      if (run === generation) setStatus({ phase: 'error', message: 'Could not reach your account.' });
    });
  };

  // Local changes to the log or the tasks, sent once they settle.
  const unsubscribeStore = store.subscribe(() => {
    const state = store.get();
    const sessionChanged = state.log !== seen.log;
    if (!sessionChanged && state.tasks === seen.tasks) return;
    seen = { log: state.log, tasks: state.tasks };
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
  });

  const link = (account: string, copy: RemoteProgress, keep: 'device' | 'account') => {
    const state = store.get();
    if (keep === 'account') {
      const adopted = adoptRemote(copy, account, now());
      commit(apply(state, adopted));
      send(account, adopted.push, generation);
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
    listen(account, store.get().sync?.since ?? 0);
  };

  return {
    start: (account) => {
      if (uid === account && status.phase !== 'off') return;
      uid = account;
      fetched = null;
      if (store.get().sync?.uid === account) resume(account);
      else check(account);
    },
    stop: () => {
      generation += 1;
      uid = null;
      fetched = null;
      ready = false;
      stopListening?.();
      stopListening = null;
      cancelTimer();
      setStatus({ phase: 'off' });
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
      stopListening?.();
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
