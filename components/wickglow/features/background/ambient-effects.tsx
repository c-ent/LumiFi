import React, { useEffect, useId } from 'react';
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
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import type { AmbientMix } from '@/src/core/ambient';
import { RainOverlay, rand } from './rain';

/**
 * What each ambient sound looks like over the scene, on every layout. Each
 * effect follows its slider the way the rain does: nothing at zero, more (or
 * brighter) as it goes up, never in the way of a tap. They are kept sparse so
 * several together stay calm. Clock, Brown noise, Keyboard and Cafe have no
 * effect (owner, 2026-11-14): nothing natural to draw. Wind had streaks in
 * gusts; the owner removed them the same day.
 *
 * Back to front: tide (waves), fire glow and embers, fireflies (forest), rain.
 *
 * Like the rain, every effect runs off one looping 0..1 clock in Reanimated,
 * so the movement runs on the UI thread. Each particle repeats a whole number
 * of times per turn of the clock, so nothing jumps when the clock wraps.
 */
export function AmbientEffects({ mix }: { mix: AmbientMix }) {
  return (
    <>
      <TideOverlay amount={mix.waves} />
      <EmberOverlay amount={mix.fire} />
      <FireflyOverlay amount={mix.forest} />
      <RainOverlay amount={mix.rain} />
    </>
  );
}

const TAU = Math.PI * 2;

