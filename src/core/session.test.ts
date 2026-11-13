import { calendarKey } from './calendar';
import { emptyDay } from './history';
import { addSubtask, completeSession, removeTask, toggleTask } from './session';
import { ProgressState, Task } from './types';

function task(patch: Partial<Task> & Pick<Task, 'id' | 'text'>): Task {
  return { done: false, pomos: 0, doneOn: null, parentId: null, date: null, open: false, ...patch };
}

function progressAt(now: number, focus = 25): ProgressState {
  const day = emptyDay(now);
  return {
    cfg: { focus, short: 5, long: 15 },
    xp: 0,
    streak: { n: 0, last: '' },
    day,
    days: { [day.d]: day },
    tasks: [task({ id: 1, text: 'Read chapter 5' })],
    activeId: 1,
    cycle: 0,
    log: { sessions: [], legacy: [] },
  };
}

describe('completed sessions', () => {
  const monday = new Date(2026, 10, 2, 21).getTime();
  const tuesdayMorning = new Date(2026, 10, 3, 0, 10).getTime();
  const wednesday = new Date(2026, 10, 4, 9).getTime();

  it('awards focus XP, then the 4-session and 60-minute quests once', () => {
    let state = progressAt(monday);
    const modes: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const result = completeSession(state, 'focus', monday, 25);
      modes.push(result.nextMode);
      state = result.state;
    }

    expect(modes).toEqual(['short', 'short', 'short', 'long']);
    expect(state.xp).toBe(200 + 50 + 40);
    expect(state.day.claimed).toEqual(['q2', 'q1']);
    expect(state.tasks[0].pomos).toBe(4);

    const extra = completeSession(state, 'focus', monday, 25);
    expect(extra.state.xp).toBe(state.xp + 50);
    expect(extra.state.day.claimed).toEqual(['q2', 'q1']);
    expect(extra.messages[0]).toBe('+50 XP for 25 focused minutes');
  });

  it('records the length the session ran at, not the current focus setting', () => {
    const state = progressAt(monday);
    // The focus setting was raised to 90 during a session that still ran 25 minutes.
    const changed: ProgressState = { ...state, cfg: { ...state.cfg, focus: 90 } };

    const result = completeSession(changed, 'focus', monday, 25);

    expect(result.state.day.minutes).toBe(25);
    expect(result.state.xp).toBe(50);
    expect(result.state.day.claimed).toEqual([]);
    expect(result.messages[0]).toBe('+50 XP for 25 focused minutes');
  });

  it('pays minute XP for a session under 10 minutes without a session count or a streak', () => {
    const state = progressAt(monday);
    const short = completeSession(state, 'focus', monday, 9);

    expect(short.state.xp).toBe(18);
    expect(short.state.day.minutes).toBe(9);
    expect(short.state.day.sessions).toBe(0);
    expect(short.state.day.claimed).toEqual([]);
    expect(short.state.streak).toEqual(state.streak);
    expect(short.messages).toEqual(['+18 XP for 9 focused minutes']);

    const counted = completeSession(short.state, 'focus', monday, 10);
    expect(counted.state.xp).toBe(38);
    expect(counted.state.day.minutes).toBe(19);
    expect(counted.state.day.sessions).toBe(1);
    expect(counted.state.streak).toEqual({ n: 1, last: '2026-11-2' });
  });

  it('lets short minutes fill the hour quest and keeps the session quest for 10-minute sessions', () => {
    let state = progressAt(monday);
    for (let index = 0; index < 6; index += 1) state = completeSession(state, 'focus', monday, 9).state;

    expect(state.day.minutes).toBe(54);
    expect(state.day.sessions).toBe(0);
    expect(state.xp).toBe(108);
    expect(state.streak).toEqual({ n: 0, last: '' });

    state = completeSession(state, 'focus', monday, 6).state;
    expect(state.day.minutes).toBe(60);
    expect(state.day.sessions).toBe(0);
    expect(state.day.claimed).toEqual(['q2']);
    expect(state.xp).toBe(108 + 12 + 50);
    expect(state.streak).toEqual({ n: 0, last: '' });

    const nextDay = completeSession(state, 'focus', tuesdayMorning, 9).state;
    expect(nextDay.day.d).toBe('2026-11-3');
    expect(nextDay.streak).toEqual({ n: 0, last: '' });
  });

  it('awards nothing for a break', () => {
    const state = progressAt(monday);
    const result = completeSession(state, 'short', monday, 25);
    expect(result.nextMode).toBe('focus');
    expect(result.state.xp).toBe(0);
    expect(result.state.cycle).toBe(0);
    expect(result.state.streak).toEqual(state.streak);
    expect(result.state.day).toBe(state.day);
    expect(result.messages).toEqual(['Break over. Ready for the next focus session?']);
  });

  it('counts a session just after midnight on the new day and keeps yesterday', () => {
    const first = completeSession(progressAt(monday), 'focus', monday, 25).state;
    const second = completeSession(first, 'focus', tuesdayMorning, 25).state;

    expect(second.day.d).toBe('2026-11-3');
    expect(second.day.minutes).toBe(25);
    expect(second.day.claimed).toEqual([]);
    expect(second.days[calendarKey(monday)].minutes).toBe(25);
    expect(second.streak).toEqual({ n: 2, last: '2026-11-3' });
  });

  it('resets the streak after a skipped day without dropping the old minutes', () => {
    const first = completeSession(progressAt(monday), 'focus', monday, 25).state;
    const skipped = completeSession(first, 'focus', wednesday, 25).state;

    expect(skipped.streak).toEqual({ n: 1, last: '2026-11-4' });
    expect(skipped.days[calendarKey(monday)].minutes).toBe(25);
    expect(skipped.day.minutes).toBe(25);
  });

  it('pays the task quest once per day and again after midnight', () => {
    const first = toggleTask(progressAt(monday), 1, monday);
    expect(first.state.xp).toBe(30);
    expect(first.state.day.claimed).toEqual(['q3']);

    const undone = toggleTask(first.state, 1, monday);
    expect(undone.state.xp).toBe(30);
    expect(undone.state.day.tasks).toBe(0);

    const repeated = toggleTask(undone.state, 1, monday);
    expect(repeated.state.xp).toBe(30);

    const cleared = toggleTask(repeated.state, 1, monday).state;
    const nextDay = toggleTask(cleared, 1, tuesdayMorning);
    expect(nextDay.state.day.d).toBe('2026-11-3');
    expect(nextDay.state.xp).toBe(60);
    expect(nextDay.state.day.claimed).toEqual(['q3']);
    expect(nextDay.state.days['2026-11-2'].claimed).toEqual(['q3']);
  });

  it('does not let undoing an earlier task erase another day’s count', () => {
    const tasks: Task[] = [
      task({ id: 1, text: 'Task A' }),
      task({ id: 2, text: 'Task B' }),
    ];
    const base: ProgressState = { ...progressAt(monday), tasks };

    // Monday: complete A.
    const afterA = toggleTask(base, 1, monday).state;
    expect(afterA.day.tasks).toBe(1);

    // Tuesday: complete B, then undo A from the day before.
    const afterB = toggleTask(afterA, 2, tuesdayMorning).state;
    expect(afterB.day.d).toBe('2026-11-3');
    expect(afterB.day.tasks).toBe(1);

    const undone = toggleTask(afterB, 1, tuesdayMorning).state;
    expect(undone.day.tasks).toBe(1);
    expect(undone.days['2026-11-2'].tasks).toBe(0);
  });

  it('leaves today out of it when undoing a task with no known completion day', () => {
    const tasks: Task[] = [
      task({ id: 1, text: 'Done before doneOn existed', done: true, pomos: 1, doneOn: null }),
      task({ id: 2, text: 'Task B' }),
    ];
    const base: ProgressState = { ...progressAt(monday), tasks };

    const afterB = toggleTask(base, 2, monday).state;
    expect(afterB.day.tasks).toBe(1);

    const undone = toggleTask(afterB, 1, monday).state;
    expect(undone.day.tasks).toBe(1);
    expect(Object.values(undone.days).every((day) => day.tasks >= 0)).toBe(true);
    expect(undone.days[afterB.day.d].tasks).toBe(1);
  });
});

