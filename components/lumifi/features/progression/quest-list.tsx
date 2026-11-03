import { colors } from '@/src/theme/tokens';
import React from 'react';
import { Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { QUESTS } from '@/components/lumifi/theme';
import { useTone } from '@/components/lumifi/features/tone';

export function QuestList({ mobile = false }: { mobile?: boolean }) {
  const { day } = useLumiFi();
  const tone = useTone(mobile);
  return (
    <View>
      <Text style={styles.kicker}>Daily quests</Text>
      {QUESTS.map((quest) => {
        const value = Math.min(day[quest.key], quest.goal);
        const done = value >= quest.goal;
        const width = `${Math.round((value / quest.goal) * 100)}%` as const;
        return (
          <View key={quest.id} style={styles.quest}>
            <View style={styles.levelRow}>
              <Text style={[styles.taskText, done && styles.done]}>{quest.text} ({value}/{quest.goal})</Text>
              <Text style={[styles.reward, { color: colors.success }]}>{done ? `Claimed ${quest.reward} XP` : `+${quest.reward} XP`}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width, backgroundColor: done ? colors.success : tone.accent }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
