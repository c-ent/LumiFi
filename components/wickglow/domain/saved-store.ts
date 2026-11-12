import { createSaveQueue, WriteResult } from './save-queue';

// Holds the newest saved state and is the only thing that changes it. Timers,
// listeners and notifications fire long after the render that created them, so
// they read `get()` here instead of a value captured by an old render, and two
// changes in a row always build on each other.
//
// It also decides when a change is written: `commit` writes at once (a session
// start or finish must be on disk straight away), `update` is written a short
// while after the last change, so a slider drag is one write (see
// save-queue.ts).
//
// No React and no storage in here. The provider subscribes with
// `useSyncExternalStore` and hands in the `write` function.

export interface SavedStore<T> {
  /** The newest state. */
  get: () => T;
  /** Calls `listener` after every change. Returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Replace the state and write it at once. */
  commit: (next: T) => void;
  /** Change the state from the newest one. Returning the same object is no change. Written shortly after. */
  update: (change: (current: T) => T) => void;
  /** Write a waiting change now, for when the app leaves the foreground. */
  flush: () => void;
  /** Write a waiting change, then never write again. For when the store is retired. */
  dispose: () => void;
  /** Undo `dispose`, for an effect that runs again on the same store. */
  revive: () => void;
}

/** `loaded` is the state already in storage, so it is not written back. */
export function createSavedStore<T>(loaded: T, write: (state: T) => WriteResult, delayMs: number): SavedStore<T> {
  let state = loaded;
  const listeners = new Set<() => void>();
  const queue = createSaveQueue<T>(write, delayMs, loaded);

  const set = (next: T) => {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener();
  };

  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    // Queue before notifying, so a change a listener makes in response is
    // queued after this one and is not overwritten by it.
    commit: (next) => {
      queue.now(next);
      set(next);
    },
    update: (change) => {
      const next = change(state);
      if (next === state) return;
      queue.later(next);
      set(next);
    },
    flush: queue.flush,
    dispose: queue.dispose,
    revive: queue.revive,
  };
}
