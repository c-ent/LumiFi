import { XP_PER_FOCUS_MINUTE } from '@/src/core/xp';
import { colors, fonts } from '@/src/theme/tokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { QUESTS } from '@/components/lumifi/theme';
import { useTone } from '@/components/lumifi/features/tone';
import { progressWide as wide } from '@/components/lumifi/features/progression/wide-styles';

export function QuestList({ mobile = false, wide: desk = false }: { mobile?: boolean; wide?: boolean }) {
  const { day } = useLumiFi();
  const tone = useTone(mobile);
  const rows = QUESTS.map((quest) => {
    const value = Math.min(day[quest.key], quest.goal);
    // The reward stays claimed after a task is undone, so the paid state comes
    // from the stored claim, not from a counter that can fall back below goal.
    const done = day.claimed.includes(quest.id);
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
      <Text style={styles.kicker}>Daily quests</Text>
      {rows.map(({ quest, value, done, width }) => (
        <View key={quest.id} style={styles.quest}>
          <View style={styles.levelRow}>
            <Text style={[styles.taskText, done && styles.done]}>{quest.text} ({value}/{quest.goal})</Text>
            <Text style={[styles.reward, { color: colors.success }]}>{done ? `Claimed ${quest.reward} XP` : `+${quest.reward} XP`}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width, backgroundColor: done ? colors.success : tone.accent }]} />
          </View>
        </View>
      ))}
      <Text style={styles.note}>{`Every focus minute also earns ${XP_PER_FOCUS_MINUTE} XP.`}</Text>
    </View>
  );
}

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
