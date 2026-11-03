import { calendarKey } from '@/src/core/calendar';
import { idleSession, pauseSession, startSession, takeCompletedSession } from '@/src/core/clock';
import { modeAfterSkip, modeDurationMs } from '@/src/core/phase';
import { focusEndLine, MusicEnd } from '@/src/core/session-end';
import { streakCount } from '@/src/core/streak';
import { colors } from '@/src/theme/tokens';
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addNotificationReceivedListener } from 'expo-notifications';
import { Platform, View } from 'react-native';
import { SavedState } from '@/components/lumifi/domain/saved-state';
import { rollToToday, timerProgress, toggleTask } from '@/components/lumifi/domain/session';
import { silenceAmbientMix } from '@/components/lumifi/domain/silence-ambient';
import { AMBIENT_KEYS, useAmbient } from '@/components/lumifi/hooks/use-ambient';
import { useBackgroundAudio } from '@/components/lumifi/hooks/use-background-audio';
import { useMusic } from '@/components/lumifi/hooks/use-music';
import { useSessionClock } from '@/components/lumifi/hooks/use-session-clock';
import { SESSION_NOTIFICATION_ID, cancelSessionEnd, prepareNotificationPermission, scheduleSessionEnd } from '@/components/lumifi/domain/notifications';
import { loadLumiFiState, saveLumiFiState } from '@/components/lumifi/domain/storage';
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
} from '@/components/lumifi/theme';

interface SessionEnding {
  title: string;
  line: string;
  actionLabel: string;
  showLater: boolean;
}

interface LumiFiContextValue {
  cfg: TimerCfg;
  auto: boolean;
  zenOpt: boolean;
  scene: SceneId;
  mood: MoodId;
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
  trackIndex: number;
  trackTitle: string;
  trackArtist: string;
  setMode: (mode: TimerMode) => void;
  toggle: () => void;
  startNext: () => void;
  dismissEnding: () => void;
  reset: () => void;
  skip: () => void;
  setScene: (scene: SceneId) => void;
  setMood: (mood: MoodId) => void;
  setAuto: (value: boolean) => void;
  setZenOpt: (value: boolean) => void;
  setMusicEnd: (value: MusicEnd) => void;
  applyPreset: (cfg: TimerCfg) => void;
  setDuration: (key: keyof TimerCfg, minutes: number) => void;
  addTask: (text: string) => void;
  toggleTask: (id: number) => void;
  focusTask: (id: number) => void;
  setMix: (key: keyof MixLevels, value: number) => void;
  silenceAmbient: () => void;
  toggleMusic: () => void;
  play: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  selectTrack: (index: number) => void;
}

const LumiFiContext = createContext<LumiFiContextValue | null>(null);

