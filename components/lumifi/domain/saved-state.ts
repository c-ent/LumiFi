import { idleSession, SessionClock } from '@/src/core/clock';
import { emptyDay, restoreDayHistory } from '@/src/core/history';
import { modeDurationMs } from '@/src/core/phase';
import { MusicEnd } from '@/src/core/session-end';
import type { DayHistory, DayStats, ProgressState, Task, TimerCfg, TimerMode } from '@/src/core/types';
import { MixLevels, MoodId, SceneId } from '@/components/lumifi/theme';

export const STORAGE_KEY = 'lumifi:state';
export const LEGACY_STORAGE_KEY = 'nightlamp:state';

const MODES: TimerMode[] = ['focus', 'short', 'long'];

// Same ceilings the timer settings enforce, so a stored or hand-edited value
// cannot pay out more minutes, XP or quest progress than the UI allows.
const MAX_MINUTES: Record<TimerMode, number> = { focus: 180, short: 60, long: 90 };
const MIN_MINUTES = 1;
const DEFAULT_MINUTES: Record<TimerMode, number> = { focus: 25, short: 5, long: 15 };
// levelInfo walks XP a level at a time, so a huge finite total would spin for
// years. This sits far above any reachable score but keeps the walk bounded.
const MAX_XP = 1_000_000_000;

export interface SavedState extends ProgressState {
  auto: boolean;
  zenOpt: boolean;
  scene: SceneId;
  mood: MoodId;
  mix: MixLevels;
  musicEnd: MusicEnd;
  notificationsAsked: boolean;
  session: SessionClock;
}

export function createInitialState(now = Date.now()): SavedState {
  const day = emptyDay(now);
  const cfg: TimerCfg = { focus: 25, short: 5, long: 15 };
  return {
    cfg,
    auto: false,
    zenOpt: true,
    scene: 'dusk',
    mood: 'amber',
    xp: 0,
    streak: { n: 0, last: '' },
    day,
    days: { [day.d]: day },
    tasks: [],
    activeId: null,
    cycle: 0,
    mix: { music: 60, rain: 0, cafe: 0, fire: 0, wind: 0, clock: 0, brown: 0, forest: 0, keyboard: 0, waves: 0 },
    musicEnd: 'lower',
    notificationsAsked: false,
    session: idleSession('focus', modeDurationMs(cfg, 'focus')),
  };
}

export function parseSavedState(raw: string | null, now = Date.now()): SavedState {
  const fresh = createInitialState(now);
  if (!raw) return fresh;
  try {
    const saved = JSON.parse(raw) as Partial<SavedState>;
    const restored = restoreDayHistory(readHistory(saved.days), isDayStats(saved.day) ? saved.day : null, now);
    const cfg = readCfg(saved.cfg);
    const tasks = readTasks(saved.tasks) ?? fresh.tasks;
    return {
      ...fresh,
      ...saved,
      cfg,
      xp: readXp(saved.xp),
      mix: { ...fresh.mix, ...saved.mix },
      streak: { ...fresh.streak, ...saved.streak },
      day: restored.day,
      days: restored.days,
      tasks,
      activeId: typeof saved.activeId === 'number' ? saved.activeId : null,
      auto: saved.auto === true,
      musicEnd: readMusicEnd(saved.musicEnd),
      notificationsAsked: saved.notificationsAsked === true,
      session: readSession(saved.session, cfg),
    };
  } catch {
    return fresh;
  }
}

function readCfg(value: unknown): TimerCfg {
  if (!value || typeof value !== 'object') return { ...DEFAULT_MINUTES };
  const saved = value as Partial<Record<TimerMode, unknown>>;
  const cfg = {} as TimerCfg;
  for (const mode of MODES) {
    const minutes = saved[mode];
    // A missing, non-numeric or out-of-range length falls back to the default
    // rather than reaching modeDurationMs, which would not clamp it.
    cfg[mode] = typeof minutes === 'number' && Number.isFinite(minutes) && minutes >= MIN_MINUTES
      ? Math.min(minutes, MAX_MINUTES[mode])
      : DEFAULT_MINUTES[mode];
  }
  return cfg;
}

function readXp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), MAX_XP);
}

function readMusicEnd(value: unknown): MusicEnd {
  return value === 'keep' || value === 'lower' || value === 'fade' ? value : 'lower';
}

function readSession(value: unknown, cfg: TimerCfg): SessionClock {
  const fallback = idleSession('focus', modeDurationMs(cfg, 'focus'));
  if (!value || typeof value !== 'object') return fallback;
  const session = value as Partial<SessionClock>;
  const mode = MODES.includes(session.mode as TimerMode) ? session.mode as TimerMode : 'focus';
  const status = session.status === 'running' || session.status === 'paused' || session.status === 'idle'
    ? session.status
    : 'idle';
  const limit = MAX_MINUTES[mode] * 60000;
  // A save from before totalMs existed falls back to the configured length.
  const storedTotal = typeof session.totalMs === 'number' && Number.isFinite(session.totalMs) && session.totalMs > 0
    ? session.totalMs
    : modeDurationMs(cfg, mode);
  const totalMs = Math.min(storedTotal, limit);
  const remainingMs = typeof session.remainingMs === 'number' && Number.isFinite(session.remainingMs) && session.remainingMs >= 0
    ? Math.min(session.remainingMs, totalMs)
    : totalMs;
  const endAt = typeof session.endAt === 'number' && Number.isFinite(session.endAt) ? session.endAt : null;
  if (status === 'running' && endAt == null) return { mode, status: 'paused', endAt: null, remainingMs, totalMs };
  return { mode, status, endAt: status === 'running' ? endAt : null, remainingMs, totalMs };
}

function readTasks(value: unknown): Task[] | null {
  if (!Array.isArray(value)) return null;
  const tasks: Task[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const task = item as Partial<Task>;
    if (typeof task.id !== 'number' || typeof task.text !== 'string' || typeof task.done !== 'boolean' || typeof task.pomos !== 'number') continue;
    // A save from before doneOn existed has no completion day to fall back on,
    // so only a task already marked done keeps an unknown day.
    const doneOn = typeof task.doneOn === 'string' ? task.doneOn : null;
    tasks.push({ id: task.id, text: task.text, done: task.done, pomos: task.pomos, doneOn });
  }
  return tasks;
}

function isDayStats(value: unknown): value is DayStats {
  if (!value || typeof value !== 'object') return false;
  const day = value as Partial<DayStats>;
  return typeof day.d === 'string'
    && typeof day.sessions === 'number'
    && typeof day.minutes === 'number'
    && typeof day.tasks === 'number'
    && Array.isArray(day.claimed)
    && day.claimed.every((id) => typeof id === 'string');
}

function readHistory(value: unknown): DayHistory {
  if (!value || typeof value !== 'object') return {};
  const history: DayHistory = {};
  for (const entry of Object.values(value)) {
    if (isDayStats(entry)) history[entry.d] = entry;
  }
  return history;
}
