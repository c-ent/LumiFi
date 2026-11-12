import { createInitialState, SavedState } from './saved-state';
import { createSessionRun, StageChange } from './session-run';

const T0 = new Date(2026, 10, 11, 9, 0, 0).getTime();
const MIN = 60000;

type AlarmCall = ['schedule', number, string] | ['cancel'];

// A session run wired to stand-ins: an in-memory state, an alarm that only
// records what it was asked, and a clock the test moves by hand.
function setup(overrides: Partial<SavedState> = {}, permission = { granted: true, asked: true }) {
  let state: SavedState = { ...createInitialState(T0), ...overrides };
  let time = T0;
  const alarmCalls: AlarmCall[] = [];
  const music = { start: jest.fn(), sessionEnded: jest.fn(), chime: jest.fn() };
  const shown: StageChange[] = [];
  // Set to hold the permission answer back, like a system prompt left open.
  let gate: Promise<void> | null = null;
  const run = createSessionRun({
    state: {
      get: () => state,
      commit: (next) => {
        state = next;
      },
    },
    alarm: {
      prepare: async () => {
        if (gate) await gate;
        return permission;
      },
      schedule: async (endAt, mode) => {
        alarmCalls.push(['schedule', endAt, mode]);
      },
      cancel: async () => {
        alarmCalls.push(['cancel']);
      },
    },
    music,
    show: (change) => shown.push(change),
    now: () => time,
    random: () => 0,
  });
  return {
    run,
    music,
    shown,
    alarmCalls,
    get: () => state,
    advance: (ms: number) => {
      time += ms;
    },
    holdPermission: () => {
      let release = () => {};
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },
  };
}

// The alarm that is left standing after everything asked so far.
function standingAlarm(calls: AlarmCall[]) {
  const last = calls[calls.length - 1];
  return last && last[0] === 'schedule' ? { endAt: last[1], mode: last[2] } : null;
}

