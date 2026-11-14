import { z } from 'zod';
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
import { count, dayKey, readAs, validEntries, validItems } from '@/src/data/lenient';
import { PixelArtId, readPixelArtId } from '@/components/wickglow/domain/pixel-art-ids';
import { readVideoId, VideoId } from '@/components/wickglow/domain/video-ids';
import { MoodId, SceneId } from '@/components/wickglow/theme';

// The shape of everything Wickglow persists, and the boundary that validates it.
// `storage.ts` hands the raw string in, `parseSavedState` turns it into a
// `SavedState`, and `logic.tsx` writes that same shape back out. Every read is
// defensive: a stored save can come from an older version or be hand-edited, so
// every field is read through a Zod schema (src/data/lenient.ts) and falls back
// to a default rather than throwing. The result is built from the known fields
// only, so a key this version does not know (an old `goals` list, a typo) is
// dropped instead of being carried in the save forever. Parsing never throws: a
// save that is not valid JSON becomes a fresh state.

export const STORAGE_KEY = 'wickglow:state';
export const LEGACY_STORAGE_KEY = 'lumifi:state';

const MODES = ['focus', 'short', 'long'] as const satisfies readonly TimerMode[];
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
 * The state after signing out (owner, 2026-11-14): the progress (XP, streak,
 * history, tasks, the log and the link to the account) goes back to a fresh
 * install's, so the next account to sign in here cannot take it. Settings,
 * sounds, scenes and the timer stay: they are per device and never synced.
 */
