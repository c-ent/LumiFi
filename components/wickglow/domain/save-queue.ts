// Decides when the saved state is written. A slider drag changes the state
// dozens of times a second, and each write serialises the whole save, so most
// changes wait for a short quiet spell and are written once. Timer changes go
// through `now`, because a session start or finish must be on disk at once.
//
// No React and no storage in here: the caller hands in the `write` function,
// which keeps this testable with fake timers. A `write` that resolves to false
// failed: its state goes back in the queue and is retried, with a growing
// pause, unless a newer state has been handed in since.

/** A failed write is retried after this, doubling on each failure up to the cap. */
const RETRY_MIN_MS = 2000;
const RETRY_MAX_MS = 60000;

/** What `write` may return. False, or a promise of false, means it failed. */
export type WriteResult = void | boolean | Promise<boolean | void>;

export interface SaveQueue<T> {
  /** Write this state after `delayMs` with no newer one. Replaces a waiting state. */
  later: (state: T) => void;
  /** Write this state at once and drop any waiting one, which is older. */
  now: (state: T) => void;
  /** Write the waiting state at once, if there is one. */
  flush: () => void;
}

/**
 * `written` is the state already in storage (the one just loaded), so handing
 * the same object back does not write it again.
 */
export function createSaveQueue<T>(write: (state: T) => WriteResult, delayMs: number, written: T): SaveQueue<T> {
  // `last` is the state handed to `write` most recently. `null` after a failed
  // write, so handing that same state back cannot be mistaken for saved.
  let last: { state: T } | null = { state: written };
  let waiting: { state: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryMs = RETRY_MIN_MS;

  const clear = () => {
    if (timer != null) clearTimeout(timer);
    timer = null;
  };

  // Put a failed state back, unless something newer has been written or is
  // waiting: that one replaces it anyway. Either way a failed state is no
  // longer the saved one, so handing it back later queues it again.
  const failed = (state: T) => {
    if (last?.state !== state) return;
    last = null;
    if (waiting) return;
    waiting = { state };
    clear();
    timer = setTimeout(flush, retryMs);
    retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
  };

  const run = (state: T) => {
    last = { state };
    let result: WriteResult;
    try {
      result = write(state);
    } catch {
      failed(state);
      return;
    }
    if (result === false) {
      failed(state);
      return;
    }
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      (result as Promise<boolean | void>).then(
        (ok) => {
          if (ok === false) failed(state);
          else if (last?.state === state) retryMs = RETRY_MIN_MS;
        },
        () => failed(state),
      );
      return;
    }
    retryMs = RETRY_MIN_MS;
  };

  const flush = () => {
    clear();
    if (!waiting) return;
    const { state } = waiting;
    waiting = null;
    run(state);
  };

  return {
    later: (state) => {
      // Already written (or being written by `now`): nothing is left to save.
      if (last && state === last.state) {
        waiting = null;
        clear();
        return;
      }
      waiting = { state };
      clear();
      timer = setTimeout(flush, delayMs);
    },
    now: (state) => {
      clear();
      waiting = null;
      run(state);
    },
    flush,
  };
}