// A 0..1 clock that loops every `turnMs` while `active`, and rests at 0 when not.
function useLoopClock(active: boolean, turnMs: number) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      progress.set(0);
      return undefined;
    }
    progress.set(withRepeat(withTiming(1, { duration: turnMs, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(progress);
  }, [active, progress, turnMs]);
  return progress;
}

// The layer's pixel size, as shared values so measuring never re-renders.
function useLayerSize() {
  const height = useSharedValue(0);
  const width = useSharedValue(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const { height: h, width: w } = event.nativeEvent.layout;
    if (h > 0 && h !== height.get()) height.set(h);
    if (w > 0 && w !== width.get()) width.set(w);
  };
  return { height, width, onLayout };
}

// The slider as 0..1, and a particle count between `min` and `max` for it.
function levelOf(amount: number) {
  return Math.min(100, Math.max(0, amount)) / 100;
}
function countFor(amount: number, min: number, max: number) {
  return Math.round(min + levelOf(amount) * (max - min));
}

// A vertical fade from clear at the top to `color` at `alpha` at the bottom.
function FadeBand({ color, alpha }: { color: string; alpha: number }) {
  const id = `fade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset="1" stopColor={color} stopOpacity={alpha} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Fireplace: warm embers rising from the bottom edge over a faint orange glow
// that flickers. 6 embers at the lightest setting, 20 at full.

const EMBER_TURN = 12000;
const EMBER_COLORS = ['#FFB36B', '#FF8A3D', '#FFD08A'];

function EmberOverlay({ amount }: { amount: number }) {
  const reduced = useReducedMotion();
  const progress = useLoopClock(amount > 0 && !reduced, EMBER_TURN);
  const { height, width, onLayout } = useLayerSize();
  const level = levelOf(amount);

  // Two quick flickers summed: whole cycles per turn, so the loop is seamless.
  const glowStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return { opacity: 0.82 + 0.12 * Math.sin(p * TAU * 9) + 0.06 * Math.sin(p * TAU * 23) };
  });

  if (amount <= 0) return null;
  const count = countFor(amount, 6, 20);
  return (
    <View pointerEvents="none" style={styles.layer} onLayout={onLayout}>
      <Animated.View style={[styles.glow, reduced ? null : glowStyle]}>
        <FadeBand color="#FF7A2E" alpha={0.08 + level * 0.12} />
      </Animated.View>
      {Array.from({ length: count }, (_, index) => (
        <Ember key={index} index={index} progress={progress} height={height} width={width} reduced={reduced} />
      ))}
    </View>
  );
}

function Ember({ index, progress, height, width, reduced }: Particle) {
  const phase = rand(index + 11);
  const speed = 2 + Math.floor(rand(index + 111) * 3); // 2..4 rises per turn: 3 to 6 s each
  const size = 2 + rand(index + 211) * 2.5;
  const alpha = 0.45 + rand(index + 311) * 0.4;
  const reach = 0.3 + rand(index + 411) * 0.35; // how far up the screen it gets
  const sway = 8 + rand(index + 511) * 14;
  const color = EMBER_COLORS[index % EMBER_COLORS.length];

  const style = useAnimatedStyle(() => {
    const h = height.get();
    const w = width.get();
    if (h <= 0 || w <= 0) return { opacity: 0 };
    const t = progress.get() * speed + phase;
    const rise = t - Math.floor(t);
    // A new spot along the bottom for each rise. Rises repeat every `speed`,
    // the clock's turn, so the spot cannot change mid-rise.
    const pass = ((Math.floor(t) % speed) + speed) % speed;
    const x = rand(index * 29 + pass * 13 + 3) * w + Math.sin(rise * TAU * 1.5 + phase * TAU) * sway;
    const y = h - rise * h * reach;
    // Fades in from the bottom and out at the top of its rise.
    return { opacity: Math.sin(Math.PI * rise) * alpha, transform: [{ translateX: x }, { translateY: y }] };
  });

  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };
  if (reduced) {
    return <View style={[styles.particle, dot, { left: `${Math.floor(rand(index + 611) * 100)}%`, bottom: `${Math.floor(rand(index + 711) * 30)}%`, top: undefined, opacity: alpha * 0.6 }]} />;
  }
  return <Animated.View style={[styles.particle, dot, style]} />;
}

// ---------------------------------------------------------------------------
// Forest: fireflies, small soft dots wandering in the lower part of the
// screen and slowly glowing on and off. 8 at the lightest, 28 at full (owner
// doubled them, 2026-11-14).

const FLY_TURN = 24000;
const FLY_BOX = 12;

function FireflyOverlay({ amount }: { amount: number }) {
  const reduced = useReducedMotion();
  const progress = useLoopClock(amount > 0 && !reduced, FLY_TURN);
  const { height, width, onLayout } = useLayerSize();
  if (amount <= 0) return null;
  const count = countFor(amount, 8, 28);
  return (
    <View pointerEvents="none" style={styles.layer} onLayout={onLayout}>
      {Array.from({ length: count }, (_, index) => (
        <Firefly key={index} index={index} progress={progress} height={height} width={width} reduced={reduced} />
      ))}
    </View>
  );
}

function Firefly({ index, progress, height, width, reduced }: Particle) {
  const phase = rand(index + 41) * TAU;
  const a = 1 + Math.floor(rand(index + 141) * 2); // wander loops per turn
  const b = 2 + Math.floor(rand(index + 241) * 2);
  const blink = 5 + Math.floor(rand(index + 341) * 4); // glows per turn: about 3 to 5 s each
  const alpha = 0.6 + rand(index + 441) * 0.35;

  const style = useAnimatedStyle(() => {
    const h = height.get();
    const w = width.get();
    if (h <= 0 || w <= 0) return { opacity: 0 };
    const p = progress.get();
    const baseX = rand(index + 21) * w;
    const baseY = h * (0.35 + rand(index + 121) * 0.6);
    const x = baseX + Math.sin(p * TAU * a + phase) * 36 + Math.sin(p * TAU * b + phase * 2) * 14;
    const y = baseY + Math.cos(p * TAU * a + phase * 3) * 22 + Math.sin(p * TAU * (b + 1)) * 10;
    const s = Math.max(0, Math.sin(p * TAU * blink + phase));
    return { opacity: s * s * alpha, transform: [{ translateX: x - FLY_BOX / 2 }, { translateY: y - FLY_BOX / 2 }] };
  });

  const body = (
    <View style={styles.flyHalo}>
      <View style={styles.flyCore} />
    </View>
  );
  if (reduced) {
    return (
      <View style={[styles.particle, { left: `${Math.floor(rand(index + 21) * 100)}%`, top: `${Math.floor((0.35 + rand(index + 121) * 0.6) * 100)}%`, opacity: alpha * 0.5 }]}>
        {body}
      </View>
    );
  }
  return <Animated.View style={[styles.particle, style]}>{body}</Animated.View>;
}

// ---------------------------------------------------------------------------
// Waves: two soft bands of light along the bottom that rise and fall like a
// tide, out of step. The slider sets how bright they are.

const TIDE_TURN = 18000;

function TideOverlay({ amount }: { amount: number }) {
  const reduced = useReducedMotion();
  const progress = useLoopClock(amount > 0 && !reduced, TIDE_TURN);
  const level = levelOf(amount);

  // Two swells per turn (9 s each) for the main band, three for the low one.
  const mainStyle = useAnimatedStyle(() => {
    const swell = 0.5 - 0.5 * Math.cos(progress.get() * TAU * 2);
    return { opacity: 0.7 + 0.3 * swell, transform: [{ translateY: (1 - swell) * 40 }] };
  });
  const lowStyle = useAnimatedStyle(() => {
    const swell = 0.5 - 0.5 * Math.cos(progress.get() * TAU * 3 + Math.PI);
    return { opacity: 0.6 + 0.4 * swell, transform: [{ translateY: (1 - swell) * 26 }] };
  });

  if (amount <= 0) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View style={[styles.tideMain, reduced ? { transform: [{ translateY: 20 }] } : mainStyle]}>
        <FadeBand color="#9FD8E8" alpha={0.06 + level * 0.12} />
      </Animated.View>
      <Animated.View style={[styles.tideLow, reduced ? { transform: [{ translateY: 13 }] } : lowStyle]}>
        <FadeBand color="#C8ECF2" alpha={0.04 + level * 0.08} />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------

type Particle = {
  index: number;
  progress: SharedValue<number>;
  height: SharedValue<number>;
  width: SharedValue<number>;
  reduced: boolean;
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // The fire glow: the lowest fifth of the screen.
  glow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '22%',
  },
  flyHalo: {
    width: FLY_BOX,
    height: FLY_BOX,
    borderRadius: FLY_BOX / 2,
    backgroundColor: 'rgba(220, 240, 140, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyCore: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: 'rgba(235, 248, 170, 0.95)',
  },
  // The tide bands run past the bottom edge, so moving down never shows a gap.
  tideMain: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '74%',
    bottom: -48,
  },
  tideLow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '86%',
    bottom: -32,
  },
});
