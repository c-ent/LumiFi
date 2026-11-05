import { calendarKey } from '@/src/core/calendar';
import { idleSession, pauseSession, startSession, takeCompletedSession } from '@/src/core/clock';
import type { OwnTrack, PlaylistEntry } from '@/src/core/own-tracks';
import { MAX_STREAM_LINKS, parseStreamLink, playbackFor, StreamLink } from '@/src/core/stream-links';
import { modeAfterSkip, modeDurationMs } from '@/src/core/phase';
import { focusEndLine, MusicEnd } from '@/src/core/session-end';
import { streakCount } from '@/src/core/streak';
import { colors } from '@/src/theme/tokens';
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addNotificationReceivedListener } from 'expo-notifications';
import { AppState, Linking, Platform, View } from 'react-native';
import { SavedState } from '@/components/lumifi/domain/saved-state';
import { deleteOwnTrackFile, pickOwnTracks } from '@/components/lumifi/domain/own-music';
import { checkStreamLink } from '@/components/lumifi/domain/stream-check';
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
} from '@/components/lumifi/domain/session';
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
  addStreamLink: (raw: string) => Promise<'added' | 'empty' | 'unsupported' | 'private' | 'duplicate' | 'full'>;
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
  const activeStreamIdRef = useRef<string | null>(null);
  const heldForEmbed = useRef(false);
  const resumeWhenActive = useRef(false);
  const leftForStream = useRef(false);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  // An external service app pauses the local player. Resume only after LumiFi
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
      const latest = savedRef.current;
      if (latest.session.status === 'running') return;
      const started = startSession(latest.session, Date.now());
      setEnding(null);
      musicRef.current.restoreMusic();
      // Start the track before the notification work below. That work is a
      // chain of native calls and can take hundreds of milliseconds, so
      // awaiting it first left the music audibly behind the timer.
      // A streaming embed is the music for this session. Starting focus does
      // not also start the local player, and the session still runs.
      if (started.mode === 'focus' && !activeStreamIdRef.current) {
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

  const releaseStreamForLocal = () => {
    resumeWhenActive.current = false;
    leftForStream.current = false;
    heldForEmbed.current = false;
    if (!activeStreamIdRef.current) return;
    activeStreamIdRef.current = null;
    setActiveStreamId(null);
  };

  const closeStream = () => {
    activeStreamIdRef.current = null;
    setActiveStreamId(null);
    resumeWhenActive.current = false;
    leftForStream.current = false;
    const resume = heldForEmbed.current;
    heldForEmbed.current = false;
    if (resume) musicRef.current.play();
  };

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
        setSaved((current) => {
          if (!current) return current;
          const track = current.ownTracks.find((item) => item.id === id);
          if (track) deleteOwnTrackFile(track.uri);
          return { ...current, ownTracks: current.ownTracks.filter((item) => item.id !== id) };
        });
      },
      addStreamLink: async (raw) => {
        const parsed = parseStreamLink(raw);
        if (!parsed.ok) return parsed.reason;
        if (savedRef.current.streamLinks.some((item) => item.id === parsed.link.id)) return 'duplicate';
        if (savedRef.current.streamLinks.length >= MAX_STREAM_LINKS) return 'full';
        const visibility = await checkStreamLink(parsed.link);
        if (visibility === 'private') return 'private';
        const current = savedRef.current;
        if (current.streamLinks.some((item) => item.id === parsed.link.id)) return 'duplicate';
        if (current.streamLinks.length >= MAX_STREAM_LINKS) return 'full';
        commit({ ...current, streamLinks: [...current.streamLinks, parsed.link] });
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
