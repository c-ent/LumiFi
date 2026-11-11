import { displaySecond, idleSession, isSameRun, pauseSession, sessionMinutes, sessionRemaining, startSession, takeCompletedSession } from './clock';
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
    expect(running.totalMs).toBe(25 * 60_000);
    expect(sessionRemaining(running, now + 60_000)).toBe(24 * 60_000);

    const paused = pauseSession(running, now + 60_000);
    expect(paused).toEqual({ mode: 'focus', status: 'paused', endAt: null, remainingMs: 24 * 60_000, totalMs: 25 * 60_000 });
    expect(sessionRemaining(paused, now + 10 * 60_000)).toBe(24 * 60_000);

    const resumed = startSession(paused, now + 10 * 60_000);
    expect(resumed.endAt).toBe(now + 10 * 60_000 + 24 * 60_000);
    expect(resumed.totalMs).toBe(25 * 60_000);
    expect(sessionRemaining(resumed, now + 60_000)).toBe(24 * 60_000);
  });

  it('keeps the recorded length after the setting changes mid-session', () => {
    const running = startSession(idleSession('focus', 25 * 60_000), now);
    const state = { ...progressAt(now), cfg: { focus: 90, short: 5, long: 15 } };
    const opened = takeCompletedSession(state, running, running.endAt!, false);

    expect(sessionMinutes(running)).toBe(25);
    expect(opened.state.day.minutes).toBe(25);
    expect(opened.state.xp).toBe(50);
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
    expect(opened.clock).toMatchObject({ mode: 'short', status: 'idle', endAt: null, remainingMs: 5 * 60_000, totalMs: 5 * 60_000 });
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

  it('reports the second on screen, so ticks inside one second match', () => {
    const running = startSession(idleSession('focus', 25 * 60_000), now);
    expect(displaySecond(running, now)).toBe(1500);
    expect(displaySecond(running, now + 250)).toBe(1500);
    expect(displaySecond(running, now + 999)).toBe(1500);
    expect(displaySecond(running, now + 1000)).toBe(1499);
    expect(displaySecond(running, now + 1001)).toBe(1499);
    expect(displaySecond(running, running.endAt! + 5000)).toBe(0);
    // A sample from before the start cannot show more than the full length.
    expect(displaySecond(running, now - 60_000)).toBe(1500);
    const paused = pauseSession(running, now + 60_000);
    expect(displaySecond(paused, now + 10 * 60_000)).toBe(1440);
  });

  it('knows when a started run has been overtaken', () => {
    const idle = idleSession('focus', 25 * 60_000);
    const started = startSession(idle, now);
    expect(isSameRun(started, started)).toBe(true);
    expect(isSameRun({ ...started }, started)).toBe(true);
    expect(isSameRun(pauseSession(started, now + 1000), started)).toBe(false);
    expect(isSameRun(idle, started)).toBe(false);
    expect(isSameRun(startSession(idleSession('short', 5 * 60_000), now), started)).toBe(false);
    // Paused then resumed later: a new deadline, so the first start's alarm is stale.
    const resumed = startSession(pauseSession(started, now + 1000), now + 5000);
    expect(isSameRun(resumed, started)).toBe(false);
    expect(isSameRun(idle, idle)).toBe(false);
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
