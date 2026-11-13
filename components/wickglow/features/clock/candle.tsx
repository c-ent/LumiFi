import { breakWax } from '@/src/theme/tokens';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useAnimatedValue } from '@/components/wickglow/hooks/use-animated-value';
import Reanimated, {
  cancelAnimation,
  Easing as ReEasing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { MoodTheme, TimerMode } from '@/components/wickglow/theme';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { useWickglowClock } from '@/components/wickglow/logic';

/**
 * The candle on the phone and tablet screens. It IS the timer's progress bar:
 * the wax shrinks as the session runs, so you read time left by candle height.
 *
 * It is drawn as one SVG (react-native-svg) instead of images so the colors
 * can follow the mood, and so the wax height can be computed from `progress`.
 *
 * Two animation systems are used on purpose:
 * - RN's built-in `Animated` for the entrance slide and the idle hint loop.
 * - Reanimated for the flame's opacity and flicker, because SVG props
 *   (`useAnimatedProps`) can only be animated on the UI thread through
 *   Reanimated. The flicker stretches the flame paths up from their base.
 */
// `createAnimatedComponent` wraps an SVG Path so `animatedProps` can drive it.
const AnimatedPath = Reanimated.createAnimatedComponent(Path);

interface CandleProps {
  /** Time left as 0..1. 1 is a full candle, 0 is burnt down. */
  progress: number;
  /** Flame is burning (a session is running). */
  lit: boolean;
  /** Session is paused: the flame stays, dimmed. */
  paused: boolean;
  /** Nothing started yet: shows the pulsing "tap me" ring above the wick. */
  idle: boolean;
  /** Show the smoke wisp (a finished session). */
  smoke: boolean;
  /** Session just ended: fade the flame out gently instead of cutting it. */
  dimming: boolean;
  mode: TimerMode;
  mood: MoodTheme;
  /** Changes whenever the phase swaps, so the candle replays its entrance. */
  swap: number;
}

/**
 * The candle wired to the running session. It reads the clock context itself,
 * so the once-a-second tick re-renders the candle and not the screen around it.
 */
export function SessionCandle(props: Omit<CandleProps, 'progress'>) {
  const { progress } = useWickglowClock();
  return <Candle {...props} progress={progress} />;
}

export function Candle({ progress, lit, paused, idle, smoke, dimming, mode, mood, swap }: CandleProps) {
  // `useAnimatedValue` is RN's Animated.Value kept stable across renders.
  const rise = useAnimatedValue(0); // entrance: slide up and fade in
  const hint = useAnimatedValue(0.35); // idle ring opacity
  const reduced = useReducedMotion();
  // A Reanimated shared value lives on the UI thread, so it can animate SVG props.
  const flameOpacity = useSharedValue(lit ? 1 : paused ? 0.55 : 0);
  // Vertical stretch of the flame, 1 at rest; loops around 0.94..1.06 while lit.
  const flick = useSharedValue(1);

  // Geometry is in the SVG's own 200x380 coordinate space, not screen pixels.
  // The wax top slides from y=100 (full) down to y=284 (empty); the candle
  // base sits at y=332, and the melt pool at the bottom widens as it shrinks.
  const clamped = Math.max(0, Math.min(1, progress));
  const topY = 284 - clamped * 184;
  const bodyH = Math.max(8, 332 - topY);
  const poolRx = 38 + (1 - clamped) * 32;
  // Breaks use a cooler wax color so you can tell focus from rest at a glance.
  const coolerWax = mode !== 'focus';
  const wax = coolerWax ? breakWax.body : mood.wax;
  const waxS = coolerWax ? breakWax.shadow : mood.waxS;
  const melt = coolerWax ? breakWax.melt : mood.melt;

  // Replay the entrance whenever the phase changes (focus -> break and back).
  // Under reduced motion the candle is simply in place.
  useEffect(() => {
    if (reduced) {
      rise.setValue(1);
      return;
    }
    rise.setValue(0);
    Animated.timing(rise, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduced, rise, swap]);

  // Fade the flame to its new level. Ending a session dims slowly (900ms) per
  // the "gentle end" rule in AGENTS.md; lighting up is quick (220ms).
  useEffect(() => {
    const target = dimming ? 0 : lit ? 1 : paused ? 0.55 : 0;
    flameOpacity.set(withTiming(target, {
      duration: dimming ? 900 : lit ? 220 : 700,
      easing: ReEasing.out(ReEasing.cubic),
    }));
  }, [dimming, flameOpacity, lit, paused]);

  // Both flame paths and the halo read the same opacity, so they fade
  // together. The paths are rebuilt from the flicker, scaled up from the base
  // of each flame (the wick top), so the tip moves and the base stays put.
  const outerBase = topY - 15;
  const innerBase = topY - 16;
  const outerProps = useAnimatedProps(() => {
    const s = flick.get();
    const b = outerBase;
    return {
      opacity: flameOpacity.get(),
      d: `M100 ${b} C88 ${b - 4 * s} 86 ${b - 20 * s} 100 ${b - 46 * s} C114 ${b - 20 * s} 112 ${b - 4 * s} 100 ${b}Z`,
    };
  });
  const innerProps = useAnimatedProps(() => {
    const s = flick.get();
    const b = innerBase;
    return {
      opacity: flameOpacity.get(),
      d: `M100 ${b} C95 ${b - 2 * s} 94 ${b - 10 * s} 100 ${b - 21 * s} C106 ${b - 10 * s} 105 ${b - 2 * s} 100 ${b}Z`,
    };
  });
  const glowStyle = useAnimatedStyle(() => ({ opacity: flameOpacity.get() }));

  // The halo is drawn outside the candle SVG so it is not clipped by its
  // viewBox. To sit on the flame it maps SVG units to pixels the way the SVG's
  // default "xMidYMid meet" does: one uniform scale, centred in the box.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  };
  const scale = Math.min(box.w / 200, box.h / 380);
  // Centred on the middle of the flame, so it follows the flame down. It
  // shrinks with the wax: 100 units across a full candle, 55 when burnt down.
  const glowR = (55 + clamped * 45) * scale;
  const glowX = (box.w - 200 * scale) / 2 + 100 * scale;
  const glowY = (box.h - 380 * scale) / 2 + (topY - 34) * scale;

  // Flicker loop, only while burning. Skipped when the system asks for reduced
  // motion. Returning the cleanup stops the loop when `lit` flips or on unmount.
  useEffect(() => {
    if (!lit || reduced) {
      cancelAnimation(flick);
      flick.set(1);
      return undefined;
    }
    flick.set(withRepeat(
      withSequence(
        withTiming(1.06, { duration: 420, easing: ReEasing.inOut(ReEasing.sin) }),
        withTiming(0.94, { duration: 480, easing: ReEasing.inOut(ReEasing.sin) }),
      ),
      -1,
    ));
    return () => cancelAnimation(flick);
  }, [flick, lit, reduced]);

  // Slow pulse on the ring above the wick while nothing has started.
  useEffect(() => {
    if (!idle || reduced) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hint, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(hint, { toValue: 0.25, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hint, idle, reduced]);

  return (
    <Animated.View onLayout={onLayout} style={[styles.wrap, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {/* Soft halo around the flame, fading to nothing at its edge. It moves
          down and shrinks as the candle burns. pointerEvents="none" so it never
          eats taps. */}
      {glowR > 0 ? (
        <Reanimated.View
          pointerEvents="none"
          style={[styles.glow, { left: glowX - glowR, top: glowY - glowR, width: glowR * 2, height: glowR * 2 }, glowStyle]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="candleHalo" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={mood.glow} stopOpacity={1} />
                <Stop offset="0.3" stopColor={mood.glow} stopOpacity={0.6} />
                <Stop offset="0.65" stopColor={mood.glow} stopOpacity={0.18} />
                <Stop offset="1" stopColor={mood.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#candleHalo)" />
          </Svg>
        </Reanimated.View>
      ) : null}
      <Svg width="100%" height="100%" viewBox="0 0 200 380">
        <Defs>
          {/* Gradients are declared once here and referenced as url(#id) below. */}
          <LinearGradient id="waxGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={waxS} />
            <Stop offset="0.35" stopColor={wax} />
            <Stop offset="0.7" stopColor={wax} />
            <Stop offset="1" stopColor={waxS} />
          </LinearGradient>
          <RadialGradient id="flameGrad" cx="50%" cy="75%" r="65%">
            <Stop offset="0" stopColor={mood.flame1} />
            <Stop offset="0.55" stopColor={mood.flame2} />
            <Stop offset="1" stopColor={mood.flame3} />
          </RadialGradient>
        </Defs>
        {/* Back to front: shadow, dish, dish highlight, melted pool. */}
        <Ellipse cx="100" cy="342" rx="98" ry="18" fill="#000" opacity={0.35} />
        <Ellipse cx="100" cy="337" rx="84" ry="14" fill={mood.dish} />
        <Ellipse cx="100" cy="333" rx="78" ry="10" fill={mood.dishHi} />
        <Ellipse cx="100" cy="334" rx={poolRx} ry="6" fill={wax} opacity={0.92} />
        {/* Wax body, its top rim and the molten dip, then two wax drips. */}
        <Rect x="60" y={topY} width="80" height={bodyH} rx="3" fill="url(#waxGrad)" />
        <Ellipse cx="100" cy={topY} rx="40" ry="7" fill={wax} />
        <Ellipse cx="100" cy={topY + 1} rx="27" ry="4" fill={melt} />
        <Path d={`M64 ${topY + 3} v22 q0 5 4 5 q4 0 4 -5 v-22z`} fill={wax} />
        <Path d={`M121 ${topY + 4} v13 q0 4 3.5 4 q3.5 0 3.5 -4 v-13z`} fill={wax} />
        {/* Wick. */}
        <Rect x="99" y={topY - 15} width="2" height="15" fill="#2b2125" />
        {/* Idle ring: invites the first tap. */}
        {idle ? <Circle cx="100" cy={topY - 28} r="10" fill="none" stroke={mood.flame2} strokeWidth={1.6} opacity={0.8} /> : null}
        {/* Outer flame, then the brighter inner core. Both fade with flameOpacity
            and flicker with flick; the static d is the flame at rest. */}
        <AnimatedPath animatedProps={outerProps} d={`M100 ${topY - 15} C88 ${topY - 19} 86 ${topY - 35} 100 ${topY - 61} C114 ${topY - 35} 112 ${topY - 19} 100 ${topY - 15}Z`} fill="url(#flameGrad)" />
        <AnimatedPath animatedProps={innerProps} d={`M100 ${topY - 16} C95 ${topY - 18} 94 ${topY - 26} 100 ${topY - 37} C106 ${topY - 26} 105 ${topY - 18} 100 ${topY - 16}Z`} fill={mood.flame1} />
        {smoke ? <Path d={`M100 ${topY - 21} c-6 -10 6 -18 0 -30 c-5 -9 6 -16 2 -26`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={3} strokeLinecap="round" /> : null}
      </Svg>
      {idle ? <Animated.View pointerEvents="none" style={[styles.hint, { borderColor: mood.flame2, opacity: hint }]} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
  },
  glow: {
    position: 'absolute',
  },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    top: '28%',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.6,
  },
});
