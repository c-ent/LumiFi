import { MixLevels, silentAmbient } from '@/src/core/ambient';
import { idleSession, SessionClock } from '@/src/core/clock';
import { emptyDay, restoreDayHistory } from '@/src/core/history';
import { emptyLog, legacyFromHistory, MAX_DAY_MINUTES, MAX_DAY_TASKS, ProgressLog, sessionRecord, type DayRecord, type FinishedRecord, type SessionRecord } from '@/src/core/progress-log';
import type { SyncMeta } from '@/src/core/sync';
import { OwnTrack, parseOwnTracks } from '@/src/core/own-tracks';
import { parseStreamLinks, StreamLink } from '@/src/core/stream-links';
import { DEFAULT_MINUTES, MAX_MINUTES, MIN_MINUTES, modeDurationMs } from '@/src/core/phase';
import { MusicEnd } from '@/src/core/session-end';
import { parseDueDate } from '@/src/core/tasks';
import type { DayHistory, DayStats, ProgressState, StreakState, Task, TimerCfg, TimerMode } from '@/src/core/types';
import { PixelArtId, readPixelArtId } from '@/components/wickglow/domain/pixel-art-ids';
import { readVideoId, VideoId } from '@/components/wickglow/domain/video-ids';
import { MoodId, SceneId } from '@/components/wickglow/theme';

// The shape of everything Wickglow persists, and the boundary that validates it.
// `storage.ts` hands the raw string in, `parseSavedState` turns it into a
// `SavedState`, and `logic.tsx` writes that same shape back out. Every read is
// defensive: a stored save can come from an older version or be hand-edited, so
// every field is read through a check and falls back to a default rather than
// throwing. The result is built from the known fields only, so a key this
// version does not know (an old `goals` list, a typo) is dropped instead of
// being carried in the save forever. Parsing never throws: a save that is not
// valid JSON becomes a fresh state.

export const STORAGE_KEY = 'wickglow:state';
export const LEGACY_STORAGE_KEY = 'lumifi:state';

const MODES: TimerMode[] = ['focus', 'short', 'long'];
// Scenes and moods are the same themes (see components/wickglow/theme.ts).
const THEME_IDS: MoodId[] = ['amber', 'moon', 'rose', 'violet', 'ash', 'forest', 'tide'];
const SCENE_IDS: SceneId[] = THEME_IDS;
const MOOD_IDS: MoodId[] = THEME_IDS;

// levelInfo walks XP a level at a time, so a huge finite total would spin for
// years. This sits far above any reachable score but keeps the walk bounded.
const MAX_XP = 1_000_000_000;

export interface SavedState extends ProgressState {
  auto: boolean;
  zenOpt: boolean;
  scene: SceneId;
  mood: MoodId;
  /** The looping video behind the timer instead of the gradient, or null for none. Not used on phones. */
  videoBg: VideoId | null;
  /** A still pixel-art picture behind the timer (desktop only), or null for none. */
  pixelBg: PixelArtId | null;
  mix: MixLevels;
  musicEnd: MusicEnd;
  /** Repeat the current track instead of advancing to the next one. */
  musicLoop: boolean;
  /** The user's own picked files. Device-local URIs only, never uploaded. */
  ownTracks: OwnTrack[];
  /** Public streaming links. The page URL and the service name, never audio. */
  streamLinks: StreamLink[];
  notificationsAsked: boolean;
  session: SessionClock;
  /** What this device last saw in the linked account, or null when it was never linked. */
  sync: SyncMeta | null;
}

/** The state a fresh install starts from: no XP, no streak, no tasks. */
export function createInitialState(now = Date.now()): SavedState {
  const day = emptyDay(now);
  const cfg: TimerCfg = { ...DEFAULT_MINUTES };
  return {
    cfg,
    auto: false,
    zenOpt: true,
    // Dusk (the old desktop default) was removed 2026-11-14; desktop now
    // defaults to the same theme as phone/tablet.
    scene: 'amber',
    mood: 'amber',
    videoBg: null,
    pixelBg: null,
    xp: 0,
    streak: { n: 0, last: '' },
    day,
    days: { [day.d]: day },
    tasks: [],
    activeId: null,
    cycle: 0,
    mix: { music: 60, ...silentAmbient() },
    musicEnd: 'lower',
    musicLoop: false,
    ownTracks: [],
    streamLinks: [],
    notificationsAsked: false,
    session: idleSession('focus', modeDurationMs(cfg, 'focus')),
    log: emptyLog(),
    sync: null,
  };
}

