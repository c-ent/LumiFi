import { SESSION_REWARD_MINUTES, countsAsRewardSession, focusSessionXp, grantXp, levelInfo } from './xp';

describe('XP and levels', () => {
  it('awards 2 XP per completed focus minute', () => {
    expect(focusSessionXp(1)).toBe(2);
    expect(focusSessionXp(25)).toBe(50);
    expect(focusSessionXp(60)).toBe(120);
  });

  it('counts a session toward the streak and the session quest from 10 minutes', () => {
    expect(SESSION_REWARD_MINUTES).toBe(10);
    expect(countsAsRewardSession(9)).toBe(false);
    expect(countsAsRewardSession(10)).toBe(true);
  });

  it('uses the exact level thresholds and caps the name at Archmage', () => {
    expect(levelInfo(0)).toEqual({ level: 1, left: 0, need: 100, name: 'Novice' });
    expect(levelInfo(99)).toEqual({ level: 1, left: 99, need: 100, name: 'Novice' });
    expect(levelInfo(100)).toEqual({ level: 2, left: 0, need: 150, name: 'Apprentice' });
    expect(levelInfo(249)).toEqual({ level: 2, left: 149, need: 150, name: 'Apprentice' });
    expect(levelInfo(250)).toEqual({ level: 3, left: 0, need: 200, name: 'Lamplighter' });
    expect(levelInfo(450)).toEqual({ level: 4, left: 0, need: 250, name: 'Scholar' });
    expect(levelInfo(700)).toEqual({ level: 5, left: 0, need: 300, name: 'Sage' });
    expect(levelInfo(1000)).toEqual({ level: 6, left: 0, need: 350, name: 'Archmage' });
    expect(levelInfo(1349)).toEqual({ level: 6, left: 349, need: 350, name: 'Archmage' });
    expect(levelInfo(1350)).toEqual({ level: 7, left: 0, need: 400, name: 'Archmage' });
  });

  it('reports a level-up from the XP crossing a threshold', () => {
    const messages: string[] = [];
    expect(grantXp(90, 50, 'for 25 focused minutes', messages)).toBe(140);
    expect(messages).toEqual(['Level up! You reached level 2 (+50 XP)']);
  });
});
