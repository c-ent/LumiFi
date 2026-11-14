import { calendarKey } from '@/src/core/calendar';
import { MAX_OWN_TRACKS, type OwnTrack, type PlaylistEntry } from '@/src/core/own-tracks';
import { activeStreamId as activeStreamOf, LOCAL_SOURCE, MusicSource, MusicSourceEvent, stepMusicSource } from '@/src/core/music-source';
import { parseStreamLink, playbackFor, StreamLink } from '@/src/core/stream-links';
import type { MusicEnd } from '@/src/core/session-end';
import { streakCount } from '@/src/core/streak';
import { trackLength, trackPosition } from '@/src/core/track-time';
import { type AudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors } from '@/src/theme/tokens';
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { addNotificationReceivedListener } from 'expo-notifications';
import { AppState, Linking, Platform, View } from 'react-native';
import type { PixelArtId } from '@/components/wickglow/domain/pixel-art-ids';
import type { VideoId } from '@/components/wickglow/domain/video-ids';
import { SavedState } from '@/components/wickglow/domain/saved-state';
import { createSavedStore, SavedStore } from '@/components/wickglow/domain/saved-store';
import { createSessionRun, SessionEnding, SessionRun, StageChange } from '@/components/wickglow/domain/session-run';
import { deleteOwnTrackFile, pickOwnTracks } from '@/components/wickglow/domain/own-music';
import { checkStreamLink } from '@/components/wickglow/domain/stream-check';
import { timerProgress } from '@/src/core/deadline';
import { rollToToday } from '@/src/core/history';
import { addSubtask as addSubtaskState, removeTask as removeTaskState, toggleTask } from '@/src/core/session';
import {
  addTask as addTaskState,
  focusTask as focusTaskState,
  renameTask as renameTaskState,
  setTaskDate as setTaskDateState,
  setTaskOpen as setTaskOpenState,
} from '@/src/core/tasks';
import { silenceAmbientMix } from '@/components/wickglow/domain/silence-ambient';
import { AMBIENT_KEYS } from '@/src/core/ambient';
import { useAmbient } from '@/components/wickglow/hooks/use-ambient';
import { useBackgroundAudio } from '@/components/wickglow/hooks/use-background-audio';
import { useMusic } from '@/components/wickglow/hooks/use-music';
import { useSessionClock } from '@/components/wickglow/hooks/use-session-clock';
import { SESSION_NOTIFICATION_ID, cancelSessionEnd, prepareNotificationPermission, scheduleSessionEnd } from '@/components/wickglow/domain/notifications';
import { loadWickglowState, saveWickglowState } from '@/components/wickglow/domain/storage';
import { AccountProvider } from '@/components/wickglow/features/account/account';
import { KeepProgressCard } from '@/components/wickglow/features/account/keep-progress-card';
import { SignOutCard } from '@/components/wickglow/features/account/sign-out-card';
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
 * - `WickglowSession` wires the pieces together and builds one big `value`
 *   object for the context. It holds little of its own:
 *   - the saved state lives in a store (domain/saved-store.ts), which is the
 *     only thing that changes it and decides when it is written;
 *   - every timer change (start, pause, reset, skip, finish) goes through the
 *     session run (domain/session-run.ts), which also keeps the one
 *     session-end alarm in step;
 *   - which player owns the sound is src/core/music-source.ts.
 * - The actual rules (XP, streaks, quests, deadlines) are NOT here. They are
 *   pure functions in `src/core`; this file only calls them and stores the
 *   result. That keeps components free of game logic.
 *
 * Reading and changing the saved state:
 * - `store.get()` is the newest saved state. Timers, listeners and
 *   notifications fire later and would otherwise read a stale value from an
 *   old render's closure, so anything that runs later reads the store.
 * - `store.commit(next)` = change state AND write to storage right away.
 *   `store.update(fn)` changes state and writes a moment later, once the
 *   changes stop coming.
 */

// How long a `store.update` change waits before it is written. A slider drag
// lands as one write instead of one per step.
const SAVE_DELAY_MS = 300;

// The music-source events that are a playback choice by the user.
const PLAYBACK_CHOICES = new Set<MusicSourceEvent['type']>(['playLocal', 'openEmbed', 'handOff', 'closeStream']);