export function LumiFiProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<SavedState | null>(null);

  useEffect(() => {
    let active = true;
    loadLumiFiState().then((state) => {
      if (active) setSaved(state);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!saved) {
    return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />;
  }

  return (
    <LumiFiSession saved={saved} setSaved={setSaved}>
      {children}
    </LumiFiSession>
  );
}

function LumiFiSession({
  saved,
  setSaved,
  children,
}: {
  saved: SavedState;
  setSaved: React.Dispatch<React.SetStateAction<SavedState | null>>;
  children: React.ReactNode;
}) {
  const onReachEnd = useRef<() => void>(() => {});
  const music = useMusic(saved.mix.music / 100);
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
  const savedRef = useRef(saved);
  const musicRef = useRef(music);
  const ambientRef = useRef(ambient);
  useEffect(() => {
    savedRef.current = saved;
    musicRef.current = music;
    ambientRef.current = ambient;
  });
  const clock = useSessionClock(saved.session, onReachEnd);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [smoke, setSmoke] = useState(false);
  const [dimming, setDimming] = useState(false);
  const [ending, setEnding] = useState<SessionEnding | null>(null);
  const [swap, setSwap] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistReady = useRef(false);
  const starting = useRef(false);
  const handledEndAt = useRef<number | null>(null);
  const chimeAt = useRef(0);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  };

  const commit = (next: SavedState) => {
    savedRef.current = next;
    setSaved(next);
    void saveLumiFiState(next);
  };

  useEffect(() => {
    if (!persistReady.current) {
      persistReady.current = true;
      return;
    }
    void saveLumiFiState(saved);
  }, [saved]);

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

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (smokeTimer.current) clearTimeout(smokeTimer.current);
    if (dimTimer.current) clearTimeout(dimTimer.current);
  }, []);

  const playEndChime = () => {
    const playedAt = Date.now();
    if (playedAt - chimeAt.current < 8000) return;
    chimeAt.current = playedAt;
    musicRef.current.playChime();
  };

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const subscription = addNotificationReceivedListener((notification) => {
      if (notification.request.identifier !== SESSION_NOTIFICATION_ID) return;
      playEndChime();
    });
    return () => subscription.remove();
  }, []);

  const finish = () => {
    const current = savedRef.current;
    const endAt = current.session.endAt;
    if (endAt == null || handledEndAt.current === endAt) return;
    const outcome = takeCompletedSession(current, current.session, Date.now(), current.auto);
    if (!outcome.completed) return;
    handledEndAt.current = endAt;
    commit({ ...outcome.state, session: outcome.clock });
    setSwap((value) => value + 1);
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
    if (outcome.clock.status === 'running' && outcome.clock.endAt != null) {
      void scheduleSessionEnd(outcome.clock.endAt, outcome.clock.mode);
    } else {
      void cancelSessionEnd();
    }
  };

  useLayoutEffect(() => {
    onReachEnd.current = finish;
  });

  const begin = async () => {
    if (starting.current) return;
    const current = savedRef.current;
    if (current.session.status === 'running') return;
    starting.current = true;
    try {
      const permission = await prepareNotificationPermission(current.notificationsAsked);
      const latest = savedRef.current;
      if (latest.session.status === 'running') return;
      const started = startSession(latest.session, Date.now());
      commit({ ...latest, session: started, notificationsAsked: permission.asked });
      setEnding(null);
      musicRef.current.restoreMusic();
      if (started.mode === 'focus') musicRef.current.play();
      if (permission.granted && started.endAt != null) await scheduleSessionEnd(started.endAt, started.mode);
    } finally {
      starting.current = false;
    }
  };

  const pause = () => {
    const current = savedRef.current;
    if (current.session.status !== 'running') return;
    commit({ ...current, session: pauseSession(current.session, Date.now()) });
    setEnding(null);
    void cancelSessionEnd();
  };

  const updateCfg = (cfg: TimerCfg) => {
    const current = savedRef.current;
    const durationChanged = cfg[current.session.mode] !== current.cfg[current.session.mode];
    const session = durationChanged && current.session.status !== 'running'
      ? idleSession(current.session.mode, modeDurationMs(cfg, current.session.mode))
      : current.session;
    commit({ ...current, cfg, session });
  };

  const levels = levelInfo(saved.xp);
    const total = modeDurationMs(saved.cfg, saved.session.mode);
    const activeTask = saved.tasks.find((task) => task.id === saved.activeId) ?? null;
  const value: LumiFiContextValue = {
      cfg: saved.cfg,
      auto: saved.auto,
      zenOpt: saved.zenOpt,
      scene: saved.scene,
      mood: saved.mood,
      sceneTheme: SCENES.find((item) => item.id === saved.scene) ?? SCENES[0],
      moodTheme: MOODS.find((item) => item.id === saved.mood) ?? MOODS[0],
      xp: saved.xp,
      level: levels.level,
      levelName: levels.name,
      xpInLevel: levels.left,
      xpNeeded: levels.need,
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
      trackIndex: music.trackIndex,
      trackTitle: music.trackTitle,
      trackArtist: music.trackArtist,
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
      setScene: (scene) => setSaved((current) => (current ? { ...current, scene } : current)),
      setMood: (mood) => setSaved((current) => (current ? { ...current, mood } : current)),
      setAuto: (auto) => setSaved((current) => (current ? { ...current, auto } : current)),
      setZenOpt: (zenOpt) => setSaved((current) => (current ? { ...current, zenOpt } : current)),
      setMusicEnd: (musicEnd) => setSaved((current) => (current ? { ...current, musicEnd } : current)),
      applyPreset: updateCfg,
      setDuration: (key, minutes) => updateCfg({ ...savedRef.current.cfg, [key]: minutes }),
      addTask: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const id = Date.now();
        setSaved((current) => (
          current
            ? { ...current, tasks: [{ id, text: trimmed, done: false, pomos: 0 }, ...current.tasks], activeId: id }
            : current
        ));
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
      focusTask: (id) => setSaved((current) => (current ? { ...current, activeId: id } : current)),
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
      toggleMusic: music.toggleMusic,
      play: music.play,
      nextTrack: music.nextTrack,
      prevTrack: music.prevTrack,
      selectTrack: music.selectTrack,
  };

  if (now == null) {
    return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />;
  }

  return <LumiFiContext.Provider value={value}>{children}</LumiFiContext.Provider>;
}

export function useLumiFi() {
  const value = useContext(LumiFiContext);
  if (!value) throw new Error('useLumiFi must be used inside LumiFiProvider');
  return value;
}
