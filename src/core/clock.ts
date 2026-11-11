import { durationMinutes, modeDurationMs } from './phase';
import { completeSession } from './session';
import { ProgressState, TimerMode } from './types';

export type ClockStatus = 'idle' | 'running' | 'paused';

export interface SessionClock {
  mode: TimerMode;
  status: ClockStatus;
  endAt: number | null;
  remainingMs: number;
  /**
   * The length the current session was set to when it started. `remainingMs`
   * only says how much time is left, so the two differ once a session runs:
   * with 90 minutes set, `remainingMs` is 1,800,000 at the 60-minute mark.
   */
  totalMs: number;
}

/** A session that ended this long before we noticed was finished while the app was away. */
export const SESSION_AWAY_MS = 2000;

export function idleSession(mode: TimerMode, durationMs: number): SessionClock {
  return { mode, status: 'idle', endAt: null, remainingMs: durationMs, totalMs: durationMs };
}

export function sessionMinutes(clock: SessionClock): number {
  return durationMinutes(clock.totalMs);
}

export function sessionRemaining(clock: SessionClock, now: number): number {
  if (clock.status === 'running' && clock.endAt != null) {
    // remainingMs is the time left at the instant endAt was set. A sample
    // taken before that instant, such as the clock's last tick while paused,
    // would otherwise add the gap back onto the display for one frame.
    return Math.max(0, Math.min(clock.remainingMs, clock.endAt - now));
  }
  return Math.max(0, clock.remainingMs);
}

/**
 * The whole second the timer shows for `now`, rounded up the same way the
 * display rounds. The clock ticks faster than once a second, so it compares
 * this to decide whether the screen has anything new to draw.
 */
export function displaySecond(clock: SessionClock, now: number): number {
  return Math.ceil(sessionRemaining(clock, now) / 1000);
}

/**
 * True while `clock` is still the run that `started` began. A pause, reset,
 * skip, mode change or a later start all move or clear `endAt`, so work that
 * finishes after a wait (scheduling the alarm) can tell it has been overtaken.
 */
export function isSameRun(clock: SessionClock, started: SessionClock): boolean {
  return clock.status === 'running' && started.endAt != null && clock.endAt === started.endAt;
}

export function sessionAwaitingCompletion(clock: SessionClock, now: number): boolean {
  return clock.status === 'running' && clock.endAt != null && clock.endAt <= now;
}

export function startSession(clock: SessionClock, now: number): SessionClock {
  const remaining = sessionRemaining(clock, now);
  return { mode: clock.mode, status: 'running', remainingMs: remaining, totalMs: clock.totalMs, endAt: now + remaining };
}

export function pauseSession(clock: SessionClock, now: number): SessionClock {
  return {
    mode: clock.mode,
    status: 'paused',
    endAt: null,
    remainingMs: sessionRemaining(clock, now),
    totalMs: clock.totalMs,
  };
}

export interface OpenedSession<T> {
  state: T;
  clock: SessionClock;
  completed: boolean;
  completedMode: TimerMode | null;
  messages: string[];
  autoStarted: boolean;
}

export function takeCompletedSession<T extends ProgressState>(
  state: T,
  clock: SessionClock,
  now: number,
  auto: boolean,
): OpenedSession<T> {
  if (!sessionAwaitingCompletion(clock, now) || clock.endAt == null) {
    return { state, clock, completed: false, completedMode: null, messages: [], autoStarted: false };
  }

  const endedAt = clock.endAt;
  const result = completeSession(state, clock.mode, endedAt, sessionMinutes(clock));
  const away = now - endedAt > SESSION_AWAY_MS;
  const autoStarted = auto && !away;
  const duration = modeDurationMs(result.state.cfg, result.nextMode);
  const next = idleSession(result.nextMode, duration);
  return {
    state: result.state,
    clock: autoStarted ? startSession(next, now) : next,
    completed: true,
    completedMode: clock.mode,
    messages: result.messages,
    autoStarted,
  };
}
