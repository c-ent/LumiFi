import { sessionRemaining, SessionClock } from '@/src/core/clock';
import { useEffect, useState, type RefObject } from 'react';
import { AppState } from 'react-native';

export function useSessionClock(session: SessionClock, onReachEnd: RefObject<() => void>) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (session.status !== 'running') return undefined;
    const tick = () => {
      const next = Date.now();
      setNow(next);
      if (session.endAt != null && next >= session.endAt) onReachEnd.current();
    };
    tick();
    const id = setInterval(tick, 250);
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
