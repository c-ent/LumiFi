import { colors } from '@/src/theme/tokens';
import React from 'react';
import { Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';

export function LevelCard({ mobile = false }: { mobile?: boolean }) {
  const { level, levelName, xpInLevel, xpNeeded } = useLumiFi();
  const tone = useTone(mobile);
  const width = `${Math.round((xpInLevel / xpNeeded) * 100)}%` as const;
  return (
    <View style={[styles.levelCard, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
      <View style={styles.levelRow}>
        <Text style={styles.levelTitle}>Level {level} {levelName}</Text>
        <Text style={styles.meta}>{xpInLevel} / {xpNeeded} XP</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width, backgroundColor: tone.accent }]} />
      </View>
    </View>
  );
}
