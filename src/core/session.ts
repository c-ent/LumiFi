import { rollToToday } from './history';
import { modeAfterComplete } from './phase';
import { appendFinished, appendSession, sessionRecord } from './progress-log';
import { claimReachedQuests } from './quests';
import { streakAfterFocus } from './streak';
import { appendSubtask, dropTask, flipTask } from './tasks';
import { DayHistory, DayStats, ProgressState, Task, TimerMode } from './types';
import { countsAsRewardSession, focusSessionXp, grantXp } from './xp';

export interface SessionStep<T> {
  state: T;
  messages: string[];
}

export interface CompletedSession<T> extends SessionStep<T> {
  nextMode: TimerMode;
}

export function completeSession<T extends ProgressState>(
  state: T,
  mode: TimerMode,
  now: number,
  sessionMinutes: number,
): CompletedSession<T> {
  const rolled = rollToToday(state, now);
  const messages: string[] = [];

  if (mode !== 'focus') {
    messages.push('Break over. Ready for the next focus session?');
    return { state: rolled, nextMode: 'focus', messages };
  }

  // The duration the session actually ran at, not the current focus setting. A
  // setting changed mid-session must not inflate the recorded minutes, XP, or the
  // minute quest, and must not shrink them either. A session under 10 minutes
  // still pays its minute XP and adds those minutes. It does not count toward
  // the four-session quest or the streak.
  const minutes = sessionMinutes;
  const rewardSession = countsAsRewardSession(minutes);
  const cycle = rolled.cycle + 1;
  const day: DayStats = {
    ...rolled.day,
    sessions: rolled.day.sessions + (rewardSession ? 1 : 0),
    minutes: rolled.day.minutes + minutes,
    claimed: [...rolled.day.claimed],
  };
  const tasks = rolled.tasks.map((task) => (
    task.id === rolled.activeId ? { ...task, pomos: task.pomos + 1 } : task
  ));
  let xp = grantXp(rolled.xp, focusSessionXp(minutes), `for ${minutes} focused minutes`, messages);
  const claimed = claimReachedQuests(day, xp, messages);
  xp = claimed.xp;
  const nextDay = claimed.day;

  return {
    state: {
      ...rolled,
      cycle,
      xp,
      day: nextDay,
      days: { ...rolled.days, [nextDay.d]: nextDay },
      streak: rewardSession ? streakAfterFocus(rolled.streak, now) : rolled.streak,
      tasks,
      // The record accounts sync. `now` is when the session ended.
      log: appendSession(rolled.log, sessionRecord(Math.round(now), minutes, rolled.activeId)),
    },
    nextMode: modeAfterComplete('focus', cycle),
    messages,
  };
}

// Only a top-level task changes the daily task count. Subtasks move that task
// between done and not done, and the count follows the task, once.
function applyTaskCount<T extends ProgressState>(
  state: T,
  task: Task,
  done: boolean,
  messages: string[],
): T {
  const dayKey = state.day.d;
  const targetKey = done ? dayKey : task.doneOn;
  let day: DayStats = state.day;
  let days: DayHistory = state.days;
  if (targetKey === dayKey) {
    const nextTotal = done ? state.day.tasks + 1 : Math.max(0, state.day.tasks - 1);
    day = { ...state.day, tasks: nextTotal, claimed: [...state.day.claimed] };
    const known = state.days[dayKey] ?? day;
    days = { ...state.days, [dayKey]: { ...known, tasks: nextTotal } };
  } else if (targetKey != null) {
    const known = state.days[targetKey];
    if (known) days = { ...state.days, [targetKey]: { ...known, tasks: Math.max(0, known.tasks - 1) } };
  }
  const claimed = claimReachedQuests(day, state.xp, messages);
  return {
    ...state,
    xp: claimed.xp,
    day: claimed.day,
    days: { ...days, [claimed.day.d]: claimed.day },
  };
}

export function toggleTask<T extends ProgressState>(state: T, id: number, now: number): SessionStep<T> {
  const rolled = rollToToday(state, now);
  const flipped = flipTask(rolled.tasks, id, rolled.day.d);
  if (!flipped.counted && flipped.tasks === rolled.tasks) return { state: rolled, messages: [] };

  let activeId = rolled.activeId;
  if (flipped.clearActiveId != null && activeId === flipped.clearActiveId) activeId = null;
  let next: T = { ...rolled, tasks: flipped.tasks, activeId };
  const messages: string[] = [];
  // Completing counts toward today. Undoing counts against the day the task was
  // completed, so undoing a task finished on a past day cannot erase today's
  // count. A subtask does not count on its own: the task counts once, including
  // when the last subtask finishes it.
  if (flipped.counted) next = applyTaskCount(next, flipped.counted.task, flipped.counted.done, messages);
  return { state: next, messages };
}

export function addSubtask<T extends ProgressState>(
  state: T,
  parentId: number,
  text: string,
  now: number,
): SessionStep<T> {
  const rolled = rollToToday(state, now);
  const inserted = appendSubtask(rolled.tasks, parentId, text, now);
  if (!inserted) return { state: rolled, messages: [] };
  let next: T = { ...rolled, tasks: inserted.tasks };
  const messages: string[] = [];
  if (inserted.reopened) next = applyTaskCount(next, inserted.reopened, false, messages);
  return { state: next, messages };
}

export function removeTask<T extends ProgressState>(state: T, id: number, now: number): SessionStep<T> {
  const rolled = rollToToday(state, now);
  const dropped = dropTask(rolled.tasks, id, rolled.day.d);
  if (dropped.removedIds.length === 0) return { state: rolled, messages: [] };
  let activeId = rolled.activeId;
  if (activeId != null && dropped.removedIds.includes(activeId)) activeId = null;
  if (dropped.parentChange?.done && activeId === dropped.parentChange.before.id) activeId = null;
  let next: T = { ...rolled, tasks: dropped.tasks, activeId };
  const messages: string[] = [];
  // Deleting a finished task keeps its credit: the day keeps its count and the
  // log keeps the task as finished, so a sync rebuild counts it too.
  if (dropped.removedDone) next = { ...next, log: appendFinished(next.log, dropped.removedDone) };
  if (dropped.parentChange) next = applyTaskCount(next, dropped.parentChange.before, dropped.parentChange.done, messages);
  return { state: next, messages };
}
