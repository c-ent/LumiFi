import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { colors } from '@/src/theme/tokens';

// Each bar: its resting height (as a share of the icon) and how long one rise
// and fall takes, so the three never move in step.
const BARS = [
  { rest: 0.45, ms: 820 },
  { rest: 0.85, ms: 640 },
  { rest: 0.6, ms: 940 },
];

/**
 * Three bars that rise and fall, shown on the desktop Music dock button while
 * a track plays. Same `size` and `color` props as the other icons. Under
 * reduced motion the bars stand still at their resting heights.
 */
export function EqualizerIcon({ size = 19, color = colors.textPrimary }: { size?: number; color?: string }) {
  const reduced = useReducedMotion();
  const bar = Math.max(2, Math.round(size * 0.16));
  const box = Math.round(size * 0.8);
  return (
    <View style={[s.row, { width: size, height: size, gap: bar }]}>
      {BARS.map((b, i) => (
        <Bar key={i} width={bar} height={box} color={color} rest={b.rest} ms={b.ms} still={reduced} />
      ))}
    </View>
  );
}

function Bar({ width, height, color, rest, ms, still }: { width: number; height: number; color: string; rest: number; ms: number; still: boolean }) {
  const [scale] = useState(() => new Animated.Value(rest));

  useEffect(() => {
    if (still) {
      scale.setValue(rest);
      return;
    }
    const half = ms / 2;
    const ease = Easing.inOut(Easing.quad);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: half, easing: ease, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(scale, { toValue: 0.25, duration: half, easing: ease, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(scale, { toValue: rest, duration: half, easing: ease, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, rest, ms, still]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: width / 2,
        backgroundColor: color,
        transformOrigin: 'bottom',
        transform: [{ scaleY: scale }],
      }}
    />
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 2,
  },
});
