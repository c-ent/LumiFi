import { calendarKey, shiftCalendarDays } from '@/src/core/calendar';
import { createInitialState, parseSavedState } from './saved-state';

// The parse boundary under test: whatever is stored, `parseSavedState` must
// return a usable state and never throw. The cases cover a clean start, a save
// from an older version, and a hand-edited one, plus the rules that survive a
// round trip: a subtask whose parent is gone, a task's due date, a running
// session with a missing deadline.

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
    expect(fresh.musicLoop).toBe(false);
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

  it('keeps the repeat setting, and defaults it off', () => {
    expect(parseSavedState(null, now).musicLoop).toBe(false);
    expect(parseSavedState(JSON.stringify({ musicLoop: true }), now).musicLoop).toBe(true);
    // A hand-edited save with a non-boolean falls back to off.
    expect(parseSavedState(JSON.stringify({ musicLoop: 'yes' }), now).musicLoop).toBe(false);
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

  it('never hands the audio players a level that is not a number from 0 to 100', () => {
    const state = parseSavedState(JSON.stringify({
      mix: { music: 'loud', rain: null, cafe: 250, fire: -4, wind: 33, extra: 80 },
    }), now);
    expect(state.mix).toEqual({ music: 60, rain: 0, cafe: 100, fire: 0, wind: 33, clock: 0, brown: 0, forest: 0, keyboard: 0, waves: 0 });
    expect(parseSavedState(JSON.stringify({ mix: 'all of it' }), now).mix.music).toBe(60);
    expect(parseSavedState(JSON.stringify({ mix: null }), now).mix.music).toBe(60);
  });

  it('falls back to the defaults for a scene, mood or zen setting it does not know', () => {
    const kept = parseSavedState(JSON.stringify({ scene: 'forest', mood: 'spirit', zenOpt: false }), now);
    expect(kept).toMatchObject({ scene: 'forest', mood: 'spirit', zenOpt: false });
    const bad = parseSavedState(JSON.stringify({ scene: 'beach', mood: 7, zenOpt: 'no' }), now);
    expect(bad).toMatchObject({ scene: 'dusk', mood: 'amber', zenOpt: true });
  });

  it('reads the streak and the session count as whole numbers that cannot go below zero', () => {
    expect(parseSavedState(JSON.stringify({ streak: { n: '3', last: 5 }, cycle: 'two' }), now)).toMatchObject({
      streak: { n: 0, last: '' },
      cycle: 0,
    });
    expect(parseSavedState(JSON.stringify({ streak: { n: 4.7, last: '2026-11-1' }, cycle: 6 }), now)).toMatchObject({
      streak: { n: 4, last: '2026-11-1' },
      cycle: 6,
    });
    expect(parseSavedState(JSON.stringify({ streak: 'long', cycle: -3 }), now)).toMatchObject({
      streak: { n: 0, last: '' },
      cycle: 0,
    });
  });

  it('drops a key that is not part of the state, and survives a save that is not an object', () => {
    const state = parseSavedState(JSON.stringify({ xp: 40, leftover: { big: 'blob' }, goals: [] }), now);
    expect(state.xp).toBe(40);
    expect(state).not.toHaveProperty('leftover');
    expect(Object.keys(state).sort()).toEqual(Object.keys(createInitialState(now)).sort());
    expect(parseSavedState('[1,2,3]', now).xp).toBe(0);
    expect(parseSavedState('42', now).xp).toBe(0);
    expect(parseSavedState('not json', now).xp).toBe(0);
  });

  it('starts with no own tracks and keeps a valid saved list', () => {
    expect(parseSavedState(null, now).ownTracks).toEqual([]);

    const state = parseSavedState(JSON.stringify({
      ownTracks: [
        { id: 'a', title: 'My Song', uri: 'file:///own/a.mp3' },
        { id: 'b', title: 'Second', uri: 'file:///own/b.mp3' },
      ],
    }), now);
    expect(state.ownTracks).toEqual([
      { id: 'a', title: 'My Song', uri: 'file:///own/a.mp3' },
      { id: 'b', title: 'Second', uri: 'file:///own/b.mp3' },
    ]);
  });

  it('drops a malformed own-track entry without losing the rest', () => {
    const state = parseSavedState(JSON.stringify({
      ownTracks: [
        { id: 'a', title: 'Good', uri: 'file:///own/a.mp3' },
        { title: 'No id', uri: 'file:///own/x.mp3' },
        { id: 'c', title: 'No uri' },
        null,
      ],
    }), now);
    expect(state.ownTracks).toEqual([
      { id: 'a', title: 'Good', uri: 'file:///own/a.mp3' },
    ]);
  });

  it('keeps a public streaming link and drops one that is not', () => {
    expect(parseSavedState(null, now).streamLinks).toEqual([]);
    const state = parseSavedState(JSON.stringify({
      streamLinks: [
        { url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=drop' },
        { url: 'https://example.com/playlist/1' },
        { url: 'https://music.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt' },
        null,
      ],
    }), now);
    expect(state.streamLinks.map((link) => link.id)).toEqual([
      'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
      'youtube-music:playlist:PLrAXtmRdnEQy6nuLMHjMZOz59Oq8xJbZt',
    ]);
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

  it('loads an older task as a task, and drops a stored goal', () => {
    const state = parseSavedState(JSON.stringify({
      tasks: [{ id: 1, text: 'Before subtasks', done: false, pomos: 2, doneOn: null }],
      goals: [{ id: 'g1', title: 'Chapter 5', date: '2026-12-01', target: null, minutes: 25, sessions: 1, done: false, paid: false }],
    }), now);
    expect(state.tasks[0]).toMatchObject({ parentId: null, date: null, open: false });
    expect(state).not.toHaveProperty('goals');

    const linked = parseSavedState(JSON.stringify({
      tasks: [{ id: 1, text: 'Linked', done: false, pomos: 0, doneOn: null, goalId: 'g1' }],
    }), now);
    expect(linked.tasks[0]).toMatchObject({ text: 'Linked', parentId: null, date: null });
  });

  it('keeps a subtask under its task and a real due date', () => {
    const state = parseSavedState(JSON.stringify({
      tasks: [
        { id: 1, text: 'Finish SQL course', done: false, pomos: 0, doneOn: null, date: '2026-11-13', open: true },
        { id: 2, text: 'Practice joins', done: true, pomos: 0, doneOn: null, parentId: 1, date: '2026-11-01', open: true },
        { id: 3, text: 'Orphan step', done: false, pomos: 0, doneOn: null, parentId: 9 },
        { id: 4, text: 'Bad day', done: false, pomos: 0, doneOn: null, date: '2026-02-31' },
      ],
      activeId: 2,
    }), now);
    expect(state.tasks[0]).toMatchObject({ date: '2026-11-13', open: true, parentId: null });
    expect(state.tasks[1]).toMatchObject({ parentId: 1, date: null, open: false });
    expect(state.tasks[2]).toMatchObject({ text: 'Orphan step', parentId: null });
    expect(state.tasks[3].date).toBeNull();
    expect(state.activeId).toBeNull();
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

  it('pulls in a deadline further off than the session, and keeps a valid one', () => {
    const totalMs = 25 * 60_000;
    const far = parseSavedState(JSON.stringify({
      session: { mode: 'focus', status: 'running', endAt: now + 10 * totalMs, remainingMs: totalMs, totalMs },
    }), now);
    expect(far.session.endAt).toBe(now + totalMs);
    const valid = parseSavedState(JSON.stringify({
      session: { mode: 'focus', status: 'running', endAt: now + 60_000, remainingMs: 60_000, totalMs },
    }), now);
    expect(valid.session.endAt).toBe(now + 60_000);
  });

  it('reads a task session count as a whole number, never below zero', () => {
    const task = (id: number, pomos: number) => ({ id, text: `t${id}`, done: false, pomos });
    const state = parseSavedState(JSON.stringify({ tasks: [task(1, -3), task(2, 2.7)] }), now);
    expect(state.tasks.map((item) => item.pomos)).toEqual([0, 2]);
  });
});
