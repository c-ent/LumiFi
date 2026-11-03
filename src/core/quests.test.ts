import { claimReachedQuests } from './quests';
import { DayStats } from './types';

function day(patch: Partial<DayStats>): DayStats {
  return { d: '2026-11-2', sessions: 0, minutes: 0, tasks: 0, claimed: [], ...patch };
}

describe('quest rewards', () => {
  it('pays each quest once, at its exact goal', () => {
    expect(claimReachedQuests(day({ sessions: 3, minutes: 59 }), 10, []).xp).toBe(10);

    const sessions = claimReachedQuests(day({ sessions: 4 }), 0, []);
    expect(sessions.xp).toBe(40);
    expect(sessions.day.claimed).toEqual(['q1']);
    expect(claimReachedQuests(sessions.day, sessions.xp, []).xp).toBe(40);

    const minutes = claimReachedQuests(day({ minutes: 60 }), 0, []);
    expect(minutes.xp).toBe(50);
    expect(minutes.day.claimed).toEqual(['q2']);

    const task = claimReachedQuests(day({ tasks: 1 }), 0, []);
    expect(task.xp).toBe(30);
    expect(task.day.claimed).toEqual(['q3']);
  });

  it('pays all three together and can pay them again on a new day', () => {
    const all = claimReachedQuests(day({ sessions: 4, minutes: 60, tasks: 1 }), 0, []);
    expect(all.xp).toBe(120);
    expect(all.day.claimed).toEqual(['q1', 'q2', 'q3']);

    const nextDay = claimReachedQuests(day({ d: '2026-11-3', sessions: 4, minutes: 60, tasks: 1 }), all.xp, []);
    expect(nextDay.xp).toBe(240);
    expect(nextDay.day.claimed).toEqual(['q1', 'q2', 'q3']);
    expect(all.day.claimed).toEqual(['q1', 'q2', 'q3']);
  });
});
