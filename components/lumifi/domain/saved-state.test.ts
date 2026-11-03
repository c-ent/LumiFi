import { calendarKey, shiftCalendarDays } from '@/src/core/calendar';
import { createInitialState, parseSavedState } from './saved-state';

describe('saved day history', () => {
  const now = new Date(2026, 10, 2, 8).getTime();

  it('starts clean when nothing is stored', () => {
    const fresh = parseSavedState(null, now);
    expect(fresh.xp).toBe(0);
    expect(fresh.streak).toEqual({ n: 0, last: '' });
    expect(fresh.day.minutes).toBe(0);
    expect(fresh.day.sessions).toBe(0);
    expect(fresh.tasks).toEqual([]);
    expect(fresh.activeId).toBeNull();
    expect(fresh.mix).toEqual({ music: 60, rain: 0, cafe: 0, fire: 0, wind: 0, clock: 0, brown: 0, forest: 0, keyboard: 0, waves: 0 });
    expect(fresh.musicEnd).toBe('lower');
    expect(fresh.notificationsAsked).toBe(false);
    expect(fresh.session).toEqual({ mode: 'focus', status: 'idle', endAt: null, remainingMs: 25 * 60_000, totalMs: 25 * 60_000 });
    expect(fresh.days[fresh.day.d]).toBe(fresh.day);
    expect(createInitialState(now).xp).toBe(0);
  });

  it('keeps a running session and an empty task list', () => {
    const raw = JSON.stringify({
      tasks: [],
      xp: 40,
      musicEnd: 'fade',
      notificationsAsked: true,
      session: { mode: 'focus', status: 'running', endAt: now + 5_000, remainingMs: 5_000, totalMs: 25 * 60_000 },
    });
    const state = parseSavedState(raw, now);
    expect(state.tasks).toEqual([]);
    expect(state.xp).toBe(40);
    expect(state.musicEnd).toBe('fade');
    expect(state.notificationsAsked).toBe(true);
    expect(state.session).toEqual({ mode: 'focus', status: 'running', endAt: now + 5_000, remainingMs: 5_000, totalMs: 25 * 60_000 });
    expect(state.mix.clock).toBe(0);
  });

  it('falls back to the configured length for a save made before totalMs existed', () => {
    const state = parseSavedState(JSON.stringify({
      session: { mode: 'focus', status: 'running', endAt: now + 5_000, remainingMs: 5_000 },
    }), now);
    expect(state.session.totalMs).toBe(25 * 60_000);
  });

  it('keeps a saved clock level', () => {
    const state = parseSavedState(JSON.stringify({ mix: { clock: 40, rain: 25 } }), now);
    expect(state.mix.clock).toBe(40);
    expect(state.mix.rain).toBe(25);
    expect(state.mix.music).toBe(60);
  });

  it('only accepts a boolean auto-start flag', () => {
    expect(parseSavedState(JSON.stringify({ auto: true }), now).auto).toBe(true);
    expect(parseSavedState(JSON.stringify({ auto: false }), now).auto).toBe(false);
    expect(parseSavedState(JSON.stringify({ auto: null }), now).auto).toBe(false);
    expect(parseSavedState(JSON.stringify({ auto: 'yes' }), now).auto).toBe(false);
    expect(parseSavedState(JSON.stringify({}), now).auto).toBe(false);
  });

  it('falls back to the default lengths for a bad cfg', () => {
    const state = parseSavedState(JSON.stringify({
      cfg: { focus: 0, short: 'ten', long: 400 },
    }), now);
    expect(state.cfg).toEqual({ focus: 25, short: 5, long: 90 });
  });

  it('keeps a cfg within the settings bounds and drives an idle session from it', () => {
    const state = parseSavedState(JSON.stringify({ cfg: { focus: 50, short: 10, long: 20 } }), now);
    expect(state.cfg).toEqual({ focus: 50, short: 10, long: 20 });
    expect(state.session.totalMs).toBe(50 * 60_000);
  });

  it('rejects an xp that would hang levelInfo', () => {
    expect(parseSavedState(JSON.stringify({ xp: 1e999 }), now).xp).toBe(0);
    expect(parseSavedState(JSON.stringify({ xp: 'many' }), now).xp).toBe(0);
    expect(parseSavedState(JSON.stringify({ xp: -5 }), now).xp).toBe(0);
    expect(parseSavedState(JSON.stringify({ xp: 1e300 }), now).xp).toBe(1_000_000_000);
    expect(parseSavedState(JSON.stringify({ xp: 40 }), now).xp).toBe(40);
  });

  it('caps a stored session length at the limit the settings allow', () => {
    const inflated = parseSavedState(JSON.stringify({
      session: { mode: 'focus', status: 'idle', endAt: null, remainingMs: 60_000_000, totalMs: 60_000_000 },
    }), now);
    expect(inflated.session.totalMs).toBe(180 * 60_000);
    expect(inflated.session.remainingMs).toBe(180 * 60_000);

    const breakTooLong = parseSavedState(JSON.stringify({
      session: { mode: 'long', status: 'idle', endAt: null, remainingMs: 9_000_000, totalMs: 9_000_000 },
    }), now);
    expect(breakTooLong.session.totalMs).toBe(90 * 60_000);
    expect(breakTooLong.session.remainingMs).toBe(90 * 60_000);

    const honest = parseSavedState(JSON.stringify({
      session: { mode: 'focus', status: 'paused', endAt: null, remainingMs: 25 * 60_000, totalMs: 25 * 60_000 },
    }), now);
    expect(honest.session.totalMs).toBe(25 * 60_000);
    expect(honest.session.remainingMs).toBe(25 * 60_000);
  });

  it('keeps a paused remainder and ignores a running session with no deadline', () => {
    const paused = parseSavedState(JSON.stringify({
      session: { mode: 'short', status: 'paused', endAt: null, remainingMs: 120_000, totalMs: 300_000 },
    }), now);
    expect(paused.session).toEqual({ mode: 'short', status: 'paused', endAt: null, remainingMs: 120_000, totalMs: 300_000 });

    const broken = parseSavedState(JSON.stringify({
      session: { mode: 'long', status: 'running', endAt: null, remainingMs: 30_000, totalMs: 900_000 },
    }), now);
    expect(broken.session).toEqual({ mode: 'long', status: 'paused', endAt: null, remainingMs: 30_000, totalMs: 900_000 });
  });

  it('keeps a task completion day and gives an unknown one no day', () => {
    const raw = JSON.stringify({
      tasks: [
        { id: 1, text: 'Done yesterday', done: true, pomos: 2, doneOn: '2026-11-1' },
        { id: 2, text: 'Done before doneOn existed', done: true, pomos: 1 },
      ],
    });
    const state = parseSavedState(raw, now);
    expect(state.tasks[0].doneOn).toBe('2026-11-1');
    expect(state.tasks[1].doneOn).toBeNull();
  });

  it('keeps yesterday and older days when the save is opened on a new day', () => {
    const yesterday = calendarKey(shiftCalendarDays(now, -1));
    const older = calendarKey(new Date(2026, 8, 1, 12).getTime());
    const raw = JSON.stringify({
      xp: 20,
      streak: { n: 3, last: yesterday },
      day: { d: yesterday, sessions: 2, minutes: 80, tasks: 1, claimed: ['q2'] },
      days: {
        [older]: { d: older, sessions: 1, minutes: 15, tasks: 0, claimed: [] },
        [yesterday]: { d: yesterday, sessions: 1, minutes: 10, tasks: 0, claimed: [] },
      },
    });

    const state = parseSavedState(raw, now);
    expect(state.day).toMatchObject({ d: '2026-11-2', minutes: 0, sessions: 0, tasks: 0, claimed: [] });
    expect(state.days[yesterday].minutes).toBe(80);
    expect(state.days[older].minutes).toBe(15);
    expect(state.xp).toBe(20);
    expect(state.streak.n).toBe(3);
  });
});
