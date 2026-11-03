import React, { useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/components/lumifi/hooks/use-reduced-motion';

// Streak length. Ends fade out before the screen edge, so a clip never reads as a tick.
const BASE_LENGTH = 22;

export function RainOverlay({ amount }: { amount: number }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const span = useSharedValue(0);
  const falling = amount > 0 && !reduced;

  useEffect(() => {
    if (!falling) {
      cancelAnimation(progress);
      progress.set(0);
      return undefined;
    }
    // Animated.loop with the native driver runs this once on web: the native
    // module is missing, the JS timing ignores `iterations`, and every streak
    // freezes at the end of the travel. Reanimated repeats the clock instead.
    progress.set(
      withRepeat(withTiming(1, { duration: 1700, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(progress);
  }, [falling, progress]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    if (next > 0 && next !== span.get()) span.set(next);
  };

  if (amount <= 0) return null;
  const level = Math.min(100, amount);
  const count = Math.round(8 + (level / 100) * 42);

  return (
    <View pointerEvents="none" style={styles.layer} onLayout={onLayout}>
      {Array.from({ length: count }, (_, index) => (
        <RainStreak
          key={index}
          index={index}
          count={count}
          progress={progress}
          span={span}
          reduced={reduced}
        />
      ))}
    </View>
  );
}

function RainStreak({
  index,
  count,
  progress,
  span,
  reduced,
}: {
  index: number;
  count: number;
  progress: SharedValue<number>;
  span: SharedValue<number>;
  reduced: boolean;
}) {
  const phase = index / count;
  const length = BASE_LENGTH + (index % 5) * 8;
  const left = `${(index * 37) % 100}%`;
  const style = useAnimatedStyle(() => {
    const height = span.get();
    if (height <= 0) return { opacity: 0, transform: [{ translateY: -length }] };
    // 0 and 1 land on the same place, so the repeat jump is not a visible pop.
    const wrapped = (progress.get() + phase) % 1;
    const top = -length + wrapped * (height + length);
    return {
      opacity: edgeFade(top, height, length),
      transform: [{ translateY: top }],
    };
  });

  if (reduced) {
    return <View style={[styles.streak, { left, top: `${(index * 23) % 100}%`, height: length }]} />;
  }
  return <Animated.View style={[styles.streak, { left, height: length }, style]} />;
}

function edgeFade(top: number, height: number, length: number) {
  'worklet';
  const bottom = top + length;
  // Gone before the streak crosses either edge. A clip there leaves a 1px tick.
  const entering = Math.min(1, Math.max(0, bottom / length));
  const leaving = Math.min(1, Math.max(0, (height - bottom - 12) / length));
  return Math.min(entering, leaving);
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    overflow: 'hidden',
  },
  streak: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
});