describe('subtasks and the daily task count', () => {
  const monday = new Date(2026, 10, 2, 21).getTime();

  it('counts a task once when it is checked with its subtasks', () => {
    const base: ProgressState = {
      ...progressAt(monday),
      tasks: [
        task({ id: 1, text: 'Finish SQL course' }),
        task({ id: 2, text: 'Practice joins', parentId: 1 }),
        task({ id: 3, text: 'Window functions', parentId: 1 }),
      ],
    };
    const done = toggleTask(base, 1, monday);
    expect(done.state.day.tasks).toBe(1);
    expect(done.state.tasks.every((item) => item.done)).toBe(true);
    expect(done.state.activeId).toBeNull();
    expect(done.state.xp).toBe(30);
  });

  it('counts the task once when the last subtask finishes it', () => {
    const base: ProgressState = {
      ...progressAt(monday),
      activeId: null,
      tasks: [
        task({ id: 1, text: 'Finish SQL course' }),
        task({ id: 2, text: 'Practice joins', parentId: 1, done: true }),
        task({ id: 3, text: 'Window functions', parentId: 1 }),
      ],
    };
    const done = toggleTask(base, 3, monday).state;
    expect(done.day.tasks).toBe(1);
    expect(done.tasks.find((item) => item.id === 1)?.done).toBe(true);
    expect(done.xp).toBe(30);
  });

  it('undoes the task when a subtask is unchecked or added back', () => {
    const finished = toggleTask({
      ...progressAt(monday),
      tasks: [
        task({ id: 1, text: 'Finish SQL course' }),
        task({ id: 2, text: 'Practice joins', parentId: 1 }),
      ],
    }, 1, monday).state;
    expect(finished.day.tasks).toBe(1);

    const opened = toggleTask(finished, 2, monday).state;
    expect(opened.day.tasks).toBe(0);
    expect(opened.tasks.find((item) => item.id === 1)?.done).toBe(false);

    const again = toggleTask(opened, 1, monday).state;
    const reopened = addSubtask(again, 1, 'Indexes', monday).state;
    expect(reopened.day.tasks).toBe(0);
    expect(reopened.tasks.find((item) => item.id === 1)?.done).toBe(false);
  });

  it('undoes a deleted finished task and does not count a deleted subtask', () => {
    const finished = toggleTask(progressAt(monday), 1, monday).state;
    const removed = removeTask(finished, 1, monday).state;
    expect(removed.tasks).toEqual([]);
    expect(removed.day.tasks).toBe(0);
    expect(removed.activeId).toBeNull();

    const withSub: ProgressState = {
      ...progressAt(monday),
      activeId: null,
      tasks: [
        task({ id: 1, text: 'Finish SQL course' }),
        task({ id: 2, text: 'Practice joins', parentId: 1 }),
      ],
    };
    const dropped = removeTask(withSub, 2, monday).state;
    expect(dropped.day.tasks).toBe(0);
    expect(dropped.tasks).toEqual([withSub.tasks[0]]);
  });
});

describe('session records', () => {
  const end = new Date(2026, 10, 13, 10).getTime();

  it('records a finished focus session once, with the focused task', () => {
    const done = completeSession(progressAt(end), 'focus', end, 25);
    expect(done.state.log.sessions).toEqual([{ id: `${end}-25`, end, minutes: 25, task: 1 }]);
  });

  it('records no task when none is focused, and nothing for a break', () => {
    const idle = { ...progressAt(end), activeId: null };
    expect(completeSession(idle, 'focus', end, 25).state.log.sessions[0].task).toBeNull();
    expect(completeSession(idle, 'short', end, 5).state.log.sessions).toEqual([]);
  });
});
