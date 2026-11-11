import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Zen mode: while `allowed`, the interface fades away after `delayMs` with no
 * touch. `poke` records activity and brings it back; screens call it from a
 * root `onTouchStart` and from their own buttons.
 *
 * `allowed` is the screen's own rule (a running focus session with the setting
 * on, and on phone and desktop no panel open).
 */
export function useZen(allowed: boolean, delayMs: number) {
  const [zen, setZen] = useState(false);
  // When the user last touched anything.
  const lastAct = useRef(0);

  const poke = useCallback(() => {
    lastAct.current = Date.now();
    setZen(false);
  }, []);

  // Checked 2.5 times a second. A change in `allowed` restarts the wait.
  useEffect(() => {
    lastAct.current = Date.now();
    const id = setInterval(() => {
      setZen(allowed && Date.now() - lastAct.current > delayMs);
    }, 400);
    return () => clearInterval(id);
  }, [allowed, delayMs]);

  return { zen, poke };
}
