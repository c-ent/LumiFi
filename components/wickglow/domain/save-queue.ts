// Decides when the saved state is written. A slider drag changes the state
// dozens of times a second, and each write serialises the whole save, so most
// changes wait for a short quiet spell and are written once. Timer changes go
// through `now`, because a session start or finish must be on disk at once.
//
// No React and no storage in here: the caller hands in the `write` function,
// which keeps this testable with fake timers.

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
export function createSaveQueue<T>(write: (state: T) => void, delayMs: number, written: T): SaveQueue<T> {
  let last: T = written;
  let waiting: { state: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer != null) clearTimeout(timer);
    timer = null;
  };

  const flush = () => {
    clear();
    if (!waiting) return;
    const { state } = waiting;
    waiting = null;
    last = state;
    write(state);
  };

  return {
    later: (state) => {
      // Already written (or being written by `now`): nothing is left to save.
      if (state === last) {
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
      last = state;
      write(state);
    },
    flush,
  };
}