/**
 * Turns stored JSON into a `SavedState`, never throwing. Anything missing or
 * unrecognised falls back to `createInitialState`, and a key that is not part
 * of the state (a legacy `goals` list) is dropped on the way through.
 */
export function parseSavedState(raw: string | null, now = Date.now()): SavedState {
  const fresh = createInitialState(now);
  if (!raw) return fresh;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fresh;
    const saved = parsed as { [key in keyof SavedState]?: unknown };
    const restored = restoreDayHistory(readHistory(saved.days), isDayStats(saved.day) ? saved.day : null, now);
    const cfg = readCfg(saved.cfg);
    const tasks = readTasks(saved.tasks) ?? fresh.tasks;
    const xp = readXp(saved.xp);
    const storedActive = typeof saved.activeId === 'number' ? saved.activeId : null;
    const activeTask = tasks.find((task) => task.id === storedActive);
    return {
      cfg,
      xp,
      zenOpt: typeof saved.zenOpt === 'boolean' ? saved.zenOpt : fresh.zenOpt,
      scene: SCENE_IDS.find((id) => id === saved.scene) ?? fresh.scene,
      mood: MOOD_IDS.find((id) => id === saved.mood) ?? fresh.mood,
      cycle: readCount(saved.cycle),
      mix: readMix(saved.mix, fresh.mix),
      ownTracks: parseOwnTracks(saved.ownTracks),
      streamLinks: parseStreamLinks(saved.streamLinks),
      streak: readStreak(saved.streak),
      day: restored.day,
      days: restored.days,
      tasks,
      // Only a top-level task that exists can be active; a dangling id or a
      // subtask's id is cleared.
      activeId: activeTask && activeTask.parentId == null ? activeTask.id : null,
      auto: saved.auto === true,
      videoBg: saved.videoBg === true ? 'classic' : readVideoId(saved.videoBg),
      pixelBg: readPixelArtId(saved.pixelBg),
      musicEnd: readMusicEnd(saved.musicEnd),
      musicLoop: saved.musicLoop === true,
      notificationsAsked: saved.notificationsAsked === true,
      session: readSession(saved.session, cfg, now),
      // A save from before the log existed turns its daily totals into day
      // records once, so they can be uploaded to an account.
      log: saved.log === undefined ? { sessions: [], legacy: legacyFromHistory(restored.days, tasks) } : readLog(saved.log),
      sync: readSyncMeta(saved.sync),
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

/** A whole number that cannot go below zero: the focus-session count, the streak length. */
function readCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/**
 * Each slider is 0..100. A value that is not a real number would reach the
 * audio player as `NaN` on every launch, so it falls back to that slider's
 * default, and an out-of-range one is clamped. Unknown sliders are dropped.
 */
function readMix(value: unknown, fallback: MixLevels): MixLevels {
  const mix = { ...fallback };
  if (!value || typeof value !== 'object') return mix;
  const saved = value as Partial<Record<keyof MixLevels, unknown>>;
  for (const key of Object.keys(fallback) as (keyof MixLevels)[]) {
    const level = saved[key];
    if (typeof level === 'number' && Number.isFinite(level)) mix[key] = Math.max(0, Math.min(100, level));
  }
  return mix;
}

function readStreak(value: unknown): StreakState {
  if (!value || typeof value !== 'object') return { n: 0, last: '' };
  const streak = value as Partial<Record<keyof StreakState, unknown>>;
  return { n: readCount(streak.n), last: typeof streak.last === 'string' ? streak.last : '' };
}

/**
 * Rebuilds a session from storage, clamping its length to the configured
 * ceiling so a stored save cannot outlast the UI limit. A session marked
 * running with no `endAt` comes back paused: there is no deadline to count to,
 * and a running status without one would never finish. A deadline further off
 * than the session's own length is pulled in to `now + totalMs`, so
 * `endAt - now` can never show more time than the session holds.
 */
function readSession(value: unknown, cfg: TimerCfg, now: number): SessionClock {
  const fallback = idleSession('focus', modeDurationMs(cfg, 'focus'));
  if (!value || typeof value !== 'object') return fallback;
  const session = value as Partial<SessionClock>;
  const mode = MODES.includes(session.mode as TimerMode) ? session.mode as TimerMode : 'focus';
  const status = session.status === 'running' || session.status === 'paused' || session.status === 'idle'
    ? session.status
    : 'idle';
  const limit = MAX_MINUTES[mode] * 60000;
  // A save from before totalMs existed falls back to the configured length.
  // Lengths are always whole minutes; anything else (9.5 minutes, which would
  // round up to the 10-minute reward threshold) is not trusted either.
  const storedTotal = typeof session.totalMs === 'number' && Number.isFinite(session.totalMs)
    && session.totalMs > 0 && session.totalMs % 60000 === 0
    ? session.totalMs
    : modeDurationMs(cfg, mode);
  const totalMs = Math.min(storedTotal, limit);
  const remainingMs = typeof session.remainingMs === 'number' && Number.isFinite(session.remainingMs) && session.remainingMs >= 0
    ? Math.min(session.remainingMs, totalMs)
    : totalMs;
  const storedEnd = typeof session.endAt === 'number' && Number.isFinite(session.endAt) ? session.endAt : null;
  const endAt = storedEnd == null ? null : Math.min(storedEnd, now + totalMs);
  if (status === 'running' && endAt == null) return { mode, status: 'paused', endAt: null, remainingMs, totalMs };
  return { mode, status, endAt: status === 'running' ? endAt : null, remainingMs, totalMs };
}

function readTasks(value: unknown): Task[] | null {
  if (!Array.isArray(value)) return null;
  const tasks: Task[] = [];
  const ids = new Set<number>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const task = item as Partial<Task>;
    if (typeof task.id !== 'number' || typeof task.text !== 'string' || typeof task.done !== 'boolean' || typeof task.pomos !== 'number') continue;
    if (ids.has(task.id)) continue;
    ids.add(task.id);
    // A save from before doneOn existed has no completion day to fall back on,
    // so only a task already marked done keeps an unknown day.
    const doneOn = typeof task.doneOn === 'string' ? task.doneOn : null;
    const parentId = typeof task.parentId === 'number' ? task.parentId : null;
    const date = typeof task.date === 'string' ? parseDueDate(task.date) : null;
    tasks.push({
      id: task.id,
      text: task.text,
      done: task.done,
      // A count of finished sessions: a whole number, never below zero.
      pomos: Number.isFinite(task.pomos) ? Math.max(0, Math.floor(task.pomos)) : 0,
      doneOn,
      parentId,
      date,
      open: task.open === true,
    });
  }
  const parents = new Set(tasks.filter((task) => task.parentId == null).map((task) => task.id));
  return tasks.map((task) => {
    // A subtask whose task is missing becomes a task, so the title is not dropped.
    // A subtask does not keep a due date or an open list of its own.
    if (task.parentId == null || !parents.has(task.parentId)) {
      return task.parentId == null ? task : { ...task, parentId: null };
    }
    return { ...task, date: null, open: false };
  });
}

function isDayStats(value: unknown): value is DayStats {
  if (!value || typeof value !== 'object') return false;
  const day = value as Partial<DayStats>;
  return typeof day.d === 'string'
    && isCount(day.sessions)
    && isCount(day.minutes)
    && isCount(day.tasks)
    && Array.isArray(day.claimed)
    && day.claimed.every((id) => typeof id === 'string');
}

/** A finite number that is not below zero. */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function readHistory(value: unknown): DayHistory {
  if (!value || typeof value !== 'object') return {};
  const history: DayHistory = {};
  for (const entry of Object.values(value)) {
    if (isDayStats(entry)) history[entry.d] = entry;
  }
  return history;
}

function readLog(value: unknown): ProgressLog {
  if (!value || typeof value !== 'object') return emptyLog();
  const log = value as { sessions?: unknown; legacy?: unknown; finished?: unknown };
  const sessions: SessionRecord[] = [];
  const ids = new Set<string>();
  if (Array.isArray(log.sessions)) {
    for (const item of log.sessions) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Partial<SessionRecord>;
      const record = typeof entry.end === 'number' && typeof entry.minutes === 'number'
        ? sessionRecord(entry.end, entry.minutes, typeof entry.task === 'number' ? entry.task : null, entry.d)
        : null;
      if (!record || ids.has(record.id)) continue;
      ids.add(record.id);
      sessions.push(record);
    }
  }
  const legacy: DayRecord[] = [];
  const days = new Set<string>();
  if (Array.isArray(log.legacy)) {
    for (const item of log.legacy) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Partial<DayRecord>;
      if (typeof entry.d !== 'string' || !DAY_KEY.test(entry.d) || days.has(entry.d)) continue;
      if (!isCount(entry.minutes) || !isCount(entry.sessions) || !isCount(entry.tasks)) continue;
      days.add(entry.d);
      legacy.push({
        d: entry.d,
        minutes: Math.min(MAX_DAY_MINUTES, Math.floor(entry.minutes)),
        sessions: Math.min(MAX_DAY_MINUTES / 10, Math.floor(entry.sessions)),
        tasks: Math.min(MAX_DAY_TASKS, Math.floor(entry.tasks)),
      });
    }
  }
  const finished: FinishedRecord[] = [];
  const finishedIds = new Set<number>();
  if (Array.isArray(log.finished)) {
    for (const item of log.finished) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Partial<FinishedRecord>;
      if (typeof entry.task !== 'number' || !Number.isSafeInteger(entry.task) || finishedIds.has(entry.task)) continue;
      if (typeof entry.d !== 'string' || !DAY_KEY.test(entry.d)) continue;
      finishedIds.add(entry.task);
      finished.push({ task: entry.task, d: entry.d });
    }
  }
  return {
    sessions: sessions.sort((a, b) => a.end - b.end),
    legacy,
    ...(finished.length > 0 ? { finished } : {}),
  };
}