export function withoutProgress(state: SavedState, now = Date.now()): SavedState {
  const fresh = createInitialState(now);
  return {
    ...state,
    xp: fresh.xp,
    streak: fresh.streak,
    day: fresh.day,
    days: fresh.days,
    tasks: fresh.tasks,
    activeId: fresh.activeId,
    log: fresh.log,
    sync: fresh.sync,
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
    const restored = restoreDayHistory(readHistory(saved.days), readDayStats(saved.day), now);
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

// A missing, non-numeric or out-of-range length falls back to the default
// rather than reaching modeDurationMs, which would not clamp it.
const minutesFor = (mode: TimerMode) => z.number().min(MIN_MINUTES)
  .transform((minutes) => Math.min(minutes, MAX_MINUTES[mode]))
  .catch(DEFAULT_MINUTES[mode]);
const cfgSchema = z.object({ focus: minutesFor('focus'), short: minutesFor('short'), long: minutesFor('long') });

function readCfg(value: unknown): TimerCfg {
  return readAs(cfgSchema, value, { ...DEFAULT_MINUTES });
}

const xpSchema = z.number().positive().transform((xp) => Math.min(Math.floor(xp), MAX_XP));

function readXp(value: unknown): number {
  return readAs(xpSchema, value, 0);
}

function readMusicEnd(value: unknown): MusicEnd {
  return readAs(z.enum(['keep', 'lower', 'fade']), value, 'lower');
}

/** A whole number that cannot go below zero: the focus-session count, the streak length. */
const wholeCount = z.number().positive().transform(Math.floor).catch(0);

function readCount(value: unknown): number {
  return wholeCount.parse(value);
}

const mixLevel = z.number().transform((level) => Math.max(0, Math.min(100, level)));

/**
 * Each slider is 0..100. A value that is not a real number would reach the
 * audio player as `NaN` on every launch, so it falls back to that slider's
 * default, and an out-of-range one is clamped. Unknown sliders are dropped.
 */
function readMix(value: unknown, fallback: MixLevels): MixLevels {
  const keys = Object.keys(fallback) as (keyof MixLevels)[];
  const schema = z.object(Object.fromEntries(keys.map((key) => [key, mixLevel.catch(fallback[key])])));
  return readAs(schema, value, { ...fallback }) as MixLevels;
}

const streakSchema = z.object({ n: wholeCount, last: z.string().catch('') });

function readStreak(value: unknown): StreakState {
  return readAs(streakSchema, value, { n: 0, last: '' });
}

const sessionFields = z.object({
  mode: z.enum(MODES).catch('focus'),
  status: z.enum(['running', 'paused', 'idle']).catch('idle'),
  // Lengths are always whole minutes; anything else (9.5 minutes, which would
  // round up to the 10-minute reward threshold) is not trusted.
  totalMs: z.number().positive().multipleOf(60000).nullable().catch(null),
  remainingMs: count.nullable().catch(null),
  endAt: z.number().nullable().catch(null),
});

/**
 * Rebuilds a session from storage, clamping its length to the configured
 * ceiling so a stored save cannot outlast the UI limit. A session marked
 * running with no `endAt` comes back paused: there is no deadline to count to,
 * and a running status without one would never finish. A deadline further off
 * than the session's own length is pulled in to `now + totalMs`, so
 * `endAt - now` can never show more time than the session holds.
 */
function readSession(value: unknown, cfg: TimerCfg, now: number): SessionClock {
  const session = readAs(sessionFields, value, null);
  if (!session) return idleSession('focus', modeDurationMs(cfg, 'focus'));
  const { mode, status } = session;
  // A save from before totalMs existed falls back to the configured length.
  const totalMs = Math.min(session.totalMs ?? modeDurationMs(cfg, mode), MAX_MINUTES[mode] * 60000);
  const remainingMs = session.remainingMs == null ? totalMs : Math.min(session.remainingMs, totalMs);
  const endAt = session.endAt == null ? null : Math.min(session.endAt, now + totalMs);
  if (status === 'running' && endAt == null) return { mode, status: 'paused', endAt: null, remainingMs, totalMs };
  return { mode, status, endAt: status === 'running' ? endAt : null, remainingMs, totalMs };
}

const taskSchema = z.object({
  id: z.number(),
  text: z.string(),
  done: z.boolean(),
  // A count of finished sessions: a whole number, never below zero.
  pomos: z.number().transform((pomos) => Math.max(0, Math.floor(pomos))),
  // A save from before doneOn existed has no completion day to fall back on,
  // so only a task already marked done keeps an unknown day.
  doneOn: z.string().nullable().catch(null),
  parentId: z.number().nullable().catch(null),
  date: z.string().transform(parseDueDate).nullable().catch(null),
  open: z.boolean().catch(false),
});

function readTasks(value: unknown): Task[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<number>();
  const tasks: Task[] = [];
  for (const task of validItems(taskSchema, value)) {
    if (ids.has(task.id)) continue;
    ids.add(task.id);
    tasks.push(task);
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

const dayStatsSchema = z.object({
  d: z.string(),
  sessions: count,
  minutes: count,
  tasks: count,
  claimed: z.array(z.string()),
});

function readDayStats(value: unknown): DayStats | null {
  return readAs(dayStatsSchema, value, null);
}

function readHistory(value: unknown): DayHistory {
  const history: DayHistory = {};
  for (const [, day] of validEntries(dayStatsSchema, value)) history[day.d] = day;
  return history;
}

// `task` and `d` are checked by `sessionRecord`, and either may be missing.
const logSessionSchema = z.object({ end: z.number(), minutes: z.number(), task: z.unknown().optional(), d: z.unknown().optional() });
const logDaySchema = z.object({ d: dayKey, minutes: count, sessions: count, tasks: count });
const finishedSchema = z.object({ task: z.int(), d: dayKey });

function readLog(value: unknown): ProgressLog {
  if (!value || typeof value !== 'object') return emptyLog();
  const log = value as { sessions?: unknown; legacy?: unknown; finished?: unknown };
  const sessions: SessionRecord[] = [];
  const ids = new Set<string>();
  for (const entry of validItems(logSessionSchema, log.sessions)) {
    const record = sessionRecord(entry.end, entry.minutes, typeof entry.task === 'number' ? entry.task : null, entry.d);
    if (!record || ids.has(record.id)) continue;
    ids.add(record.id);
    sessions.push(record);
  }
  const legacy: DayRecord[] = [];
  const days = new Set<string>();
  for (const entry of validItems(logDaySchema, log.legacy)) {
    if (days.has(entry.d)) continue;
    days.add(entry.d);
    legacy.push({
      d: entry.d,
      minutes: Math.min(MAX_DAY_MINUTES, Math.floor(entry.minutes)),
      sessions: Math.min(MAX_DAY_MINUTES / 10, Math.floor(entry.sessions)),
      tasks: Math.min(MAX_DAY_TASKS, Math.floor(entry.tasks)),
    });
  }
  const finished: FinishedRecord[] = [];
  const finishedIds = new Set<number>();
  for (const entry of validItems(finishedSchema, log.finished)) {
    if (finishedIds.has(entry.task)) continue;
    finishedIds.add(entry.task);
    finished.push(entry);
  }
  return {
    sessions: sessions.sort((a, b) => a.end - b.end),
    legacy,
    ...(finished.length > 0 ? { finished } : {}),
  };
}

const syncBase = z.object({ uid: z.string().min(1), epoch: count, since: count });
const knownTaskSchema = z.object({ stamp: z.number(), sig: z.string(), sentDoneAt: z.number().optional().catch(undefined) })
  .transform(({ sentDoneAt, ...known }) => (sentDoneAt != null ? { ...known, sentDoneAt } : known));

/**
 * The link to an account. A record from the first build of accounts (no
 * `epoch` or `since`) is dropped, so the device links again with one full
 * read rather than trusting a shape the sync no longer uses.
 */
function readSyncMeta(value: unknown): SyncMeta | null {
  const base = readAs(syncBase, value, null);
  if (!base) return null;
  const meta = value as Partial<Record<keyof SyncMeta, unknown>>;
  const edits = Object.fromEntries(validEntries(count, meta.edits).map(([id, at]) => [id, Math.floor(at)]));
  const finished = validItems(z.string(), meta.finished);
  const checked = readAs(count.nullable(), meta.checked, null);
  return {
    uid: base.uid,
    epoch: Math.floor(base.epoch),
    since: Math.floor(base.since),
    sessions: validItems(z.string(), meta.sessions),
    days: validItems(z.string(), meta.days),
    tasks: Object.fromEntries(validEntries(knownTaskSchema, meta.tasks)),
    tombs: Object.fromEntries(validEntries(z.number(), meta.tombs)),
    ...(checked != null ? { checked: Math.floor(checked) } : {}),
    ...(finished.length > 0 ? { finished } : {}),
    ...(Object.keys(edits).length > 0 ? { edits } : {}),
  };
}
