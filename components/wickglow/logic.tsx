import { calendarKey } from '@/src/core/calendar';
import { idleSession, pauseSession, startSession, takeCompletedSession } from '@/src/core/clock';
import type { OwnTrack, PlaylistEntry } from '@/src/core/own-tracks';
import { parseStreamLink, playbackFor, StreamLink } from '@/src/core/stream-links';
import { modeAfterSkip, modeDurationMs } from '@/src/core/phase';
import { focusEndLine, MusicEnd } from '@/src/core/session-end';
import { streakCount } from '@/src/core/streak';
import { colors } from '@/src/theme/tokens';
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addNotificationReceivedListener } from 'expo-notifications';
import { AppState, Linking, Platform, View } from 'react-native';
import type { PixelArtId } from '@/components/wickglow/domain/pixel-art-ids';
import { SavedState } from '@/components/wickglow/domain/saved-state';
import { deleteOwnTrackFile, pickOwnTracks } from '@/components/wickglow/domain/own-music';
import { checkStreamLink } from '@/components/wickglow/domain/stream-check';
import {
  addSubtask as addSubtaskState,
  addTask as addTaskState,
  focusTask as focusTaskState,
  removeTask as removeTaskState,
  renameTask as renameTaskState,
  rollToToday,
  setTaskDate as setTaskDateState,
  setTaskOpen as setTaskOpenState,
  timerProgress,
  toggleTask,
} from '@/components/wickglow/domain/session';
import { silenceAmbientMix } from '@/components/wickglow/domain/silence-ambient';
import { AMBIENT_KEYS, useAmbient } from '@/components/wickglow/hooks/use-ambient';
import { useBackgroundAudio } from '@/components/wickglow/hooks/use-background-audio';
import { useMusic } from '@/components/wickglow/hooks/use-music';
import { useSessionClock } from '@/components/wickglow/hooks/use-session-clock';
import { SESSION_NOTIFICATION_ID, cancelSessionEnd, prepareNotificationPermission, scheduleSessionEnd } from '@/components/wickglow/domain/notifications';
import { loadWickglowState, saveWickglowState } from '@/components/wickglow/domain/storage';
import {
  levelInfo,
  MixLevels,
  MOODS,
  MoodId,
  SCENES,
  SceneId,
  Task,
  TimerCfg,
  TimerMode,
} from '@/components/wickglow/theme';

/**
 * logic.tsx is the app's brain. Think of it like a Next.js/React Context
 * provider that wraps the whole app: every screen calls `useWickglow()` to read
 * state (xp, tasks, timer) and call actions (toggle, skip, addTask).
 *
 * How the pieces fit:
 * - `WickglowProvider` loads the saved state from AsyncStorage (async, so it
 *   renders a blank dark view until ready), then mounts `WickglowSession`.
 * - `WickglowSession` owns the live state, wires up the music/ambient audio and
 *   the session clock, and builds one big `value` object for the context.
 * - The actual rules (XP, streaks, quests, deadlines) are NOT here. They are
 *   pure functions in `src/core` and `domain/session.ts`; this file only calls
 *   them and stores the result. That keeps components free of game logic.
 *
 * Two patterns you'll see a lot:
 * - `savedRef` mirrors `saved` state. Timers, listeners and notifications fire
 *   later and would otherwise read a stale value from an old render's closure.
 * - `commit(next)` = update state AND write to storage right away. Plain
 *   `setSaved` updates state only; the persist effect saves it afterwards.
 */

// The "Focus finished" card shown after a session completes (session-end-card.tsx).
interface SessionEnding {
  title: string;
  line: string;
  actionLabel: string;
  /** Hide the "Later" button when the next session already auto-started. */
  showLater: boolean;
}