// `calendarKey` format: no zero padding.
const DAY_KEY = /^\d{4}-\d{1,2}-\d{1,2}$/;

/**
 * The link to an account. A record from the first build of accounts (no
 * `epoch` or `since`) is dropped, so the device links again with one full
 * read rather than trusting a shape the sync no longer uses.
 */
function readSyncMeta(value: unknown): SyncMeta | null {
  if (!value || typeof value !== 'object') return null;
  const meta = value as Partial<Record<keyof SyncMeta, unknown>>;
  if (typeof meta.uid !== 'string' || meta.uid.length === 0) return null;
  if (!isCount(meta.epoch) || !isCount(meta.since)) return null;
  const strings = (list: unknown) => (Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : []);
  const tasks: SyncMeta['tasks'] = {};
  if (meta.tasks && typeof meta.tasks === 'object') {
    for (const [id, entry] of Object.entries(meta.tasks as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const known = entry as { stamp?: unknown; sig?: unknown; sentDoneAt?: unknown };
      if (typeof known.stamp === 'number' && Number.isFinite(known.stamp) && typeof known.sig === 'string') {
        tasks[id] = { stamp: known.stamp, sig: known.sig, ...(typeof known.sentDoneAt === 'number' && Number.isFinite(known.sentDoneAt) ? { sentDoneAt: known.sentDoneAt } : {}) };
      }
    }
  }
  const tombs: SyncMeta['tombs'] = {};
  if (meta.tombs && typeof meta.tombs === 'object') {
    for (const [id, at] of Object.entries(meta.tombs as Record<string, unknown>)) {
      if (typeof at === 'number' && Number.isFinite(at)) tombs[id] = at;
    }
  }
  const edits: Record<string, number> = {};
  if (meta.edits && typeof meta.edits === 'object') {
    for (const [id, at] of Object.entries(meta.edits as Record<string, unknown>)) {
      if (isCount(at)) edits[id] = Math.floor(at);
    }
  }
  return {
    uid: meta.uid,
    epoch: Math.floor(meta.epoch),
    since: Math.floor(meta.since),
    sessions: strings(meta.sessions),
    days: strings(meta.days),
    tasks,
    tombs,
    ...(isCount(meta.checked) ? { checked: Math.floor(meta.checked) } : {}),
    ...(strings(meta.finished).length > 0 ? { finished: strings(meta.finished) } : {}),
    ...(Object.keys(edits).length > 0 ? { edits } : {}),
  };
}
