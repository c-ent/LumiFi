import { XP_PER_FOCUS_MINUTE } from '@/src/core/xp';
import { colors, fonts } from '@/src/theme/tokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useWickglow } from '@/components/wickglow/logic';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { QUESTS } from '@/components/wickglow/theme';
import { useTone } from '@/components/wickglow/features/tone';
import { progressWide as wide } from '@/components/wickglow/features/progression/wide-styles';

/**
 * The daily quests list (4 sessions, 60 minutes, 1 task) with a progress bar and
 * reward per quest. This component only DISPLAYS progress: the counters live in
 * `day` and the rewards are paid by src/core/quests.ts when a session ends.
 *
 * `wide: desk` renames the `wide` prop locally because `wide` is already the
 * name of the imported shared style object. Two layouts, one data table:
 * the desktop card (wide) and the compact phone/tablet list.
 */
export function QuestList({ mobile = false, wide: desk = false, title = 'Daily quests' }: { mobile?: boolean; wide?: boolean; title?: string }) {
  const { day } = useWickglow();
  const tone = useTone(mobile);
  // Pre-compute each row once so both layouts render identical numbers.
  const rows = QUESTS.map((quest) => {
    const value = Math.min(day[quest.key], quest.goal);
    // The reward stays claimed after a task is undone, so the paid state comes
    // from the stored claim, not from a counter that can fall back below goal.
    const done = day.claimed.includes(quest.id);
    // Bar fill as a percent string. `as const` narrows it to a template-literal
    // type, which React Native's `width` style requires.
    const width = `${Math.round((value / quest.goal) * 100)}%` as const;
    return { quest, value, done, width };
  });

  if (desk) {
    return (
      <View style={wide.card}>
        <Text style={[styles.kicker, wide.label]}>Daily quests</Text>
        {rows.map(({ quest, value, done, width }, index) => (
          <View key={quest.id} style={[deskStyles.quest, index === 0 && deskStyles.questFirst]}>
            <View style={deskStyles.copy}>
              <View style={deskStyles.line}>
                <Text style={deskStyles.name}>{quest.text}</Text>
                <Text style={deskStyles.reward}>{done ? `Claimed ${quest.reward} XP` : `+${quest.reward} XP`}</Text>
              </View>
              <View style={wide.barThin}>
                <View style={[wide.barFill, { width, backgroundColor: done ? colors.success : tone.accent }]} />
              </View>
              <Text style={deskStyles.count}>{value} / {quest.goal}</Text>
            </View>
          </View>
        ))}
        <Text style={deskStyles.note}>{`Every focus minute also earns ${XP_PER_FOCUS_MINUTE} XP.`}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.kicker, styles.kickerLg]}>{title}</Text>
      {/* One tile per quest: name and reward, the bar, then the count. */}
      {rows.map(({ quest, value, done, width }) => (
        <View key={quest.id} style={styles.questCard}>
          <View style={tileStyles.line}>
            <Text style={[styles.taskText, tileStyles.name, done && styles.done]}>{quest.text}</Text>
            <Text style={[styles.reward, { color: colors.success }]}>{done ? `Claimed ${quest.reward} XP` : `+${quest.reward} XP`}</Text>
          </View>
          <View style={[styles.barTrack, tileStyles.bar]}>
            <View style={[styles.barFill, { width, backgroundColor: done ? colors.success : tone.accent }]} />
          </View>
          <Text style={styles.meta}>{value} / {quest.goal}</Text>
        </View>
      ))}
      <Text style={styles.note}>{`Every focus minute also earns ${XP_PER_FOCUS_MINUTE} XP.`}</Text>
    </View>
  );
}

// Phone and tablet quest tiles.
const tileStyles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  name: {
    flex: 1,
  },
  // The card's gap spaces the rows, so the shared bar's own margin is dropped.
  bar: {
    marginTop: 0,
  },
});

// Desktop-only styles. Rows are divided by a hairline; the first has none.
const deskStyles = StyleSheet.create({
  quest: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  questFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  copy: {
    minWidth: 0,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  name: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  reward: {
    color: colors.success,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  count: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 6,
  },
  note: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});