// Everything screens can read or call. Grouped: values first, then actions.
interface WickglowContextValue {
  cfg: TimerCfg;
  auto: boolean;
  zenOpt: boolean;
  scene: SceneId;
  mood: MoodId;
  videoBg: boolean;
  pixelBg: PixelArtId | null;
  sceneTheme: (typeof SCENES)[number];
  moodTheme: (typeof MOODS)[number];
  xp: number;
  level: number;
  levelName: string;
  xpInLevel: number;
  xpNeeded: number;
  streak: number;
  now: number;
  day: SavedState['day'];
  days: SavedState['days'];
  tasks: Task[];
  activeTask: Task | null;
  cycle: number;
  mix: MixLevels;
  musicEnd: MusicEnd;
  mode: TimerMode;
  status: SavedState['session']['status'];
  running: boolean;
  remaining: number;
  total: number;
  progress: number;
  toast: string | null;
  smoke: boolean;
  dimming: boolean;
  ending: SessionEnding | null;
  swap: number;
  musicPlaying: boolean;
  musicLoop: boolean;
  playlist: PlaylistEntry[];
  trackIndex: number;
  trackTitle: string;
  trackArtist: string;
  ownTracks: OwnTrack[];
  addOwnFiles: () => void;
  removeOwnTrack: (id: string) => void;
  streamLinks: StreamLink[];
  activeStreamId: string | null;
  addStreamLink: (raw: string) => Promise<'added' | 'empty' | 'unsupported' | 'private' | 'duplicate' | 'stale'>;
  removeStreamLink: (id: string) => void;
  openStream: (id: string) => void;
  closeStream: () => void;
  setMode: (mode: TimerMode) => void;
  toggle: () => void;
  startNext: () => void;
  dismissEnding: () => void;
  reset: () => void;
  skip: () => void;
  setScene: (scene: SceneId) => void;
  setMood: (mood: MoodId) => void;
  setVideoBg: (value: boolean) => void;
  setPixelBg: (id: PixelArtId) => void;
  setAuto: (value: boolean) => void;
  setZenOpt: (value: boolean) => void;
  setMusicEnd: (value: MusicEnd) => void;
  applyPreset: (cfg: TimerCfg) => void;
  setDuration: (key: keyof TimerCfg, minutes: number) => void;
  addTask: (text: string, date: string | null) => void;
  addSubtask: (parentId: number, text: string) => void;
  renameTask: (id: number, text: string) => void;
  setTaskDate: (id: number, date: string | null) => void;
  setTaskOpen: (id: number, open: boolean) => void;
  removeTask: (id: number) => void;
  toggleTask: (id: number) => void;
  focusTask: (id: number) => void;
  setMix: (key: keyof MixLevels, value: number) => void;
  silenceAmbient: () => void;
  toggleMusic: () => void;
  play: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleMusicLoop: () => void;
  selectTrack: (index: number) => void;
}

const WickglowContext = createContext<WickglowContextValue | null>(null);

// Outer shell: just loads the save file. Splitting it from WickglowSession means
// the session hooks can assume `saved` is never null.
export function WickglowProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<SavedState | null>(null);

  // Load once on mount. `active` guards against setting state after unmount.
  useEffect(() => {
    let active = true;
    loadWickglowState().then((state) => {
      if (active) setSaved(state);
    });
    return () => {
      active = false;
    };
  }, []);

  // Blank dark view while loading, so there's no white flash on a dark-only app.
  if (!saved) {
    return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />;
  }

  return (
    <WickglowSession saved={saved} setSaved={setSaved}>
      {children}
    </WickglowSession>
  );
}

