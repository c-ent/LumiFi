import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Zen mode: while `allowed`, the interface fades away after `delayMs` with no
 * activity. `poke` records activity and brings it back; screens call it from a
 * root `onTouchStart` and from their own buttons. On web the hook also listens
 * to the window, since a mouse moves and a key is pressed without a touch.
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

  // Web only: mouse and keyboard activity. `onTouchStart` covers touches.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.addEventListener) return undefined;
    const events = ['pointerdown', 'pointermove', 'keydown'] as const;
    for (const name of events) window.addEventListener(name, poke);
    return () => {
      for (const name of events) window.removeEventListener(name, poke);
    };
  }, [poke]);

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
