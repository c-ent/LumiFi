import { recentDayMinutes } from '@/src/core/history';
import { colors, fade, fonts } from '@/src/theme/tokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';
import { progressWide as wide } from '@/components/lumifi/features/progression/wide-styles';

export function WeekChart({ mobile = false, wide: desk = false }: { mobile?: boolean; wide?: boolean }) {
  const { days, now } = useLumiFi();
  const tone = useTone(mobile);
  const history = recentDayMinutes(days, now, 7);
  const max = Math.max(120, ...history.map((entry) => entry.minutes));
  const columns = history.map((entry, index) => {
    const label = new Date(entry.at).toLocaleDateString('en', { weekday: 'short' });
    const today = index === history.length - 1;
    const height = Math.max(4, (entry.minutes / max) * (desk ? 96 : 86));
    return { entry, label, today, height };
  });

  const chart = (
    <View style={desk ? deskStyles.week : styles.week}>
      {columns.map(({ entry, label, today, height }) => {
        const fill = desk
          ? (today ? tone.accent : entry.minutes > 0 ? fade(tone.accent, 0.45) : 'rgba(255, 255, 255, 0.14)')
          : (today ? tone.accent : colors.border);
        return (
          <View key={entry.at} style={desk ? deskStyles.col : styles.dayCol}>
            <Text style={[desk ? deskStyles.count : styles.meta, today && desk ? { color: tone.accent, fontFamily: fonts.bodySemibold } : null, desk ? wide.tabular : null]}>{entry.minutes}</Text>
            <View style={[desk ? deskStyles.bar : styles.colBar, { height, backgroundColor: fill }]} />
            <Text style={[desk ? deskStyles.day : styles.dayLabel, today && desk ? { color: tone.accent, fontFamily: fonts.bodySemibold } : null]}>{desk && today ? 'Today' : label}</Text>
          </View>
        );
      })}
    </View>
  );

  if (!desk) {
    return (
      <View>
        <Text style={styles.kicker}>Last 7 days</Text>
        {chart}
      </View>
    );
  }

  return (
    <View style={wide.card}>
      <Text style={[styles.kicker, wide.label]}>Last 7 days</Text>
      {chart}
    </View>
  );
}

const deskStyles = StyleSheet.create({
  week: {
    height: 150,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  col: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  count: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  bar: {
    width: '100%',
    maxWidth: 34,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  day: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
