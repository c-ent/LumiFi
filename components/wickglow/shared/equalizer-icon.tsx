import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
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
  // On the UI thread (Reanimated): up to full, down to a quarter, back to rest.
  const scale = useSharedValue(rest);

  useEffect(() => {
    cancelAnimation(scale);
    scale.set(rest);
    if (still) return undefined;
    const half = ms / 2;
    const ease = Easing.inOut(Easing.quad);
    scale.set(withRepeat(
      withSequence(
        withTiming(1, { duration: half, easing: ease }),
        withTiming(0.25, { duration: half, easing: ease }),
        withTiming(rest, { duration: half, easing: ease }),
      ),
      -1,
      false,
    ));
    return () => cancelAnimation(scale);
  }, [scale, rest, ms, still]);

  const grow = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.get() }] }));

  return (
    <Reanimated.View
      style={[
        {
          width,
          height,
          borderRadius: width / 2,
          backgroundColor: color,
          transformOrigin: 'bottom',
        },
        grow,
      ]}
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
