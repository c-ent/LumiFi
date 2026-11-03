import { calendarKey } from './calendar';
import { emptyDay } from './history';
import { completeSession, toggleTask } from './session';
import { ProgressState, Task } from './types';

function progressAt(now: number, focus = 25): ProgressState {
  const day = emptyDay(now);
  return {
    cfg: { focus, short: 5, long: 15 },
    xp: 0,
    streak: { n: 0, last: '' },
    day,
    days: { [day.d]: day },
    tasks: [{ id: 1, text: 'Read chapter 5', done: false, pomos: 0, doneOn: null }],
    activeId: 1,
    cycle: 0,
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
      { id: 1, text: 'Task A', done: false, pomos: 0, doneOn: null },
      { id: 2, text: 'Task B', done: false, pomos: 0, doneOn: null },
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
      { id: 1, text: 'Done before doneOn existed', done: true, pomos: 1, doneOn: null },
      { id: 2, text: 'Task B', done: false, pomos: 0, doneOn: null },
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
