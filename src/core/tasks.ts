import { Task } from './types';

const TITLE_LIMIT = 200;
const DUE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function cleanTitle(value: string): string | null {
  const trimmed = value.trim().slice(0, TITLE_LIMIT);
  return trimmed ? trimmed : null;
}

/** A real local `YYYY-MM-DD`, or null. An impossible day such as February 31 is rejected. */
export function parseDueDate(value: string): string | null {
  const match = DUE_DATE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/** A due date is overdue only when that local day is already over. Today is not overdue. */
export function isOverdue(date: string | null, now: number): boolean {
  if (!date) return false;
  const parsed = parseDueDate(date);
  if (!parsed) return false;
  const [year, month, day] = parsed.split('-').map(Number);
  const due = new Date(year, month - 1, day).getTime();
  const today = new Date(now);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return due < start;
}

export function nextTaskId(tasks: Task[], now: number): number {
  let id = now;
  for (const task of tasks) {
    if (task.id >= id) id = task.id + 1;
  }
  return id;
}

function mark(task: Task, done: boolean, dayKey: string): Task {
  if (task.done === done) return task;
  return { ...task, done, doneOn: done ? dayKey : null };
}

export function addTask<T extends { tasks: Task[] }>(
  state: T,
  text: string,
  date: string | null,
  now: number,
): T {
  const title = cleanTitle(text);
  if (!title) return state;
  const task: Task = {
    id: nextTaskId(state.tasks, now),
    text: title,
    done: false,
    pomos: 0,
    doneOn: null,
    parentId: null,
    date: date ? parseDueDate(date) : null,
    open: false,
  };
  return { ...state, tasks: [task, ...state.tasks] };
}

export interface SubtaskInsert {
  tasks: Task[];
  /** The parent before it was reopened, when a subtask was added to a finished task. */
  reopened: Task | null;
}

export function appendSubtask(tasks: Task[], parentId: number, text: string, now: number): SubtaskInsert | null {
  const title = cleanTitle(text);
  const parent = tasks.find((item) => item.id === parentId);
  if (!title || !parent || parent.parentId != null) return null;
  const sub: Task = {
    id: nextTaskId(tasks, now),
    text: title,
    done: false,
    pomos: 0,
    doneOn: null,
    parentId,
    date: null,
    open: false,
  };
  const next = tasks.map((item) => {
    if (item.id !== parentId) return item;
    return parent.done ? { ...item, done: false, doneOn: null, open: true } : { ...item, open: true };
  });
  return { tasks: [...next, sub], reopened: parent.done ? parent : null };
}

export function renameTask<T extends { tasks: Task[] }>(state: T, id: number, text: string): T {
  const title = cleanTitle(text);
  const task = state.tasks.find((item) => item.id === id);
  if (!title || !task || task.text === title) return state;
  return { ...state, tasks: state.tasks.map((item) => (item.id === id ? { ...item, text: title } : item)) };
}

export function setTaskDate<T extends { tasks: Task[] }>(state: T, id: number, date: string | null): T {
  const task = state.tasks.find((item) => item.id === id);
  if (!task || task.parentId != null) return state;
  const due = date ? parseDueDate(date) : null;
  if (date && !due) return state;
  if (task.date === due) return state;
  return { ...state, tasks: state.tasks.map((item) => (item.id === id ? { ...item, date: due } : item)) };
}

export function setTaskOpen<T extends { tasks: Task[] }>(state: T, id: number, open: boolean): T {
  const task = state.tasks.find((item) => item.id === id);
  if (!task || task.parentId != null || task.open === open) return state;
  return { ...state, tasks: state.tasks.map((item) => (item.id === id ? { ...item, open } : item)) };
}

export function focusTask<T extends { tasks: Task[]; activeId: number | null }>(state: T, id: number): T {
  const task = state.tasks.find((item) => item.id === id);
  if (!task || task.done || task.parentId != null) return state;
  return { ...state, activeId: state.activeId === id ? null : id };
}

export interface TaskFlip {
  tasks: Task[];
  /** The top-level task whose completion changed, as it was before the change. */
  counted: { task: Task; done: boolean } | null;
  /** Clear the active task when it is this id. */
  clearActiveId: number | null;
}

export function flipTask(tasks: Task[], id: number, dayKey: string): TaskFlip {
  const task = tasks.find((item) => item.id === id);
  if (!task) return { tasks, counted: null, clearActiveId: null };

  if (task.parentId == null) {
    const done = !task.done;
    return {
      tasks: tasks.map((item) => (item.id === id || item.parentId === id ? mark(item, done, dayKey) : item)),
      counted: { task, done },
      clearActiveId: done ? id : null,
    };
  }

  const done = !task.done;
  let next = tasks.map((item) => (item.id === id ? mark(item, done, dayKey) : item));
  const parent = tasks.find((item) => item.id === task.parentId);
  if (!parent) return { tasks: next, counted: null, clearActiveId: null };
  const subs = next.filter((item) => item.parentId === parent.id);
  if (subs.length === 0) return { tasks: next, counted: null, clearActiveId: null };
  const allDone = subs.every((item) => item.done);
  if (parent.done === allDone) return { tasks: next, counted: null, clearActiveId: null };
  next = next.map((item) => (item.id === parent.id ? mark(item, allDone, dayKey) : item));
  return {
    tasks: next,
    counted: { task: parent, done: allDone },
    clearActiveId: allDone ? parent.id : null,
  };
}

export interface TaskDrop {
  tasks: Task[];
  removedIds: number[];
  /** A finished top-level task that was deleted, so its completion can be undone. */
  removedDone: Task | null;
  parentChange: { before: Task; done: boolean } | null;
}

export function dropTask(tasks: Task[], id: number, dayKey: string): TaskDrop {
  const task = tasks.find((item) => item.id === id);
  if (!task) return { tasks, removedIds: [], removedDone: null, parentChange: null };
  const removedIds = [id, ...tasks.filter((item) => item.parentId === id).map((item) => item.id)];
  const removed = new Set(removedIds);
  let next = tasks.filter((item) => !removed.has(item.id));
  if (task.parentId == null) {
    return { tasks: next, removedIds, removedDone: task.done ? task : null, parentChange: null };
  }
  const parent = tasks.find((item) => item.id === task.parentId);
  if (!parent) return { tasks: next, removedIds, removedDone: null, parentChange: null };
  const subs = next.filter((item) => item.parentId === parent.id);
  const allDone = subs.every((item) => item.done);
  if (subs.length === 0 || parent.done === allDone) {
    return { tasks: next, removedIds, removedDone: null, parentChange: null };
  }
  next = next.map((item) => (item.id === parent.id ? mark(item, allDone, dayKey) : item));
  return {
    tasks: next,
    removedIds,
    removedDone: null,
    parentChange: { before: parent, done: allDone },
  };
}
