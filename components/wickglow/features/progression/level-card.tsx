import { colors, fonts } from '@/src/theme/tokens';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useWickglow } from '@/components/wickglow/logic';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { useTone } from '@/components/wickglow/features/tone';
import { progressWide as wide } from '@/components/wickglow/features/progression/wide-styles';

// Radius of the progress ring, and its circumference. The ring is a circle
// whose dash pattern is as long as the circle; shifting the dash offset hides
// part of it, which is the standard SVG trick for a circular progress bar.
const RING = 26;
const RING_LENGTH = 2 * Math.PI * RING;

/**
 * Shows the current level, its name and XP progress to the next level.
 * Desktop: a ring around the level number. Phone/tablet: a plain bar.
 * All numbers come from `levelInfo(xp)` in src/core/xp.ts via the context.
 */
export function LevelCard({ mobile = false, wide: desk = false }: { mobile?: boolean; wide?: boolean }) {
  const { level, levelName, xpInLevel, xpNeeded } = useWickglow();
  const tone = useTone(mobile);
  // 0..1 progress through the current level (guards against divide-by-zero).
  const ratio = xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 0;
  const width = `${Math.round(ratio * 100)}%` as const;
  const left = Math.max(0, xpNeeded - xpInLevel);

  if (desk) {
    return (
      <View style={wide.card}>
        <View style={deskStyles.row}>
          <View style={deskStyles.ring}>
            {/* Track (faint full circle), then the filled arc on top. The SVG is
                rotated -90deg by `spin` so the arc starts at 12 o'clock. */}
            <Svg width={62} height={62} viewBox="0 0 62 62" style={deskStyles.spin}>
              <Circle cx="31" cy="31" r={RING} fill="none" stroke="rgba(255, 255, 255, 0.14)" strokeWidth={5} />
              <Circle
                cx="31"
                cy="31"
                r={RING}
                fill="none"
                stroke={tone.accent}
                strokeWidth={5}
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
    gap: 12,
  },
  ring: {
    width: 62,
    height: 62,
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
    fontSize: 21,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: fonts.timeMedium,
    fontSize: 18,
    lineHeight: 23,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 3,
  },
  bar: {
    marginTop: 7,
  },
});