describe('session run', () => {
  it('starts the clock and the music at once, then schedules one alarm at the deadline', async () => {
    const t = setup();
    const release = t.holdPermission();
    const starting = t.run.start();
    // Before the permission prompt is answered.
    expect(t.get().session.status).toBe('running');
    expect(t.get().session.endAt).toBe(T0 + 25 * MIN);
    expect(t.music.start).toHaveBeenCalledTimes(1);
    expect(t.alarmCalls).toEqual([]);
    release();
    await starting;
    expect(t.alarmCalls).toEqual([['schedule', T0 + 25 * MIN, 'focus']]);
    expect(t.get().notificationsAsked).toBe(true);
  });

  it('schedules nothing when the permission is refused, and remembers it was asked', async () => {
    const t = setup({}, { granted: false, asked: true });
    await t.run.start();
    expect(t.get().session.status).toBe('running');
    expect(t.alarmCalls).toEqual([]);
    expect(t.get().notificationsAsked).toBe(true);
  });

  it('ignores a second start while a session is running', async () => {
    const t = setup();
    const first = t.run.start();
    const second = t.run.start();
    await Promise.all([first, second]);
    expect(t.music.start).toHaveBeenCalledTimes(1);
    expect(t.alarmCalls).toHaveLength(1);
  });

  it.each(['reset', 'pause', 'skip'] as const)('does not bring the alarm back after a %s during the permission wait', async (action) => {
    const t = setup();
    const release = t.holdPermission();
    const starting = t.run.start();
    t.run[action]();
    release();
    await starting;
    expect(standingAlarm(t.alarmCalls)).toBeNull();
    expect(t.get().session.status).not.toBe('running');
  });

  it('does not bring the alarm back after a mode change during the permission wait', async () => {
    const t = setup();
    const release = t.holdPermission();
    const starting = t.run.start();
    t.run.changeMode('short');
    release();
    await starting;
    expect(standingAlarm(t.alarmCalls)).toBeNull();
    expect(t.get().session).toMatchObject({ mode: 'short', status: 'idle', remainingMs: 5 * MIN });
  });

  it('completes a session paused after its deadline instead of leaving it paused at zero', async () => {
    const t = setup();
    await t.run.start();
    t.advance(25 * MIN + 500);
    t.run.pause();
    expect(t.get().session.status).not.toBe('paused');
    expect(t.get().session.mode).toBe('short');
    expect(t.get().day.minutes).toBe(25);
    expect(t.music.chime).toHaveBeenCalledTimes(1);
  });

  it('cancels the alarm on pause and moves it to the new deadline on resume', async () => {
    const t = setup();
    await t.run.start();
    t.advance(10 * MIN);
    t.run.pause();
    expect(standingAlarm(t.alarmCalls)).toBeNull();
    expect(t.get().session).toMatchObject({ status: 'paused', endAt: null, remainingMs: 15 * MIN });
    t.advance(3 * MIN);
    await t.run.start();
    expect(standingAlarm(t.alarmCalls)).toEqual({ endAt: T0 + 28 * MIN, mode: 'focus' });
  });

  it('toggles between running and paused', async () => {
    const t = setup();
    t.run.toggle();
    expect(t.get().session.status).toBe('running');
    t.run.toggle();
    expect(t.get().session.status).toBe('paused');
  });

  it('resets to the full length, cancels the alarm and takes the end card down', async () => {
    const t = setup();
    await t.run.start();
    t.advance(4 * MIN);
    t.run.reset();
    expect(t.get().session).toMatchObject({ mode: 'focus', status: 'idle', endAt: null, remainingMs: 25 * MIN });
    expect(standingAlarm(t.alarmCalls)).toBeNull();
    expect(t.shown[t.shown.length - 1]).toEqual({ ending: null, settle: true });
  });

  it('does nothing when the deadline has not passed', async () => {
    const t = setup();
    await t.run.start();
    t.advance(24 * MIN);
    t.run.reachEnd();
    expect(t.get().session.status).toBe('running');
    expect(t.get().xp).toBe(0);
    expect(t.music.chime).not.toHaveBeenCalled();
  });

  it('pays a finished focus once, however often the clock reports it', async () => {
    const t = setup();
    await t.run.start();
    t.advance(25 * MIN);
    t.run.reachEnd();
    const paid = t.get().xp;
    expect(paid).toBeGreaterThan(0);
    expect(t.get().session).toMatchObject({ mode: 'short', status: 'idle' });
    t.run.reachEnd();
    t.run.reachEnd();
    expect(t.get().xp).toBe(paid);
    expect(t.music.chime).toHaveBeenCalledTimes(1);
  });

  it('ends gently: chime, the music setting, the end card, and no alarm left', async () => {
    const t = setup({ musicEnd: 'fade' });
    await t.run.start();
    t.advance(25 * MIN);
    t.run.reachEnd();
    expect(t.music.chime).toHaveBeenCalledTimes(1);
    expect(t.music.sessionEnded).toHaveBeenCalledWith('fade');
    expect(t.music.start).toHaveBeenCalledTimes(1);
    expect(standingAlarm(t.alarmCalls)).toBeNull();
    const last = t.shown[t.shown.length - 1];
    expect(last).toMatchObject({
      phaseChanged: true,
      finished: true,
      ending: { title: 'Focus finished', actionLabel: 'Start break', showLater: true },
    });
    expect(typeof last.message).toBe('string');
  });

  it('with auto-start, runs the break, keeps the music and schedules the break alarm', async () => {
    const t = setup({ auto: true, musicEnd: 'fade' });
    await t.run.start();
    t.advance(25 * MIN);
    t.run.reachEnd();
    expect(t.get().session).toMatchObject({ mode: 'short', status: 'running', endAt: T0 + 30 * MIN });
    expect(standingAlarm(t.alarmCalls)).toEqual({ endAt: T0 + 30 * MIN, mode: 'short' });
    expect(t.music.sessionEnded).not.toHaveBeenCalled();
    expect(t.music.start).toHaveBeenCalledTimes(2);
    expect(t.shown[t.shown.length - 1].ending).toMatchObject({ showLater: false });
  });

  it('shows the break card when a break finishes', async () => {
    const t = setup();
    t.run.changeMode('short');
    await t.run.start();
    t.advance(5 * MIN);
    t.run.reachEnd();
    expect(t.get().xp).toBe(0);
    expect(t.get().session).toMatchObject({ mode: 'focus', status: 'idle' });
    expect(t.shown[t.shown.length - 1].ending).toMatchObject({ title: 'Break finished', actionLabel: 'Start focus' });
  });

  it('skips to the break with no reward and no alarm', async () => {
    const t = setup();
    await t.run.start();
    t.advance(20 * MIN);
    t.run.skip();
    expect(t.get().xp).toBe(0);
    expect(t.get().session).toMatchObject({ mode: 'short', status: 'idle', remainingMs: 5 * MIN });
    expect(standingAlarm(t.alarmCalls)).toBeNull();
    expect(t.shown[t.shown.length - 1]).toEqual({ ending: null, settle: true, phaseChanged: true });
  });

  it('with auto-start, a skip from a running session keeps running and moves the alarm', async () => {
    const t = setup({ auto: true });
    await t.run.start();
    t.advance(20 * MIN);
    t.run.skip();
    expect(t.get().session).toMatchObject({ mode: 'short', status: 'running', endAt: T0 + 25 * MIN });
    expect(standingAlarm(t.alarmCalls)).toEqual({ endAt: T0 + 25 * MIN, mode: 'short' });
  });

  it('with auto-start, a skip from an idle session stays idle', () => {
    const t = setup({ auto: true });
    t.run.skip();
    expect(t.get().session).toMatchObject({ mode: 'short', status: 'idle' });
    expect(standingAlarm(t.alarmCalls)).toBeNull();
  });

  it('applies a new length to an idle session at once', () => {
    const t = setup();
    t.run.changeLengths({ focus: 50, short: 10, long: 20 });
    expect(t.get().cfg.focus).toBe(50);
    expect(t.get().session).toMatchObject({ status: 'idle', remainingMs: 50 * MIN, totalMs: 50 * MIN });
  });

  it('leaves a running session and its alarm alone when the lengths change', async () => {
    const t = setup();
    await t.run.start();
    const before = [...t.alarmCalls];
    t.run.changeLengths({ focus: 50, short: 10, long: 20 });
    expect(t.get().cfg.focus).toBe(50);
    expect(t.get().session).toMatchObject({ status: 'running', endAt: T0 + 25 * MIN, totalMs: 25 * MIN });
    expect(t.alarmCalls).toEqual(before);
  });

  describe('on launch', () => {
    const running = (): Partial<SavedState> => ({
      session: { mode: 'focus', status: 'running', endAt: T0 + 9 * MIN, remainingMs: 9 * MIN, totalMs: 25 * MIN },
    });

    it('gives a running session its alarm back', async () => {
      const t = setup(running());
      t.run.restoreAlarm();
      await Promise.resolve();
      await Promise.resolve();
      expect(t.alarmCalls).toEqual([['schedule', T0 + 9 * MIN, 'focus']]);
    });

    it('does nothing for a session that is not running', async () => {
      const t = setup();
      t.run.restoreAlarm();
      await Promise.resolve();
      await Promise.resolve();
      expect(t.alarmCalls).toEqual([]);
    });

    it('schedules nothing once it has been stopped', async () => {
      const t = setup(running());
      const release = t.holdPermission();
      const stop = t.run.restoreAlarm();
      stop();
      release();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(t.alarmCalls).toEqual([]);
    });
  });
});
