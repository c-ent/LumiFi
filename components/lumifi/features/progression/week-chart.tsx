import { recentDayMinutes } from '@/src/core/history';
import { colors } from '@/src/theme/tokens';
import React from 'react';
import { Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';

export function WeekChart({ mobile = false }: { mobile?: boolean }) {
  const { days, now } = useLumiFi();
  const tone = useTone(mobile);
  const history = recentDayMinutes(days, now, 7);
  const max = Math.max(120, ...history.map((entry) => entry.minutes));
  return (
    <View>
      <Text style={styles.kicker}>Last 7 days</Text>
      <View style={styles.week}>
        {history.map((entry, index) => {
          const label = new Date(entry.at).toLocaleDateString('en', { weekday: 'short' });
          const today = index === history.length - 1;
          return (
            <View key={entry.at} style={styles.dayCol}>
              <Text style={styles.meta}>{entry.minutes}</Text>
              <View style={[styles.colBar, { height: Math.max(4, (entry.minutes / max) * 86), backgroundColor: today ? tone.accent : colors.border }]} />
              <Text style={styles.dayLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
