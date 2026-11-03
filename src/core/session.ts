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
): CompletedSession<T> {
  const rolled = rollToToday(state, now);
  const messages: string[] = [];

  if (mode !== 'focus') {
    messages.push('Break over. Ready for the next focus session?');
    return { state: rolled, nextMode: 'focus', messages };
  }

  const minutes = rolled.cfg.focus;
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
  let tasksDone = rolled.day.tasks;
  if (done) tasksDone += 1;
  else if (tasksDone > 0) tasksDone -= 1;

  const day: DayStats = { ...rolled.day, tasks: tasksDone, claimed: [...rolled.day.claimed] };
  const messages: string[] = [];
  const claimed = claimReachedQuests(day, rolled.xp, messages);

  return {
    state: {
      ...rolled,
      xp: claimed.xp,
      day: claimed.day,
      days: { ...rolled.days, [claimed.day.d]: claimed.day },
      tasks: rolled.tasks.map((item) => (item.id === id ? { ...item, done } : item)),
    },
    messages,
  };
}