function WickglowSession({
  saved,
  setSaved,
  children,
}: {
  saved: SavedState;
  setSaved: React.Dispatch<React.SetStateAction<SavedState | null>>;
  children: React.ReactNode;
}) {
  // The clock hook calls this when time runs out. It's a ref so the hook can be
  // set up first; `finish` (defined below) is assigned into it later.
  const onReachEnd = useRef<() => void>(() => {});
  // Audio. Sliders store 0..100; the players want 0..1, hence the `/ 100`.
  const music = useMusic(saved.mix.music / 100, saved.ownTracks, saved.musicLoop);
  const ambient = useAmbient({
    rain: saved.mix.rain / 100,
    cafe: saved.mix.cafe / 100,
    fire: saved.mix.fire / 100,
    wind: saved.mix.wind / 100,
    clock: saved.mix.clock / 100,
    brown: saved.mix.brown / 100,
    forest: saved.mix.forest / 100,
    keyboard: saved.mix.keyboard / 100,
    waves: saved.mix.waves / 100,
  });
  useBackgroundAudio(music.player, music.musicPlaying, music.trackTitle, music.trackArtist, ambient);
  // "Latest value" refs. Callbacks created once (timers, listeners) read these
  // instead of the render-time variables, which would be stale by then.
  const savedRef = useRef(saved);
  const musicRef = useRef(music);
  const ambientRef = useRef(ambient);
  useEffect(() => {
    savedRef.current = saved;
    musicRef.current = music;
    ambientRef.current = ambient;
  });
  const clock = useSessionClock(saved.session, onReachEnd);

  // Short-lived UI state (not saved): toast text, current time, end-of-session
  // effects, and `swap`, a counter that bumps on a phase change so animations replay.
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [smoke, setSmoke] = useState(false);
  const [dimming, setDimming] = useState(false);
  const [ending, setEnding] = useState<SessionEnding | null>(null);
  const [swap, setSwap] = useState(0);
  // Timer ids, kept so they can be cleared on re-trigger and on unmount.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skip the first persist run so loading doesn't immediately re-write the file.
  const persistReady = useRef(false);
  // Guards against a double tap on Start running `begin` twice.
  const starting = useRef(false);
  // The `endAt` already completed, so one session can never pay out twice.
  const handledEndAt = useRef<number | null>(null);
  // When the chime last played, to avoid a double chime (in-app + notification).
  const chimeAt = useRef(0);
  const activeStreamIdRef = useRef<string | null>(null);
  const heldForEmbed = useRef(false);
  // Counts addStreamLink submissions so only the latest one may save.
  const streamRequest = useRef(0);
  const resumeWhenActive = useRef(false);
  const leftForStream = useRef(false);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  // An external service app pauses the local player. Resume only after Wickglow
  // has actually been in the background and come back, so the handoff itself
  // does not count as closing it.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        if (resumeWhenActive.current) leftForStream.current = true;
        return;
      }
      if (!resumeWhenActive.current || !leftForStream.current) return;
      resumeWhenActive.current = false;
      leftForStream.current = false;
      const resume = heldForEmbed.current;
      heldForEmbed.current = false;
      if (resume) musicRef.current.play();
    });
    return () => subscription.remove();
  }, []);

  // Show a message for ~3.6s. A new toast replaces the old one and restarts the timer.
  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  };

  // Update state AND save immediately. Used for important changes (session
  // start/finish) where the ref must be current right away and we don't want to
  // wait for the effect below. Also sets the ref first so the next read is fresh.
  const commit = (next: SavedState) => {
    savedRef.current = next;
    setSaved(next);
    void saveWickglowState(next);
  };

  // Safety net: any state change made via plain `setSaved` gets persisted here.
  useEffect(() => {
    if (!persistReady.current) {
      persistReady.current = true;
      return;
    }
    void saveWickglowState(saved);
  }, [saved]);

  // On app launch: if a session was running when the app closed, re-schedule
  // its end-of-session notification (the OS may have dropped it).
  useEffect(() => {
    const session = savedRef.current.session;
    if (session.status !== 'running' || session.endAt == null) return undefined;
    let cancelled = false;
    void (async () => {
      const permission = await prepareNotificationPermission(true);
      const latest = savedRef.current.session;
      if (cancelled || !permission.granted || latest.status !== 'running' || latest.endAt == null) return;
      await scheduleSessionEnd(latest.endAt, latest.mode);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Every 15s: refresh "now" and roll the day over. `now` only changes when the
  // calendar day changes (so most ticks cause no re-render). `rollToToday`
  // moves "today" stats into history once midnight passes, even if the app was
  // left open overnight.
  useEffect(() => {
    const tick = () => {
      const nextNow = Date.now();
      setNow((current) => (
        current != null && calendarKey(current) === calendarKey(nextNow) ? current : nextNow
      ));
      setSaved((current) => {
        const base = savedRef.current ?? current;
        return base ? rollToToday(base, nextNow) : base;
      });
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [setSaved]);

  // Unmount cleanup: cancel any pending timeouts.
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (smokeTimer.current) clearTimeout(smokeTimer.current);
    if (dimTimer.current) clearTimeout(dimTimer.current);
  }, []);

  // Play the soft end chime at most once per 8s. Two things can trigger it for
  // the same session end (the in-app finish and the arriving notification).
  const playEndChime = () => {
    const playedAt = Date.now();
    if (playedAt - chimeAt.current < 8000) return;
    chimeAt.current = playedAt;
    musicRef.current.playChime();
  };

  // Native only: when the end-of-session notification arrives while the app is
  // open, play the chime (the OS only plays the sound if the app is closed).
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const subscription = addNotificationReceivedListener((notification) => {
      if (notification.request.identifier !== SESSION_NOTIFICATION_ID) return;
      playEndChime();
    });
    return () => subscription.remove();
  }, []);

  // A session reached its deadline. All reward math happens inside
  // `takeCompletedSession` (src/core); this function applies the result:
  // saves the new state, plays the gentle end effects and shows the end card.
  const finish = () => {
    const current = savedRef.current;
    const endAt = current.session.endAt;
    // Already handled this exact deadline (the clock can fire more than once).
    if (endAt == null || handledEndAt.current === endAt) return;
    const outcome = takeCompletedSession(current, current.session, Date.now(), current.auto);
    if (!outcome.completed) return;
    handledEndAt.current = endAt;
    commit({ ...outcome.state, session: outcome.clock });
    setSwap((value) => value + 1);
    // Gentle end: smoke wisp for 2.4s, flame dims for 1s, soft chime, then music
    // is lowered or faded per the user's setting. No harsh alarm.
    setSmoke(true);
    setDimming(true);
    if (smokeTimer.current) clearTimeout(smokeTimer.current);
    smokeTimer.current = setTimeout(() => setSmoke(false), 2400);
    if (dimTimer.current) clearTimeout(dimTimer.current);
    dimTimer.current = setTimeout(() => setDimming(false), 1000);
    playEndChime();
    musicRef.current.onSessionEnd(current.musicEnd);
    if (outcome.completedMode === 'focus') {
      setEnding({
        title: 'Focus finished',
        line: focusEndLine(Math.random),
        actionLabel: 'Start break',
        showLater: !outcome.autoStarted,
      });
    } else if (outcome.completedMode != null) {
      setEnding({
        title: 'Break finished',
        line: 'Your break is complete.',
        actionLabel: 'Start focus',
        showLater: !outcome.autoStarted,
      });
    }
    const message = outcome.messages[outcome.messages.length - 1];
    if (message) showToast(message);
    // With auto-start the next phase is already running, so schedule its alarm.
    if (outcome.clock.status === 'running' && outcome.clock.endAt != null) {
      void scheduleSessionEnd(outcome.clock.endAt, outcome.clock.mode);
    } else {
      void cancelSessionEnd();
    }
  };

  // Point the clock's callback at the latest `finish` after every render.
  // useLayoutEffect (not useEffect) so it's set before the next timer tick.
  useLayoutEffect(() => {
    onReachEnd.current = finish;
  });

  // Start (or resume) the timer.
  const begin = async () => {
    if (starting.current) return;
    const current = savedRef.current;
    if (current.session.status === 'running') return;
    starting.current = true;
    try {
      const latest = savedRef.current;
      if (latest.session.status === 'running') return;
      const started = startSession(latest.session, Date.now());
      setEnding(null);
      musicRef.current.restoreMusic();
      // Start the track before the notification work below. That work is a
      // chain of native calls and can take hundreds of milliseconds, so
      // awaiting it first left the music audibly behind the timer.
      // A streaming embed is the music for this session. Starting a session
      // does not also start the local player while an embed is up.
      if (!activeStreamIdRef.current) {
        resumeWhenActive.current = false;
        leftForStream.current = false;
        heldForEmbed.current = false;
        musicRef.current.play();
      }
      const permission = await prepareNotificationPermission(latest.notificationsAsked);
      commit({ ...savedRef.current, session: started, notificationsAsked: permission.asked });
      if (permission.granted && started.endAt != null) await scheduleSessionEnd(started.endAt, started.mode);
    } finally {
      starting.current = false;
    }
  };

  // Pause keeps the remaining time; the scheduled notification is cancelled
  // because the old end time no longer applies.
  const pause = () => {
    const current = savedRef.current;
    if (current.session.status !== 'running') return;
    commit({ ...current, session: pauseSession(current.session, Date.now()) });
    setEnding(null);
    void cancelSessionEnd();
  };

  // Change timer lengths. If the current phase's length changed and it isn't
  // running, reset it so the new length shows immediately. A running session
  // keeps its old deadline.
  const updateCfg = (cfg: TimerCfg) => {
    const current = savedRef.current;
    const durationChanged = cfg[current.session.mode] !== current.cfg[current.session.mode];
    const session = durationChanged && current.session.status !== 'running'
      ? idleSession(current.session.mode, modeDurationMs(cfg, current.session.mode))
      : current.session;
    commit({ ...current, cfg, session });
  };

  // The user started local music while an embed was up: drop the embed and
  // forget the "resume later" bookkeeping, since local audio now takes over.
  const releaseStreamForLocal = () => {
    resumeWhenActive.current = false;
    leftForStream.current = false;
    heldForEmbed.current = false;
    if (!activeStreamIdRef.current) return;
    activeStreamIdRef.current = null;
    setActiveStreamId(null);
  };

  // End the stream (unmounts the player) and resume local music if we paused it.
  const closeStream = () => {
    activeStreamIdRef.current = null;
    setActiveStreamId(null);
    resumeWhenActive.current = false;
    leftForStream.current = false;
    const resume = heldForEmbed.current;
    heldForEmbed.current = false;
    if (resume) musicRef.current.play();
  };

  // Start a saved streaming link. Embeds show in-app; "open" links (YouTube
  // Music) hand off to the other app. Local music is paused either way, because
  // two things playing at once is never wanted.
  const openStream = (id: string) => {
    const link = savedRef.current.streamLinks.find((item) => item.id === id);
    if (!link) return;
    const playback = playbackFor(link);
    // On the web, opening YouTube Music leaves this page in place, so the
    // local player keeps going. Native hands the screen to the other app.
    if (playback.kind === 'open' && Platform.OS === 'web') {
      if (activeStreamIdRef.current) closeStream();
      Linking.openURL(link.url).catch(() => showToast('Could not open that link'));
      return;
    }
    if (!activeStreamIdRef.current) heldForEmbed.current = musicRef.current.musicPlaying;
    musicRef.current.pause();
    if (playback.kind === 'open') {
      activeStreamIdRef.current = null;
      setActiveStreamId(null);
      resumeWhenActive.current = true;
      leftForStream.current = false;
      Linking.openURL(link.url).catch(() => {
        showToast('Could not open that link');
        closeStream();
      });
      return;
    }
    resumeWhenActive.current = false;
    leftForStream.current = false;
    activeStreamIdRef.current = id;
    setActiveStreamId(id);
  };

  // Derived values, computed fresh each render rather than stored.
  const levels = levelInfo(saved.xp);
  const total = modeDurationMs(saved.cfg, saved.session.mode);
  const activeTask = saved.tasks.find((task) => task.id === saved.activeId) ?? null;

  // The context value: what every screen sees through `useWickglow()`. Actions
  // that touch the timer use `commit` (instant save). Simple setting toggles
  // use `setSaved((current) => ...)`, the functional form, so two quick changes
  // can't overwrite each other. The `current ? ... : current` check is only
  // there to satisfy TypeScript, since `saved` is nullable in the setter type.
  const value: WickglowContextValue = {
      cfg: saved.cfg,
      auto: saved.auto,
      zenOpt: saved.zenOpt,
      scene: saved.scene,
      mood: saved.mood,
      videoBg: saved.videoBg,
      pixelBg: saved.pixelBg,
      sceneTheme: SCENES.find((item) => item.id === saved.scene) ?? SCENES[0],
      moodTheme: MOODS.find((item) => item.id === saved.mood) ?? MOODS[0],
      xp: saved.xp,
      level: levels.level,
      levelName: levels.name,
      xpInLevel: levels.left,
      xpNeeded: levels.need,
      // Shown streak is recomputed against "now", so a missed day reads 0 even
      // before anything has been saved.
      streak: now == null ? 0 : streakCount(saved.streak, now),
      now: now ?? 0,
      day: saved.day,
      days: saved.days,
      tasks: saved.tasks,
      activeTask,
      cycle: saved.cycle,
      mix: saved.mix,
      musicEnd: saved.musicEnd,
      mode: saved.session.mode,
      status: saved.session.status,
      running: clock.running,
      remaining: clock.remaining,
      total,
      progress: timerProgress(clock.remaining, total),
      toast,
      smoke,
      dimming,
      ending,
      swap,
      musicPlaying: music.musicPlaying,
      musicLoop: saved.musicLoop,
      playlist: music.playlist,
      trackIndex: music.trackIndex,
      trackTitle: music.trackTitle,
      trackArtist: music.trackArtist,
      ownTracks: saved.ownTracks,
      streamLinks: saved.streamLinks,
      activeStreamId,
      setMode: (next) => {
        const current = savedRef.current;
        commit({ ...current, session: idleSession(next, modeDurationMs(current.cfg, next)) });
        setEnding(null);
        setDimming(false);
        setSwap((value) => value + 1);
        void cancelSessionEnd();
      },
      toggle: () => {
        if (savedRef.current.session.status === 'running') pause();
        else void begin();
      },
      startNext: () => {
        void begin();
      },
      dismissEnding: () => setEnding(null),
      reset: () => {
        const current = savedRef.current;
        commit({
          ...current,
          session: idleSession(current.session.mode, modeDurationMs(current.cfg, current.session.mode)),
        });
        setEnding(null);
        setDimming(false);
        void cancelSessionEnd();
      },
      // Skip jumps to the next phase WITHOUT awarding XP (only a completed
      // session pays out). It keeps running only if auto-start is on.
      skip: () => {
        const current = savedRef.current;
        const nowMs = Date.now();
        const nextMode = modeAfterSkip(current.session.mode, current.cycle);
        const duration = modeDurationMs(current.cfg, nextMode);
        const keepRunning = current.session.status === 'running' && current.auto;
        const session = keepRunning
          ? startSession(idleSession(nextMode, duration), nowMs)
          : idleSession(nextMode, duration);
        commit({ ...current, session });
        setEnding(null);
        setDimming(false);
        setSwap((count) => count + 1);
        if (session.status === 'running' && session.endAt != null) void scheduleSessionEnd(session.endAt, session.mode);
        else void cancelSessionEnd();
      },
      // Picking a scene or mood puts the gradient back; the video is its own choice.
      setScene: (scene) => setSaved((current) => (current ? { ...current, scene, videoBg: false, pixelBg: null } : current)),
      setMood: (mood) => setSaved((current) => (current ? { ...current, mood, videoBg: false, pixelBg: null } : current)),
      setVideoBg: (videoBg) => setSaved((current) => (current ? { ...current, videoBg, pixelBg: videoBg ? null : current.pixelBg } : current)),
      setPixelBg: (pixelBg) => setSaved((current) => (current ? { ...current, pixelBg, videoBg: false } : current)),
      setAuto: (auto) => setSaved((current) => (current ? { ...current, auto } : current)),
      setZenOpt: (zenOpt) => setSaved((current) => (current ? { ...current, zenOpt } : current)),
      setMusicEnd: (musicEnd) => setSaved((current) => (current ? { ...current, musicEnd } : current)),
      applyPreset: updateCfg,
      setDuration: (key, minutes) => updateCfg({ ...savedRef.current.cfg, [key]: minutes }),
      // Task actions delegate to pure functions in domain/session.ts. Those that
      // can earn a reward return `messages`; the last one is shown as a toast.
      addTask: (text, date) => setSaved((current) => (
        current ? addTaskState(current, text, date, Date.now()) : current
      )),
      addSubtask: (parentId, text) => {
        setSaved((current) => {
          if (!current) return current;
          const result = addSubtaskState(current, parentId, text, Date.now());
          const message = result.messages[result.messages.length - 1];
          if (message) showToast(message);
          return result.state;
        });
      },
      renameTask: (id, text) => setSaved((current) => (
        current ? renameTaskState(current, id, text) : current
      )),
      setTaskDate: (id, date) => setSaved((current) => (
        current ? setTaskDateState(current, id, date) : current
      )),
      setTaskOpen: (id, open) => setSaved((current) => (
        current ? setTaskOpenState(current, id, open) : current
      )),
      removeTask: (id) => {
        setSaved((current) => {
          if (!current) return current;
          const result = removeTaskState(current, id, Date.now());
          const message = result.messages[result.messages.length - 1];
          if (message) showToast(message);
          return result.state;
        });
      },
      toggleTask: (id) => {
        setSaved((current) => {
          if (!current) return current;
          const result = toggleTask(current, id, Date.now());
          const message = result.messages[result.messages.length - 1];
          if (message) showToast(message);
          return result.state;
        });
      },
      focusTask: (id) => setSaved((current) => (current ? focusTaskState(current, id) : current)),
      // A volume slider moved. Ambient sounds are pushed to the player right away
      // (`sync`) so dragging feels live; then the value is saved in state.
      setMix: (key, amount) => {
        if (key === 'music') {
          musicRef.current.restoreMusic();
        } else {
          ambientRef.current.sync(key, amount / 100);
        }
        setSaved((current) => (
          current ? { ...current, mix: { ...current.mix, [key]: amount } } : current
        ));
      },
      silenceAmbient: () => {
        for (const key of AMBIENT_KEYS) ambientRef.current.sync(key, 0);
        setSaved((current) => (current ? { ...current, mix: silenceAmbientMix(current.mix) } : current));
      },
      toggleMusic: () => {
        releaseStreamForLocal();
        music.toggleMusic();
      },
      play: () => {
        releaseStreamForLocal();
        music.play();
      },
      nextTrack: () => {
        if (musicRef.current.musicPlaying) releaseStreamForLocal();
        music.nextTrack();
      },
      prevTrack: () => {
        if (musicRef.current.musicPlaying) releaseStreamForLocal();
        music.prevTrack();
      },
      toggleMusicLoop: () => setSaved((current) => (
        current ? { ...current, musicLoop: !current.musicLoop } : current
      )),
      selectTrack: (index) => {
        releaseStreamForLocal();
        music.selectTrack(index);
      },
      // Own music files (native only): open the file picker, copy the picks into
      // the app's private folder, then add them to the saved list.
      addOwnFiles: () => {
        void pickOwnTracks().then((picked) => {
          if (!picked || picked.length === 0) return;
          setSaved((current) => (
            current ? { ...current, ownTracks: [...current.ownTracks, ...picked] } : current
          ));
          showToast(picked.length === 1 ? '1 file added' : `${picked.length} files added`);
        }).catch(() => {
          showToast('Could not add those files');
        });
      },
      removeOwnTrack: (id) => {
        // Delete the file once, here, not inside the updater: React may run an
        // updater twice, and a file-system call is a side effect.
        // Read the rendered state the remove button came from; `savedRef` is only
        // synced in an effect and can lag a render behind.
        const track = saved.ownTracks.find((item) => item.id === id);
        if (track) deleteOwnTrackFile(track.id);
        setSaved((current) => (
          current ? { ...current, ownTracks: current.ownTracks.filter((item) => item.id !== id) } : current
        ));
      },
      // Validate a pasted link, check it isn't private, and save it. Returns a
      // string code the UI turns into a message. Re-reads `savedRef` after the
      // network check because state may have changed while we awaited.
      addStreamLink: async (raw) => {
        const parsed = parseStreamLink(raw);
        if (!parsed.ok) return parsed.reason;
        // One saved link at a time: a new link replaces the old one.
        const isSaved = (links: StreamLink[]) => links.length === 1 && links[0].id === parsed.link.id;
        // Count this submission before the duplicate check, so re-submitting the
        // saved link also supersedes any older check still in flight.
        const requestId = ++streamRequest.current;
        if (isSaved(savedRef.current.streamLinks)) return 'duplicate';
        const visibility = await checkStreamLink(parsed.link);
        // A newer submission started while this check ran: drop this result.
        if (requestId !== streamRequest.current) return 'stale';
        if (visibility === 'private') return 'private';
        const current = savedRef.current;
        if (isSaved(current.streamLinks)) return 'duplicate';
        commit({ ...current, streamLinks: [parsed.link] });
        showToast('Link added');
        return 'added';
      },
      removeStreamLink: (id) => {
        if (activeStreamIdRef.current === id) closeStream();
        setSaved((current) => (
          current ? { ...current, streamLinks: current.streamLinks.filter((item) => item.id !== id) } : current
        ));
      },
      openStream,
      closeStream,
  };

  // Wait for the first clock tick so no screen ever renders with an unknown date.
  if (now == null) {
    return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />;
  }

  return <WickglowContext.Provider value={value}>{children}</WickglowContext.Provider>;
}

/** Read app state and actions. Throws if used outside `WickglowProvider`. */
export function useWickglow() {
  const value = useContext(WickglowContext);
  if (!value) throw new Error('useWickglow must be used inside WickglowProvider');
  return value;
}
