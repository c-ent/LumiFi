import { sessionRemaining, SessionClock } from '@/src/core/clock';
import { useEffect, useState, type RefObject } from 'react';
import { AppState } from 'react-native';

/**
 * Makes the timer count down on screen.
 *
 * The session stores a fixed `endAt` timestamp, never a "seconds left" number
 * that gets decremented. That keeps the time correct even if the app is
 * backgrounded, the phone sleeps or the JS thread stalls: on every tick we
 * just compare `Date.now()` against `endAt` (see src/core/clock.ts).
 *
 * `onReachEnd` is a ref so the interval doesn't restart when the callback's
 * identity changes.
 */
export function useSessionClock(session: SessionClock, onReachEnd: RefObject<() => void>) {
  // `now` is state so each tick re-renders the components showing the time.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (session.status !== 'running') return undefined;
    const tick = () => {
      const next = Date.now();
      setNow(next);
      if (session.endAt != null && next >= session.endAt) onReachEnd.current();
    };
    tick();
    // 250ms keeps the displayed seconds from visibly skipping.
    const id = setInterval(tick, 250);
    // Timers are throttled while the app is in the background; tick as soon as
    // the user comes back so the screen is never stale.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [onReachEnd, session]);

  return {
    remaining: sessionRemaining(session, now),
    running: session.status === 'running',
  };
}
