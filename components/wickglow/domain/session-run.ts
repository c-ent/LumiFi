import { idleSession, isSameRun, pauseSession, sessionAwaitingCompletion, startSession, takeCompletedSession } from '@/src/core/clock';
import { modeAfterSkip, modeDurationMs } from '@/src/core/phase';
import { focusEndLine, MusicEnd } from '@/src/core/session-end';
import type { TimerCfg, TimerMode } from '@/src/core/types';
import type { SavedState } from './saved-state';

// Every way a session can change: start, pause, reset, skip, a mode change, a
// length change, and reaching its deadline. Each one saves the new clock and
// does everything that has to go with it, so the rules below hold in one
// place instead of in each button's handler:
//
// - Exactly one session-end alarm is scheduled, at the running session's
//   `endAt`. Every change here either moves it there or cancels it.
// - A deadline pays out once, however many times the clock reports it.
// - The end card comes down on any change the user makes.
//
// The clock math and the rewards are pure functions in `src/core`. This module
// is the order they are called in. It has no React and no Expo: the saved
// state, the alarm, the music, the screen effects and the time are handed in,
// which is what lets the tests run it.

/** The card shown after a session completes (session-end-card.tsx). */
export interface SessionEnding {
  title: string;
  line: string;
  actionLabel: string;
  /** Hide the "Later" button when the next session already auto-started. */
  showLater: boolean;
}

/** The session-end notification. `domain/notifications.ts` on a device. */
export interface SessionAlarm {
  /** Sets up the channel and asks for the permission, unless already asked. */
  prepare: (alreadyAsked: boolean) => Promise<{ granted: boolean; asked: boolean }>;
  /** Moves the one alarm to `endAt`. */
  schedule: (endAt: number, mode: TimerMode) => Promise<void>;
  cancel: () => Promise<void>;
}

export interface SessionMusic {
  /** A session is starting: full volume again, and playing. */
  start: () => void;
  /** A session ended and the next one did not start: apply the user's setting. */
  sessionEnded: (setting: MusicEnd) => void;
  /** The soft end chime. */
  chime: () => void;
}

/** What the screen should do after a change. A field left out means "leave it". */
export interface StageChange {
  /** The end card to show, or null to take it down. */
  ending?: SessionEnding | null;
  /** Stop the flame's end-of-session dimming. */
  settle?: boolean;
  /** The phase changed, so its entrance animation replays. */
  phaseChanged?: boolean;
  /** A session just completed: the smoke wisp and the dimming flame. */
  finished?: boolean;
  /** A short message for the toast. */
  message?: string;
}

export interface SessionRunPorts {
  state: { get: () => SavedState; commit: (next: SavedState) => void };
  alarm: SessionAlarm;
  music: SessionMusic;
  show: (change: StageChange) => void;
  now: () => number;
  random: () => number;
}

export interface SessionRun {
  /** Start, or resume from a pause. Does nothing while a session is running. */
  start: () => Promise<void>;
  pause: () => void;
  /** Pause when running, start otherwise. */
  toggle: () => void;
  /** Back to the full length of the current mode. */
  reset: () => void;
  /** On to the next phase with no reward. Keeps running only with auto-start on. */
  skip: () => void;
  changeMode: (mode: TimerMode) => void;
  changeLengths: (cfg: TimerCfg) => void;
  /** The clock saw the deadline pass. Safe to call more than once. */
  reachEnd: () => void;
  /**
   * On launch: a session that was running when the app closed gets its alarm
   * back, since the system may have dropped it. Returns a function that stops
   * the work if the app goes away first.
   */
  restoreAlarm: () => () => void;
}