// What screens can read. It changes only when something on screen changes: the
// once-a-second clock is kept out of it, in `WickglowClock` below.
interface WickglowState {
  cfg: TimerCfg;
  auto: boolean;
  zenOpt: boolean;
  scene: SceneId;
  mood: MoodId;
  videoBg: VideoId | null;
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
  total: number;
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
  streamLinks: StreamLink[];
  activeStreamId: string | null;
}

// What screens can call. Every function keeps the same identity for the life of
// the provider, so a component can destructure one and hand it to a child
// without causing a re-render.
interface WickglowActions {
  addOwnFiles: () => void;
  removeOwnTrack: (id: string) => void;
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
  setVideoBg: (value: VideoId | null) => void;
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
  /** Moves the local track to this many seconds in. */
  seekMusic: (seconds: number) => void;
}

type WickglowContextValue = WickglowState & WickglowActions;

// The countdown. It changes every second while a session runs, so it has its
// own context: only the time and the candle read it, and a tick re-renders
// those two and nothing else.
interface WickglowClock {
  remaining: number;
  /** Time left as 0..1 of the length this session was started at. */
  progress: number;
}

const WickglowContext = createContext<WickglowContextValue | null>(null);
const ClockContext = createContext<WickglowClock | null>(null);
// The local music player itself, for the progress bar. The player's identity
// never changes, so this context never re-renders anything; the bar reads the
// position with its own status subscription (`useMusicPosition`).
const MusicPlayerContext = createContext<AudioPlayer | null>(null);

/**
 * Owns the ticking state, so a tick re-renders this small component and the
 * clock's readers, not `WickglowSession` and every screen under it.
 */
function ClockProvider({
  session,
  onReachEnd,
  children,
}: {
  session: SavedState['session'];
  onReachEnd: React.RefObject<() => void>;
  children: React.ReactNode;
}) {
  const { remaining } = useSessionClock(session, onReachEnd);
  // The length this session was started at, not the current setting: a length
  // changed while a session runs applies to the next one, and must not make
  // the candle and ring jump in this one.
  const progress = timerProgress(remaining, session.totalMs);
  const value = useMemo(() => ({ remaining, progress }), [progress, remaining]);
  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

// Every action name, once. `satisfies` makes this a compile error if an action
// is added to `WickglowActions` and left out here.
const ACTION_NAMES = Object.keys({
  addOwnFiles: true,
  removeOwnTrack: true,
  addStreamLink: true,
  removeStreamLink: true,
  openStream: true,
  closeStream: true,
  setMode: true,
  toggle: true,
  startNext: true,
  dismissEnding: true,
  reset: true,
  skip: true,
  setScene: true,
  setMood: true,
  setVideoBg: true,
  setPixelBg: true,
  setAuto: true,
  setZenOpt: true,
  setMusicEnd: true,
  applyPreset: true,
  setDuration: true,
  addTask: true,
  addSubtask: true,
  renameTask: true,
  setTaskDate: true,
  setTaskOpen: true,
  removeTask: true,
  toggleTask: true,
  focusTask: true,
  setMix: true,
  silenceAmbient: true,
  toggleMusic: true,
  play: true,
  nextTrack: true,
  prevTrack: true,
  toggleMusicLoop: true,
  selectTrack: true,
  seekMusic: true,
} satisfies Record<keyof WickglowActions, true>) as (keyof WickglowActions)[];

/**
 * Gives each action a wrapper that never changes and calls the newest version.
 * The actions themselves are rebuilt every render (they close over that
 * render's music player and helpers); screens get these wrappers instead, so
 * an action's identity is the same for the life of the provider.
 */
function useStableActions(actions: WickglowActions): WickglowActions {
  const latest = useRef(actions);
  // useLayoutEffect, so the newest set is in place before anything can be pressed.
  useLayoutEffect(() => {
    latest.current = actions;
  });
  return useMemo(() => {
    const bound: Partial<Record<keyof WickglowActions, (...args: never[]) => unknown>> = {};
    for (const name of ACTION_NAMES) {
      bound[name] = (...args: never[]) => (latest.current[name] as (...input: never[]) => unknown)(...args);
    }
    return bound as WickglowActions;
  }, []);
}

// What the provider hands the session run, rebuilt every render.
interface SessionRunHooks {
  startMusic: () => void;
  endMusic: (setting: MusicEnd) => void;
  chime: () => void;
  show: (change: StageChange) => void;
}

/**
 * Builds the session run once and keeps it for the life of the provider. It
 * holds which deadline has already paid out, so it must not be rebuilt. The
 * hooks are rebuilt every render, so the run calls the newest ones through a
 * ref, the same way `useStableActions` does.
 */
function useSessionRun(store: SavedStore<SavedState>, hooks: SessionRunHooks): SessionRun {
  const latest = useRef(hooks);
  useLayoutEffect(() => {
    latest.current = hooks;
  });
  // The ref is only read when the run later calls one of these, after a press
  // or a tick, never while rendering. The rule cannot see into the call.
  // eslint-disable-next-line react-hooks/refs
  return useMemo(() => createSessionRun({
    state: store,
    alarm: { prepare: prepareNotificationPermission, schedule: scheduleSessionEnd, cancel: cancelSessionEnd },
    music: {
      start: () => latest.current.startMusic(),
      sessionEnded: (setting) => latest.current.endMusic(setting),
      chime: () => latest.current.chime(),
    },
    show: (change) => latest.current.show(change),
    now: Date.now,
    random: Math.random,
  }), [store]);
}

// Outer shell: just loads the save file. Splitting it from WickglowSession means
// the session can build its store from a state that is never null.
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
    <WickglowSession loaded={saved}>
      {children}
    </WickglowSession>
  );
}

