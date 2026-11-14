import type { ProgressLog } from './progress-log';

export type TimerMode = 'focus' | 'short' | 'long';

export interface TimerCfg {
  focus: number;
  short: number;
  long: number;
}

export interface Task {
  id: number;
  text: string;
  done: boolean;
  pomos: number;
  /** The day the task was completed, so an undo can hit the day it counted toward. */
  doneOn: string | null;
  /** Null on a task. A subtask points at that task. */
  parentId: number | null;
  /** An optional local due date, `YYYY-MM-DD`. Subtasks have none. */
  date: string | null;
  /** The subtask list is open. Only a task uses this. */
  open: boolean;
}

export interface DayStats {
  d: string;
  sessions: number;
  minutes: number;
  tasks: number;
  claimed: string[];
}

export type DayHistory = Record<string, DayStats>;

export interface StreakState {
  n: number;
  last: string;
}

export interface ProgressState {
  cfg: TimerCfg;
  xp: number;
  streak: StreakState;
  day: DayStats;
  days: DayHistory;
  tasks: Task[];
  activeId: number | null;
  cycle: number;
  /** Every finished focus session and the pre-sync daily totals, which accounts sync. */
  log: ProgressLog;
}
