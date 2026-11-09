import { colors, fonts } from '@/src/theme/tokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { progressWide as wide } from '@/components/lumifi/features/progression/wide-styles';

/**
 * Three number tiles: minutes focused today, sessions today, total XP.
 * Read straight from the saved `day` totals; nothing is computed here.
 */
export function StatGrid({ wide: desk = false }: { wide?: boolean }) {
  const { day, xp } = useLumiFi();
  const items = [
    { value: String(day.minutes), label: 'min today' },
    { value: String(day.sessions), label: desk ? 'sessions today' : 'sessions' },
    { value: String(xp), label: 'total XP' },
  ];

  if (desk) {
    return (
      <View style={deskStyles.row}>
        {items.map((item) => (
          <View key={item.label} style={deskStyles.stat}>
            <Text style={[deskStyles.value, wide.tabular]}>{item.value}</Text>
            <Text style={deskStyles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  }

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

const deskStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 7,
  },
  stat: {
    flex: 1,
    paddingTop: 9,
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  value: {
    color: colors.textPrimary,
    fontFamily: fonts.timeMedium,
    fontSize: 21,
    lineHeight: 24,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
});