export function createSessionRun({ state, alarm, music, show, now, random }: SessionRunPorts): SessionRun {
  // The `endAt` already completed, so one session can never pay out twice.
  let handledEndAt: number | null = null;

  const start = async () => {
    const latest = state.get();
    // The commit below is in place before this function first waits, so a
    // double tap on Start finds the session already running and stops here.
    if (latest.session.status === 'running') return;
    const started = startSession(latest.session, now());
    show({ ending: null });
    // The clock and the music start now. The alarm work below is a chain of
    // native calls, and on first run a system prompt the user has to answer;
    // waiting for it first left the timer looking idle while its deadline was
    // already counting, and the music audibly behind.
    music.start();
    state.commit({ ...latest, session: started });
    const permission = await alarm.prepare(latest.notificationsAsked);
    const after = state.get();
    if (after.notificationsAsked !== permission.asked) state.commit({ ...after, notificationsAsked: permission.asked });
    // A pause, reset, skip or mode change during the wait has already moved or
    // cancelled the alarm. Scheduling this run's deadline now would bring a
    // stale one back.
    if (permission.granted && started.endAt != null && isSameRun(state.get().session, started)) {
      await alarm.schedule(started.endAt, started.mode);
    }
  };

  // Pause keeps the remaining time. The alarm is cancelled because the old end
  // time no longer applies.
  const pause = () => {
    const current = state.get();
    if (current.session.status !== 'running') return;
    // A pause that lands after the deadline but before the clock noticed it
    // would leave the session paused at 0:00 with nothing paid. It completes.
    if (sessionAwaitingCompletion(current.session, now())) {
      reachEnd();
      return;
    }
    state.commit({ ...current, session: pauseSession(current.session, now()) });
    show({ ending: null });
    void alarm.cancel();
  };

  const toggle = () => {
    if (state.get().session.status === 'running') pause();
    else void start();
  };

  const reset = () => {
    const current = state.get();
    state.commit({
      ...current,
      session: idleSession(current.session.mode, modeDurationMs(current.cfg, current.session.mode)),
    });
    show({ ending: null, settle: true });
    void alarm.cancel();
  };

  // Skip awards nothing: only a completed session pays out.
  const skip = () => {
    const current = state.get();
    const nextMode = modeAfterSkip(current.session.mode, current.cycle);
    const duration = modeDurationMs(current.cfg, nextMode);
    const keepRunning = current.session.status === 'running' && current.auto;
    const session = keepRunning
      ? startSession(idleSession(nextMode, duration), now())
      : idleSession(nextMode, duration);
    state.commit({ ...current, session });
    show({ ending: null, settle: true, phaseChanged: true });
    if (session.status === 'running' && session.endAt != null) void alarm.schedule(session.endAt, session.mode);
    else void alarm.cancel();
  };

  const changeMode = (mode: TimerMode) => {
    const current = state.get();
    state.commit({ ...current, session: idleSession(mode, modeDurationMs(current.cfg, mode)) });
    show({ ending: null, settle: true, phaseChanged: true });
    void alarm.cancel();
  };

  // If the current phase's length changed and it isn't running, it is reset so
  // the new length shows at once. A running session keeps its deadline, so its
  // alarm stays where it is.
  const changeLengths = (cfg: TimerCfg) => {
    const current = state.get();
    const durationChanged = cfg[current.session.mode] !== current.cfg[current.session.mode];
    const session = durationChanged && current.session.status !== 'running'
      ? idleSession(current.session.mode, modeDurationMs(cfg, current.session.mode))
      : current.session;
    state.commit({ ...current, cfg, session });
  };

  // All reward math happens inside `takeCompletedSession` (src/core); this
  // applies the result: saves it, plays the gentle end and shows the end card.
  const reachEnd = () => {
    const current = state.get();
    const endAt = current.session.endAt;
    if (endAt == null || handledEndAt === endAt) return;
    const outcome = takeCompletedSession(current, current.session, now(), current.auto);
    if (!outcome.completed) return;
    handledEndAt = endAt;
    state.commit({ ...outcome.state, session: outcome.clock });
    music.chime();
    // With auto-start the next phase is already running, and no `start` will
    // come along to bring the music back. Lowering or fading it here would
    // leave that whole phase quiet, so it gets the same music a manual start
    // gives it. Otherwise the user's session-end setting applies.
    if (outcome.autoStarted) music.start();
    else music.sessionEnded(current.musicEnd);
    show({
      phaseChanged: true,
      finished: true,
      ending: endingFor(outcome.completedMode, outcome.autoStarted, random),
      message: outcome.messages[outcome.messages.length - 1],
    });
    // With auto-start the next phase is already running, so its alarm is set.
    if (outcome.clock.status === 'running' && outcome.clock.endAt != null) {
      void alarm.schedule(outcome.clock.endAt, outcome.clock.mode);
    } else {
      void alarm.cancel();
    }
  };

  const restoreAlarm = () => {
    const session = state.get().session;
    if (session.status !== 'running' || session.endAt == null) return () => {};
    let stopped = false;
    void (async () => {
      const permission = await alarm.prepare(true);
      const latest = state.get().session;
      if (stopped || !permission.granted || latest.status !== 'running' || latest.endAt == null) return;
      await alarm.schedule(latest.endAt, latest.mode);
    })();
    return () => {
      stopped = true;
    };
  };

  return { start, pause, toggle, reset, skip, changeMode, changeLengths, reachEnd, restoreAlarm };
}

function endingFor(mode: TimerMode | null, autoStarted: boolean, random: () => number): SessionEnding | undefined {
  if (mode == null) return undefined;
  if (mode === 'focus') {
    return { title: 'Focus finished', line: focusEndLine(random), actionLabel: 'Start break', showLater: !autoStarted };
  }
  return { title: 'Break finished', line: 'Your break is complete.', actionLabel: 'Start focus', showLater: !autoStarted };
}
