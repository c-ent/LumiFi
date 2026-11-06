import { colors, fonts } from '@/src/theme/tokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';
import { progressWide as wide } from '@/components/lumifi/features/progression/wide-styles';

const RING = 36;
const RING_LENGTH = 2 * Math.PI * RING;

export function LevelCard({ mobile = false, wide: desk = false }: { mobile?: boolean; wide?: boolean }) {
  const { level, levelName, xpInLevel, xpNeeded } = useLumiFi();
  const tone = useTone(mobile);
  const ratio = xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 0;
  const width = `${Math.round(ratio * 100)}%` as const;
  const left = Math.max(0, xpNeeded - xpInLevel);

  if (desk) {
    return (
      <View style={wide.card}>
        <View style={deskStyles.row}>
          <View style={deskStyles.ring}>
            <Svg width={84} height={84} viewBox="0 0 84 84" style={deskStyles.spin}>
              <Circle cx="42" cy="42" r={RING} fill="none" stroke="rgba(255, 255, 255, 0.14)" strokeWidth={7} />
              <Circle
                cx="42"
                cy="42"
                r={RING}
                fill="none"
                stroke={tone.accent}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
                strokeDashoffset={RING_LENGTH * (1 - ratio)}
              />
            </Svg>
            <Text style={deskStyles.levelNum}>{level}</Text>
          </View>
          <View style={deskStyles.copy}>
            <Text style={deskStyles.name}>Level {level} {levelName}</Text>
            <Text style={[deskStyles.meta, wide.tabular]}>{xpInLevel} / {xpNeeded} XP · {left} to Level {level + 1}</Text>
            <View style={[wide.barTrack, deskStyles.bar]}>
              <View style={[wide.barFill, { width, backgroundColor: tone.accent }]} />
            </View>
          </View>
        </View>
      </View>
    );
  }

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

const deskStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  ring: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spin: {
    transform: [{ rotate: '-90deg' }],
  },
  levelNum: {
    position: 'absolute',
    color: colors.textPrimary,
    fontFamily: fonts.timeMedium,
    fontSize: 28,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: fonts.timeMedium,
    fontSize: 24,
    lineHeight: 29,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 4,
  },
  bar: {
    marginTop: 10,
  },
});