function WickglowSession({ loaded, children }: { loaded: SavedState; children: React.ReactNode }) {
  // The saved state, and every write of it. Seeded with the loaded state, so
  // loading doesn't immediately re-write the file.
  const [store] = useState(() => createSavedStore<SavedState>(
    loaded,
    (state) => saveWickglowState(state),
    SAVE_DELAY_MS,
  ));
  const saved = useSyncExternalStore(store.subscribe, store.get, store.get);
  // Audio. Sliders store 0..100; the music player wants 0..1, hence the
  // `/ 100`. The ambient players take the slider levels as they are.
  const music = useMusic(saved.mix.music / 100, saved.ownTracks, saved.musicLoop);
  const ambient = useAmbient(saved.mix);
  useBackgroundAudio(music.player, music.musicPlaying, music.trackTitle, music.trackArtist, ambient, saved.mix);
  // "Latest value" refs. Callbacks created once (timers, listeners) read these
  // instead of the render-time variables, which would be stale by then.
  const musicRef = useRef(music);
  const ambientRef = useRef(ambient);
  useEffect(() => {
    musicRef.current = music;
    ambientRef.current = ambient;
  });
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
  // When the chime last played, to avoid a double chime (in-app + notification).
  const chimeAt = useRef(0);
  // Counts addStreamLink submissions so only the latest one may save.
  const streamRequest = useRef(0);
  // True while a file pick and copy is running, so a second press cannot start
  // another one against the same free room.
  const importing = useRef(false);
  // Counts hand-offs to another app, so a late failure of an old one cannot
  // close a stream that has taken over since.
  const handOffCount = useRef(0);
  // Which player owns the sound: the local one, an embed, or another app. The
  // rules are in src/core/music-source.ts; `sendSource` is the only writer.
  const sourceRef = useRef<MusicSource>(LOCAL_SOURCE);
  // Counts the user's playback choices (local play, an embed, a hand-off, a
  // close), so a link check that finishes late cannot override a newer one.
  const playIntent = useRef(0);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  const sendSource = (event: MusicSourceEvent) => {
    if (PLAYBACK_CHOICES.has(event.type)) playIntent.current += 1;
    const step = stepMusicSource(sourceRef.current, event);
    sourceRef.current = step.source;
    setActiveStreamId(activeStreamOf(step.source));
    if (step.local === 'pause') musicRef.current.pause();
    else if (step.local === 'play') musicRef.current.play();
  };

  // Another app pauses the local player. The music source resumes it only
  // after Wickglow has actually been in the background and come back.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      sendSource({ type: next === 'active' ? 'appActive' : 'appBackground' });
    });
    return () => subscription.remove();
  }, []);

  // Show a message for ~3.6s. A new toast replaces the old one and restarts the timer.
  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  };

  // A task change that can pay a reward. The rule runs once, outside any React
  // updater, so its toast cannot fire twice; the last message is the one shown.
  const step = (change: (current: SavedState) => { state: SavedState; messages: string[] }) => {
    const result = change(store.get());
    store.update(() => result.state);
    const message = result.messages[result.messages.length - 1];
    if (message) showToast(message);
  };

  // A waiting save must not be lost: write it as soon as the app leaves the
  // foreground (on web, when the tab is hidden or closed). On unmount the store
  // writes it and retires, so none of its retries can land on top of what a
  // remounted provider's store writes later.
  useEffect(() => {
    store.revive();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') store.flush();
    });
    return () => {
      subscription.remove();
      store.dispose();
    };
  }, [store]);

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
      // Returns the same state unless the day changed, which is no change.
      store.update((current) => rollToToday(current, nextNow));
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [store]);

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

  // The music a session starts with: full volume again after a session-end
  // lowering or fade, and the local track playing. A streaming embed is the
  // music for the session while it is up, so the local player stays out of it.
  const startSessionMusic = () => {
    musicRef.current.restoreMusic();
    sendSource({ type: 'sessionStart' });
  };

  // What the screen does after a timer change. The gentle end: a smoke wisp
  // for 2.4s and the flame dimming for 1s. No harsh alarm.
  const show = (change: StageChange) => {
    if (change.ending !== undefined) setEnding(change.ending);
    if (change.settle) setDimming(false);
    if (change.phaseChanged) setSwap((value) => value + 1);
    if (change.finished) {
      setSmoke(true);
      setDimming(true);
      if (smokeTimer.current) clearTimeout(smokeTimer.current);
      smokeTimer.current = setTimeout(() => setSmoke(false), 2400);
      if (dimTimer.current) clearTimeout(dimTimer.current);
      dimTimer.current = setTimeout(() => setDimming(false), 1000);
    }
    if (change.message) showToast(change.message);
  };

  // Every timer change goes through here (domain/session-run.ts). It is built
  // once: everything handed in reads refs or the store, never a render's values.
  const run = useSessionRun(store, {
    startMusic: startSessionMusic,
    endMusic: (setting) => musicRef.current.onSessionEnd(setting),
    chime: playEndChime,
    show,
  });
  // The clock calls this when time runs out.
  const onReachEnd = useRef(run.reachEnd);

  // On app launch: if a session was running when the app closed, re-schedule
  // its end-of-session notification (the OS may have dropped it).
  useEffect(() => run.restoreAlarm(), [run]);

  // The user started local music while an embed was up: drop the embed and
  // forget the "resume later" bookkeeping, since local audio now takes over.
  const releaseStreamForLocal = () => sendSource({ type: 'playLocal' });

  // End the stream (unmounts the player) and resume local music if we paused it.
  const closeStream = () => sendSource({ type: 'closeStream' });

  // Start a saved streaming link. Embeds show in-app; "open" links (YouTube
  // Music) hand off to the other app. Local music is paused either way, because
  // two things playing at once is never wanted.
  const openStream = (id: string) => {
    const link = store.get().streamLinks.find((item) => item.id === id);
    if (!link) return;
    const playback = playbackFor(link);
    // On the web, YouTube Music opens in another tab and plays there, so the
    // local player is paused to keep one thing playing. It is not resumed on
    // its own: there is no telling when that tab stops. Native hands the
    // screen to the other app.
    if (playback.kind === 'open' && Platform.OS === 'web') {
      sendSource({ type: 'playLocal' });
      musicRef.current.pause();
      Linking.openURL(link.url).catch(() => showToast('Could not open that link'));
      return;
    }
    const localPlaying = musicRef.current.musicPlaying;
    if (playback.kind === 'open') {
      const handOff = ++handOffCount.current;
      sendSource({ type: 'handOff', localPlaying });
      Linking.openURL(link.url).catch(() => {
        showToast('Could not open that link');
        // Only undo this hand-off if it is still the one in charge.
        if (handOff === handOffCount.current && sourceRef.current.kind === 'handoff') closeStream();
      });
      return;
    }
    handOffCount.current += 1;
    sendSource({ type: 'openEmbed', streamId: id, localPlaying });
  };

  // Derived values are computed here rather than stored. The memo keeps the
  // object's identity until one of its inputs changes, so a render caused by
  // something screens do not show (the music player's position updates, a
  // few times a second) does not re-render them.
  const state: WickglowState = useMemo(() => {
    const levels = levelInfo(saved.xp);
    return {
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
      activeTask: saved.tasks.find((task) => task.id === saved.activeId) ?? null,
      cycle: saved.cycle,
      mix: saved.mix,
      musicEnd: saved.musicEnd,
      mode: saved.session.mode,
      status: saved.session.status,
      running: saved.session.status === 'running',
      total: saved.session.totalMs,
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
    };
  }, [
    activeStreamId, dimming, ending, music.musicPlaying, music.playlist, music.trackArtist, music.trackIndex,
    music.trackTitle, now, saved, smoke, swap, toast,
  ]);

  // Timer actions go to the session run. Everything else changes the saved
  // state with `store.update((current) => ...)`, or `step` when the change can
  // show a toast.
  const actions: WickglowActions = {
      setMode: run.changeMode,
      toggle: run.toggle,
      startNext: () => {
        void run.start();
      },
      dismissEnding: () => setEnding(null),
      reset: run.reset,
      skip: run.skip,
      // Picking a scene or mood puts the gradient back; the video is its own choice.
      setScene: (scene) => store.update((current) => ({ ...current, scene, videoBg: null, pixelBg: null })),
      setMood: (mood) => store.update((current) => ({ ...current, mood, videoBg: null, pixelBg: null })),
      setVideoBg: (videoBg) => store.update((current) => ({ ...current, videoBg, pixelBg: videoBg ? null : current.pixelBg })),
      setPixelBg: (pixelBg) => store.update((current) => ({ ...current, pixelBg, videoBg: null })),
      setAuto: (auto) => store.update((current) => ({ ...current, auto })),
      setZenOpt: (zenOpt) => store.update((current) => ({ ...current, zenOpt })),
      setMusicEnd: (musicEnd) => store.update((current) => ({ ...current, musicEnd })),
      applyPreset: run.changeLengths,
      setDuration: (key, minutes) => run.changeLengths({ ...store.get().cfg, [key]: minutes }),
      // Task actions delegate to pure functions in src/core. Those that
      // can earn a reward return `messages`; the last one is shown as a toast.
      addTask: (text, date) => store.update((current) => (addTaskState(current, text, date, Date.now()))),
      addSubtask: (parentId, text) => step((current) => addSubtaskState(current, parentId, text, Date.now())),
      renameTask: (id, text) => store.update((current) => (renameTaskState(current, id, text))),
      setTaskDate: (id, date) => store.update((current) => (setTaskDateState(current, id, date))),
      setTaskOpen: (id, open) => store.update((current) => (setTaskOpenState(current, id, open))),
      removeTask: (id) => step((current) => removeTaskState(current, id, Date.now())),
      toggleTask: (id) => step((current) => toggleTask(current, id, Date.now())),
      focusTask: (id) => store.update((current) => (focusTaskState(current, id))),
      // A volume slider moved. Ambient sounds are pushed to the player right away
      // (`sync`) so dragging feels live; then the value is saved in state.
      setMix: (key, amount) => {
        if (key === 'music') {
          musicRef.current.restoreMusic();
        } else {
          ambientRef.current.sync(key, amount);
        }
        store.update((current) => ({ ...current, mix: { ...current.mix, [key]: amount } }));
      },
      silenceAmbient: () => {
        for (const key of AMBIENT_KEYS) ambientRef.current.sync(key, 0);
        store.update((current) => ({ ...current, mix: silenceAmbientMix(current.mix) }));
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
      toggleMusicLoop: () => store.update((current) => ({ ...current, musicLoop: !current.musicLoop })),
      selectTrack: (index) => {
        releaseStreamForLocal();
        music.selectTrack(index);
      },
      seekMusic: (seconds) => music.seekTo(seconds),
      // Own music files (native only): open the file picker, copy the picks into
      // the app's private folder, then add them to the saved list.
      addOwnFiles: () => {
        if (importing.current) return;
        const room = MAX_OWN_TRACKS - store.get().ownTracks.length;
        if (room <= 0) {
          showToast(`Your list is full (${MAX_OWN_TRACKS} files)`);
          return;
        }
        importing.current = true;
        void pickOwnTracks(room).then((picked) => {
          // null is a cancelled pick. An empty list means every copy failed.
          if (!picked) return;
          if (picked.length === 0) {
            showToast('Could not add those files');
            return;
          }
          // Re-read the room: the list can have changed while the files copied.
          // A copied file that no longer fits is deleted, never left orphaned.
          const free = Math.max(0, MAX_OWN_TRACKS - store.get().ownTracks.length);
          const accepted = picked.slice(0, free);
          for (const extra of picked.slice(free)) deleteOwnTrackFile(extra.id);
          if (accepted.length === 0) {
            showToast(`Your list is full (${MAX_OWN_TRACKS} files)`);
            return;
          }
          store.update((current) => ({ ...current, ownTracks: [...current.ownTracks, ...accepted] }));
          showToast(accepted.length === 1 ? '1 file added' : `${accepted.length} files added`);
        }).catch(() => {
          showToast('Could not add those files');
        }).finally(() => {
          importing.current = false;
        });
      },
      removeOwnTrack: (id) => {
        // Delete the file here, not inside the change function, which should
        // stay free of side effects.
        const track = store.get().ownTracks.find((item) => item.id === id);
        if (track) deleteOwnTrackFile(track.id);
        store.update((current) => ({ ...current, ownTracks: current.ownTracks.filter((item) => item.id !== id) }));
      },
      // Validate a pasted link, check it isn't private, save it and play it.
      // Returns a string code the UI turns into a message. Re-reads the store
      // after the network check because state may have changed while we awaited.
      addStreamLink: async (raw) => {
        // Count every submission, even one that fails to parse, so any newer
        // submission supersedes an older check still in flight.
        const requestId = ++streamRequest.current;
        const parsed = parseStreamLink(raw);
        if (!parsed.ok) return parsed.reason;
        // One saved link at a time: a new link replaces the old one.
        const isSaved = (links: StreamLink[]) => links.length === 1 && links[0].id === parsed.link.id;
        if (isSaved(store.get().streamLinks)) {
          openStream(parsed.link.id);
          return 'duplicate';
        }
        const intent = playIntent.current;
        const visibility = await checkStreamLink(parsed.link);
        // A newer submission started while this check ran: drop this result.
        if (requestId !== streamRequest.current) return 'stale';
        if (visibility === 'private') return 'private';
        const current = store.get();
        if (!isSaved(current.streamLinks)) {
          store.commit({ ...current, streamLinks: [parsed.link] });
          showToast('Link added');
        }
        // The link is kept either way, but it only starts playing if the user
        // has not picked something else to play while it was being checked.
        if (intent === playIntent.current) openStream(parsed.link.id);
        return isSaved(current.streamLinks) ? 'duplicate' : 'added';
      },
      removeStreamLink: (id) => {
        if (activeStreamOf(sourceRef.current) === id) closeStream();
        store.update((current) => ({ ...current, streamLinks: current.streamLinks.filter((item) => item.id !== id) }));
      },
      openStream,
      closeStream,
  };

  // Screens get wrappers with a fixed identity that call the newest actions.
  const stableActions = useStableActions(actions);

  // What every screen sees through `useWickglow()`.
  const value: WickglowContextValue = useMemo(() => ({ ...state, ...stableActions }), [stableActions, state]);

  // The providers are mounted from the first render, so the clock starts (and a
  // session that ended while the app was closed is completed) in the same
  // order as before. Only the screens wait for the first day tick, so none
  // ever renders with an unknown date.
  return (
    <WickglowContext.Provider value={value}>
      <MusicPlayerContext.Provider value={music.player}>
        <ClockProvider session={saved.session} onReachEnd={onReachEnd}>
          {/* The account syncs the same store (domain/account-sync.ts). */}
          <AccountProvider store={store} notify={showToast}>
            {now == null ? <View style={{ flex: 1, backgroundColor: colors.bgBase }} /> : children}
            <KeepProgressCard />
            <SignOutCard />
          </AccountProvider>
        </ClockProvider>
      </MusicPlayerContext.Provider>
    </WickglowContext.Provider>
  );
}

/**
 * The countdown: time left and progress. Only the time and the candle should
 * call this, because whatever does re-renders every second while a session runs.
 */
export function useWickglowClock() {
  const value = useContext(ClockContext);
  if (!value) throw new Error('useWickglowClock must be used inside WickglowProvider');
  return value;
}

/**
 * Where the local track is, in seconds. Subscribes to the player's status in
 * the calling component only, so its updates (a few a second) re-render the
 * progress bar and nothing else. `length` is 0 until the track has loaded.
 */
export function useMusicPosition() {
  const player = useContext(MusicPlayerContext);
  if (!player) throw new Error('useMusicPosition must be used inside WickglowProvider');
  const status = useAudioPlayerStatus(player);
  const length = trackLength(status.duration);
  return { position: trackPosition(status.currentTime, length), length };
}

/** Read app state and actions. Throws if used outside `WickglowProvider`. */
export function useWickglow() {
  const value = useContext(WickglowContext);
  if (!value) throw new Error('useWickglow must be used inside WickglowProvider');
  return value;
}
