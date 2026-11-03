import { idleSession, pauseSession, sessionRemaining, startSession, takeCompletedSession } from './clock';
import { emptyDay } from './history';
import { ProgressState } from './types';

function progressAt(now: number): ProgressState {
  const day = emptyDay(now);
  return {
    cfg: { focus: 25, short: 5, long: 15 },
    xp: 0,
    streak: { n: 0, last: '' },
    day,
    days: { [day.d]: day },
    tasks: [],
    activeId: null,
    cycle: 0,
  };
}

describe('session clock', () => {
  const now = new Date(2026, 10, 2, 9).getTime();

  it('keeps a running session on endAt and freezes the remainder on pause', () => {
    const running = startSession(idleSession('focus', 25 * 60_000), now);
    expect(running.endAt).toBe(now + 25 * 60_000);
    expect(sessionRemaining(running, now + 60_000)).toBe(24 * 60_000);

    const paused = pauseSession(running, now + 60_000);
    expect(paused).toEqual({ mode: 'focus', status: 'paused', endAt: null, remainingMs: 24 * 60_000 });
    expect(sessionRemaining(paused, now + 10 * 60_000)).toBe(24 * 60_000);

    const resumed = startSession(paused, now + 10 * 60_000);
    expect(resumed.endAt).toBe(now + 10 * 60_000 + 24 * 60_000);
    expect(sessionRemaining(resumed, now + 60_000)).toBe(24 * 60_000);
  });

  it('awards a session that ended while the app was closed and leaves the next phase ready', () => {
    const started = startSession(idleSession('focus', 25 * 60_000), now);
    const later = started.endAt! + 60_000;
    const opened = takeCompletedSession(progressAt(now), started, later, true);

    expect(opened.completed).toBe(true);
    expect(opened.completedMode).toBe('focus');
    expect(opened.autoStarted).toBe(false);
    expect(opened.state.xp).toBe(50);
    expect(opened.state.day.d).toBe('2026-11-2');
    expect(opened.clock).toMatchObject({ mode: 'short', status: 'idle', endAt: null, remainingMs: 5 * 60_000 });
  });

  it('starts the next phase when the session ends while the app is open and auto-start is on', () => {
    const started = startSession(idleSession('focus', 25 * 60_000), now);
    const opened = takeCompletedSession(progressAt(now), started, started.endAt!, false);
    expect(opened.autoStarted).toBe(false);
    expect(opened.clock.status).toBe('idle');

    const auto = takeCompletedSession(progressAt(now), started, started.endAt!, true);
    expect(auto.autoStarted).toBe(true);
    expect(auto.clock.status).toBe('running');
    expect(auto.clock.mode).toBe('short');
    expect(auto.clock.endAt).toBe(started.endAt! + 5 * 60_000);
  });

  it('leaves a session that is still running unchanged', () => {
    const started = startSession(idleSession('short', 5 * 60_000), now);
    const state = progressAt(now);
    const opened = takeCompletedSession(state, started, now + 1000, true);
    expect(opened.completed).toBe(false);
    expect(opened.state).toBe(state);
    expect(opened.clock).toBe(started);
  });
});
