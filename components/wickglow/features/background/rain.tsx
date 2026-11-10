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
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';

/**
 * Falling rain drawn over the desktop scene (and any layout when the rain
 * slider is above zero). Each drop is a thin white View moved by Reanimated.
 *
 * Why Reanimated and not RN's `Animated`: the movement runs on the UI thread
 * with no per-frame JS work, and 50 streaks stay smooth.
 */

// Minimum streak height in px; each streak adds up to 30 more.
const BASE_LENGTH = 22;
// One clock turn. A streak with speed k falls k times per turn, so the repeat
// seam lands on a whole number of falls and nothing jumps when it wraps.
const TURN_MS = 9000;

// Cheap deterministic "random" (the classic sin-hash). A given index always
// gives the same value, so streaks keep their look across renders and the
// slider can add/remove streaks without reshuffling the rest.
// 'worklet' lets Reanimated run this on the UI thread inside animated styles.
function rand(seed: number) {
  'worklet';
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** `amount` is the rain slider, 0..100. At 0 nothing is rendered at all. */
export function RainOverlay({ amount }: { amount: number }) {
  const reduced = useReducedMotion();
  // One shared 0..1 clock drives every streak. Height/width are shared values
  // (not state) so measuring the layer never triggers a React re-render.
  const progress = useSharedValue(0);
  const height = useSharedValue(0);
  const width = useSharedValue(0);
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
      withRepeat(withTiming(1, { duration: TURN_MS, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(progress);
  }, [falling, progress]);

  // Learn the layer's pixel size so streaks know how far to fall.
  const onLayout = (event: LayoutChangeEvent) => {
    const { height: h, width: w } = event.nativeEvent.layout;
    if (h > 0 && h !== height.get()) height.set(h);
    if (w > 0 && w !== width.get()) width.set(w);
  };

  // Hooks above must run on every render, so this early return comes after them.
  if (amount <= 0) return null;
  // 8 streaks at the lightest setting up to 50 at full.
  const level = Math.min(100, amount);
  const count = Math.round(8 + (level / 100) * 42);

  return (
    // pointerEvents="none": rain is decoration and must never block taps.
    <View pointerEvents="none" style={styles.layer} onLayout={onLayout}>
      {Array.from({ length: count }, (_, index) => (
        <RainStreak
          key={index}
          index={index}
          progress={progress}
          height={height}
          width={width}
          reduced={reduced}
        />
      ))}
    </View>
  );
}

// One falling drop. With reduced motion it is a still line at a fixed spot.
function RainStreak({
  index,
  progress,
  height,
  width,
  reduced,
}: {
  index: number;
  progress: SharedValue<number>;
  height: SharedValue<number>;
  width: SharedValue<number>;
  reduced: boolean;
}) {
  // Everything below depends on the index alone, so the slider adding or
  // removing streaks never moves the ones already falling.
  const phase = rand(index + 1);
  const speed = 5 + Math.floor(rand(index + 101) * 6); // 5..10 falls per turn: 0.9s to 1.8s each
  const length = BASE_LENGTH + Math.floor(rand(index + 201) * 30);
  const alpha = 0.16 + rand(index + 301) * 0.2;

  // Runs on the UI thread every frame: turns the shared clock into this
  // streak's position. Hidden until the layer has been measured.
  const style = useAnimatedStyle(() => {
    const h = height.get();
    const w = width.get();
    if (h <= 0 || w <= 0) return { opacity: 0, transform: [{ translateY: -length }] };
    const t = progress.get() * speed + phase;
    const fall = t - Math.floor(t);
    // Each pass picks a new column. Passes repeat every `speed` falls, which is
    // exactly the clock's turn, so the column cannot change mid-screen.
    const pass = ((Math.floor(t) % speed) + speed) % speed;
    const x = rand(index * 31 + pass * 7 + 5) * w;
    // Enters fully above the top and leaves fully below the bottom, so no streak is ever clipped.
    const y = -length + fall * (h + length);
    return { opacity: 1, transform: [{ translateX: x }, { translateY: y }] };
  });

  const color = `rgba(255,255,255,${alpha.toFixed(2)})`;
  if (reduced) {
    return (
      <View
        style={[
          styles.streak,
          { left: `${Math.floor(rand(index + 401) * 100)}%`, top: `${Math.floor(phase * 100)}%`, height: length, backgroundColor: color },
        ]}
      />
    );
  }
  return <Animated.View style={[styles.streak, { height: length, backgroundColor: color }, style]} />;
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
    left: 0,
    width: 1,
  },
});
