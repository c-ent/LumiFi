import { addTask, appendSubtask, dropTask, flipTask, focusTask, isOverdue, parseDueDate, renameTask, setTaskDate } from './tasks';
import { Task } from './types';

function task(patch: Partial<Task> & Pick<Task, 'id' | 'text'>): Task {
  return {
    done: false,
    pomos: 0,
    doneOn: null,
    parentId: null,
    date: null,
    open: false,
    ...patch,
  };
}

describe('due dates', () => {
  const monday = new Date(2026, 10, 2, 21).getTime();

  it('keeps a real calendar day and rejects one that does not exist', () => {
    expect(parseDueDate('2026-11-04')).toBe('2026-11-04');
    expect(parseDueDate('2026-02-31')).toBeNull();
    expect(parseDueDate('11/04/2026')).toBeNull();
  });

  it('is overdue only after that local day has ended', () => {
    expect(isOverdue('2026-11-01', monday)).toBe(true);
    expect(isOverdue('2026-11-02', monday)).toBe(false);
    expect(isOverdue('2026-11-03', monday)).toBe(false);
    expect(isOverdue('2026-11-02', new Date(2026, 10, 2, 23, 30).getTime())).toBe(false);
    expect(isOverdue(null, monday)).toBe(false);
  });
});

describe('task list', () => {
  const now = new Date(2026, 10, 2, 9).getTime();

  it('adds a task at the front and leaves a bad date unset', () => {
    const first = task({ id: 1, text: 'Read' });
    const added = addTask({ tasks: [first], activeId: 1 }, '  Finish SQL course  ', '2026-02-31', now);
    expect(added.activeId).toBe(1);
    expect(added.tasks[0]).toMatchObject({ id: now, text: 'Finish SQL course', date: null, parentId: null });
    expect(added.tasks[1]).toBe(first);
    expect(addTask({ tasks: [first] }, '   ', null, now).tasks).toEqual([first]);
  });

  it('reopens a finished task when a subtask is added', () => {
    const parent = task({ id: 1, text: 'Finish SQL course', done: true, doneOn: '2026-11-2' });
    const inserted = appendSubtask([parent], 1, 'Practice joins', now);
    expect(inserted?.reopened).toBe(parent);
    expect(inserted?.tasks[0].done).toBe(false);
    expect(inserted?.tasks[0].open).toBe(true);
    expect(inserted?.tasks[1]).toMatchObject({ parentId: 1, text: 'Practice joins', done: false });
  });

  it('checks every subtask with the task, and the task when the last subtask is checked', () => {
    const parent = task({ id: 1, text: 'Finish SQL course' });
    const open = task({ id: 2, text: 'Practice joins', parentId: 1 });
    const done = task({ id: 3, text: 'Window functions', parentId: 1, done: true });
    const checked = flipTask([parent, open, done], 1, '2026-11-2');
    expect(checked.tasks.every((item) => item.done)).toBe(true);
    expect(checked.counted).toEqual({ task: parent, done: true });

    const last = flipTask([parent, open, done], 2, '2026-11-2');
    expect(last.tasks.find((item) => item.id === 1)?.done).toBe(true);
    expect(last.counted).toEqual({ task: parent, done: true });
  });

  it('opens the task again when one subtask is unchecked', () => {
    const parent = task({ id: 1, text: 'Finish SQL course', done: true, doneOn: '2026-11-2' });
    const sub = task({ id: 2, text: 'Practice joins', parentId: 1, done: true });
    const opened = flipTask([parent, sub], 2, '2026-11-3');
    expect(opened.tasks.find((item) => item.id === 1)?.done).toBe(false);
    expect(opened.counted).toEqual({ task: parent, done: false });
  });

  it('deletes a task with its subtasks, and finishes the task when the last open subtask goes', () => {
    const parent = task({ id: 1, text: 'Finish SQL course' });
    const open = task({ id: 2, text: 'Practice joins', parentId: 1 });
    const done = task({ id: 3, text: 'Window functions', parentId: 1, done: true });
    const removed = dropTask([parent, open, done], 1, '2026-11-2');
    expect(removed.tasks).toEqual([]);
    expect(removed.removedIds).toEqual([1, 2, 3]);

    const finished = dropTask([parent, open, done], 2, '2026-11-2');
    expect(finished.tasks.map((item) => item.id)).toEqual([1, 3]);
    expect(finished.parentChange).toEqual({ before: parent, done: true });
  });

  it('leaves a finished task finished when its last subtask is deleted', () => {
    const parent = task({ id: 1, text: 'Finish SQL course', done: true, doneOn: '2026-11-2' });
    const sub = task({ id: 2, text: 'Practice joins', parentId: 1, done: true });
    const dropped = dropTask([parent, sub], 2, '2026-11-2');
    expect(dropped.tasks).toEqual([parent]);
    expect(dropped.parentChange).toBeNull();
  });

  it('focuses an open task and clears that focus on a second press', () => {
    const open = task({ id: 1, text: 'Read' });
    const done = task({ id: 2, text: 'Done', done: true });
    const state = { tasks: [open, done], activeId: null as number | null };
    expect(focusTask(state, 1).activeId).toBe(1);
    expect(focusTask({ ...state, activeId: 1 }, 1).activeId).toBeNull();
    expect(focusTask(state, 2)).toBe(state);
  });

  it('keeps the title when a rename is blank, and ignores a date that is not a day', () => {
    const item = task({ id: 1, text: 'Read', date: '2026-11-09' });
    const state = { tasks: [item] };
    expect(renameTask(state, 1, '   ')).toBe(state);
    expect(setTaskDate(state, 1, '2026-02-31')).toBe(state);
    expect(setTaskDate(state, 1, null).tasks[0].date).toBeNull();
  });
});
