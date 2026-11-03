export const XP_PER_FOCUS_MINUTE = 2;

export const LEVEL_NAMES = ['Novice', 'Apprentice', 'Lamplighter', 'Scholar', 'Sage', 'Archmage'];

export function focusSessionXp(minutes: number): number {
  return minutes * XP_PER_FOCUS_MINUTE;
}

export function levelInfo(total: number) {
  let level = 1;
  let need = 100;
  let left = total;
  while (left >= need) {
    left -= need;
    level += 1;
    need = 100 + 50 * (level - 1);
  }
  return { level, left, need, name: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] };
}

export function grantXp(xp: number, amount: number, label: string, messages: string[]): number {
  const before = levelInfo(xp).level;
  const nextXp = xp + amount;
  const after = levelInfo(nextXp).level;
  messages.push(
    after > before
      ? `Level up! You reached level ${after} (+${amount} XP)`
      : `+${amount} XP ${label}`,
  );
  return nextXp;
}
