import { colors } from '@/src/theme/tokens';
import React from 'react';
import { Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';

export function StatGrid() {
  const { day, xp } = useLumiFi();
  const items = [
    { value: String(day.minutes), label: 'min today' },
    { value: String(day.sessions), label: 'sessions' },
    { value: String(xp), label: 'total XP' },
  ];
  return (
    <View style={styles.stats}>
      {items.map((item) => (
        <View key={item.label} style={[styles.stat, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.meta}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
