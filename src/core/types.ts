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
}
