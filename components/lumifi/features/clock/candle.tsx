import { breakWax } from '@/src/theme/tokens';
import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useAnimatedValue } from '@/components/lumifi/hooks/use-animated-value';
import Reanimated, { Easing as ReEasing, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
import { MoodTheme, TimerMode } from '@/components/lumifi/theme';
import { useReducedMotion } from '@/components/lumifi/hooks/use-reduced-motion';

const AnimatedPath = Reanimated.createAnimatedComponent(Path);

interface CandleProps {
  progress: number;
  lit: boolean;
  paused: boolean;
  idle: boolean;
  smoke: boolean;
  dimming: boolean;
  mode: TimerMode;
  mood: MoodTheme;
  swap: number;
}

export function Candle({ progress, lit, paused, idle, smoke, dimming, mode, mood, swap }: CandleProps) {
  const rise = useAnimatedValue(0);
  const flick = useAnimatedValue(0);
  const hint = useAnimatedValue(0.35);
  const reduced = useReducedMotion();
  const flameOpacity = useSharedValue(lit ? 1 : paused ? 0.55 : 0);

  const clamped = Math.max(0, Math.min(1, progress));
  const topY = 284 - clamped * 184;
  const bodyH = Math.max(8, 332 - topY);
  const poolRx = 38 + (1 - clamped) * 32;
  const coolerWax = mode !== 'focus';
  const wax = coolerWax ? breakWax.body : mood.wax;
  const waxS = coolerWax ? breakWax.shadow : mood.waxS;
  const melt = coolerWax ? breakWax.melt : mood.melt;

  useEffect(() => {
    rise.setValue(0);
    Animated.timing(rise, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [rise, swap]);

  useEffect(() => {
    const target = dimming ? 0 : lit ? 1 : paused ? 0.55 : 0;
    flameOpacity.set(withTiming(target, {
      duration: dimming ? 900 : lit ? 220 : 700,
      easing: ReEasing.out(ReEasing.cubic),
    }));
  }, [dimming, flameOpacity, lit, paused]);

  const flameProps = useAnimatedProps(() => ({ opacity: flameOpacity.get() }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: flameOpacity.get() * 0.85 }));

  useEffect(() => {
    if (!lit || reduced) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flick, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 0, duration: 480, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flick, lit, reduced]);

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

  const flameScale = flick.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });

  return (
    <Animated.View style={[styles.wrap, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      <Reanimated.View pointerEvents="none" style={[styles.glow, { backgroundColor: mood.glow }, glowStyle]} />
      <Svg width="100%" height="100%" viewBox="0 0 200 380">
        <Defs>
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
        <Ellipse cx="100" cy="342" rx="98" ry="18" fill="#000" opacity={0.35} />
        <Ellipse cx="100" cy="337" rx="84" ry="14" fill={mood.dish} />
        <Ellipse cx="100" cy="333" rx="78" ry="10" fill={mood.dishHi} />
        <Ellipse cx="100" cy="334" rx={poolRx} ry="6" fill={wax} opacity={0.92} />
        <Rect x="60" y={topY} width="80" height={bodyH} rx="3" fill="url(#waxGrad)" />
        <Ellipse cx="100" cy={topY} rx="40" ry="7" fill={wax} />
        <Ellipse cx="100" cy={topY + 1} rx="27" ry="4" fill={melt} />
        <Path d={`M64 ${topY + 3} v22 q0 5 4 5 q4 0 4 -5 v-22z`} fill={wax} />
        <Path d={`M121 ${topY + 4} v13 q0 4 3.5 4 q3.5 0 3.5 -4 v-13z`} fill={wax} />
        <Rect x="99" y={topY - 15} width="2" height="15" fill="#2b2125" />
        {idle ? <Circle cx="100" cy={topY - 28} r="10" fill="none" stroke={mood.flame2} strokeWidth={1.6} opacity={0.8} /> : null}
        <AnimatedPath animatedProps={flameProps} d={`M100 ${topY - 15} C88 ${topY - 19} 86 ${topY - 35} 100 ${topY - 61} C114 ${topY - 35} 112 ${topY - 19} 100 ${topY - 15}Z`} fill="url(#flameGrad)" />
        <AnimatedPath animatedProps={flameProps} d={`M100 ${topY - 16} C95 ${topY - 18} 94 ${topY - 26} 100 ${topY - 37} C106 ${topY - 26} 105 ${topY - 18} 100 ${topY - 16}Z`} fill={mood.flame1} />
        {smoke ? <Path d={`M100 ${topY - 21} c-6 -10 6 -18 0 -30 c-5 -9 6 -16 2 -26`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={3} strokeLinecap="round" /> : null}
      </Svg>
      {lit ? (
        <Animated.View pointerEvents="none" style={[styles.flicker, { transform: [{ scaleY: flameScale }] }]} />
      ) : null}
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
    width: 260,
    height: 260,
    borderRadius: 130,
    alignSelf: 'center',
    top: '8%',
  },
  flicker: {
    position: 'absolute',
    width: 1,
    height: 1,
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
