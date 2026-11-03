import { rollToToday } from './history';
import { modeAfterComplete } from './phase';
import { claimReachedQuests } from './quests';
import { streakAfterFocus } from './streak';
import { DayStats, ProgressState, TimerMode } from './types';
import { focusSessionXp, grantXp } from './xp';

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
  // minute quest, and must not shrink them either.
  const minutes = sessionMinutes;
  const cycle = rolled.cycle + 1;
  const day: DayStats = {
    ...rolled.day,
    sessions: rolled.day.sessions + 1,
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
      streak: streakAfterFocus(rolled.streak, now),
      tasks,
    },
    nextMode: modeAfterComplete('focus', cycle),
    messages,
  };
}

export function toggleTask<T extends ProgressState>(state: T, id: number, now: number): SessionStep<T> {
  const rolled = rollToToday(state, now);
  const task = rolled.tasks.find((item) => item.id === id);
  if (!task) return { state: rolled, messages: [] };

  const done = !task.done;
  const doneOn = done ? rolled.day.d : null;
  const tasks = rolled.tasks.map((item) => (item.id === id ? { ...item, done, doneOn } : item));

  // Completing counts toward today. Undoing counts against the day the task was
  // completed, so undoing a task finished on a past day cannot erase today's
  // count. The stored history, which feeds the week chart, is adjusted too.
  const dayKey = rolled.day.d;
  const targetKey = doneOn ?? task.doneOn ?? dayKey;
  const known = rolled.days[targetKey];
  const total = known ? known.tasks : 0;
  const nextTotal = done ? total + 1 : Math.max(0, total - 1);

  let days = rolled.days;
  if (known) days = { ...days, [targetKey]: { ...known, tasks: nextTotal } };
  else if (nextTotal > 0) {
    days = { ...days, [targetKey]: { d: targetKey, sessions: 0, minutes: 0, tasks: nextTotal, claimed: [] } };
  }

  const day: DayStats = targetKey === dayKey
    ? { ...rolled.day, tasks: nextTotal, claimed: [...rolled.day.claimed] }
    : rolled.day;

  const messages: string[] = [];
  const claimed = claimReachedQuests(day, rolled.xp, messages);

  return {
    state: {
      ...rolled,
      xp: claimed.xp,
      day: claimed.day,
      days: { ...days, [claimed.day.d]: claimed.day },
      tasks,
    },
    messages,
  };
}
