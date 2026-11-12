import { DayStats } from './types';
import { grantXp } from './xp';

export const QUESTS = [
  { id: 'q1', text: 'Finish 4 focus sessions of at least 10 minutes', goal: 4, key: 'sessions' as const, reward: 40 },
  { id: 'q2', text: 'Study for 60 minutes', goal: 60, key: 'minutes' as const, reward: 50 },
  { id: 'q3', text: 'Complete 1 task', goal: 1, key: 'tasks' as const, reward: 30 },
];

/** True while any daily quest is still unclaimed. Reads the stored claims, so the dock dot cannot drift from the quest list. */
export function hasOpenQuests(day: DayStats): boolean {
  return QUESTS.some((quest) => !day.claimed.includes(quest.id));
}

export function claimReachedQuests(day: DayStats, xp: number, messages: string[]): { day: DayStats; xp: number } {
  let nextDay = day;
  let nextXp = xp;
  for (const quest of QUESTS) {
    if (nextDay[quest.key] >= quest.goal && !nextDay.claimed.includes(quest.id)) {
      nextDay = { ...nextDay, claimed: [...nextDay.claimed, quest.id] };
      nextXp = grantXp(nextXp, quest.reward, 'quest complete', messages);
    }
  }
  return { day: nextDay, xp: nextXp };
}
