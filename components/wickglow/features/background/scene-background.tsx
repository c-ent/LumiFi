import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Rect, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { SceneOrb } from '@/components/wickglow/features/background/soft-orb';
import { useFillSize } from '@/components/wickglow/features/background/fill-gradient';
import { useAnimatedValue } from '@/components/wickglow/hooks/use-animated-value';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { useWickglow } from '@/components/wickglow/logic';

const CYCLE_MS = 7000;
// One breath is (1 - cos) / 2 over the phase: 0 -> 1 -> 0, eased at both ends.
const PHASE_IN = Array.from({ length: 33 }, (_, i) => i / 32);
const PHASE_OUT = PHASE_IN.map((p) => (1 - Math.cos(p * 2 * Math.PI)) / 2);

/**
 * The full-screen backdrop of the desktop scene: a diagonal gradient, three
 * blurred orbs that drift slowly, a soft pulsing "core" and a dark shade on
 * top so the UI stays readable. Colors come from the selected scene theme.
 *
 * It is purely decorative, so the whole thing ignores touches.
 */
export function SceneBackground() {
  const { sceneTheme } = useWickglow();
  // Three drift loops with different lengths so the orbs never move in sync.
  const driftA = useLoop(38000);
  const driftB = useLoop(46000);
  const driftC = useLoop(30000);
  // The core's breathing moves whenever the timer runs (focus or a break).
  // `phase` is the position in one breath (0..1, linear); `breathe` is the
  // eased size derived from it, so pausing can store and resume a plain phase.
  const phase = useAnimatedValue(0);
  const breathe = phase.interpolate({ inputRange: PHASE_IN, outputRange: PHASE_OUT });
  const reduced = useReducedMotion();
  const { running } = useWickglow();
  // Measured pixel size, used to draw the SVG gradient (see fill-gradient.tsx).
  const { size, onLayout } = useFillSize();

  // Breathing while any session runs (focus or break): the scene "pulses" with you.
  useEffect(() => {
    // The core moves whenever `running` is true, in any mode including breaks.
    // Paused or idle: do nothing, so the previous run's cleanup leaves the core frozen
    // at its current size instead of snapping back. Resume continues from there.
    if (!running) return undefined;
    if (reduced) {
      // Stop mid-breathe so the core stays lit without pulsing.
      phase.setValue(0.25);
      return undefined;
    }
    // Finish the current cycle from wherever the phase was left, then loop whole
    // cycles. The first leg is shortened by how far along it already is.
    let cancelled = false;
    let current: Animated.CompositeAnimation | null = null;
    const runCycle = (from: number) => {
      phase.setValue(from);
      current = Animated.timing(phase, {
        toValue: 1,
        duration: CYCLE_MS * (1 - from),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      current.start(({ finished }) => {
        if (finished && !cancelled) runCycle(0);
      });
    };
    // Read the value as of now (a native-driven value can lag behind in JS).
    phase.stopAnimation((value) => {
      if (!cancelled) runCycle(value >= 1 ? 0 : value);
    });
    return () => {
      cancelled = true;
      // stopAnimation syncs the native value back, so the next resume starts here.
      phase.stopAnimation();
    };
  }, [phase, reduced, running]);

  return (
    // collapsable={false}: on Android, RN may flatten a View that only lays out
    // children, which would remove the native view `onLayout` needs.
    <View collapsable={false} style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {/* Wait for a real size before drawing, otherwise the gradient is 0x0. */}
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <SvgGradient id="scene" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor={sceneTheme.b1} />
              <Stop offset="0.52" stopColor={sceneTheme.b2} />
              <Stop offset="1" stopColor={sceneTheme.b3} />
            </SvgGradient>
          </Defs>
          <Rect width={size.width} height={size.height} fill="url(#scene)" />
        </Svg>
      ) : null}
      <SceneOrb color={sceneTheme.o1} size={460} opacity={0.45} place={{ left: -120, top: -80 }} drift={driftA} />
      <SceneOrb color={sceneTheme.o2} size={400} opacity={0.35} place={{ right: -120, bottom: -80 }} drift={driftB} />
      <SceneOrb color={sceneTheme.o3} size={260} opacity={0.22} place={{ left: '52%', top: '8%' }} drift={driftC} />
      <Animated.View
        style={[
          styles.core,
          {
            opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
            transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }],
          },
        ]}
      />
      <View style={styles.shade} />
    </View>
  );
}

// A back-and-forth loop (0 -> 1 -> 0) turned into an x/y offset in px.
// Each orb gets its own duration, so the drift looks organic.
function useLoop(duration: number) {
  const value = useAnimatedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, reduced, value]);
  return {
    x: value.interpolate({ inputRange: [0, 1], outputRange: [0, 70] }),
    y: value.interpolate({ inputRange: [0, 1], outputRange: [0, 48] }),
  };
}

const styles = StyleSheet.create({
  core: {
    position: 'absolute',
    left: '50%',
    top: '46%',
    width: 360,
    height: 360,
    marginLeft: -180,
    marginTop: -180,
    borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  shade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5,3,15,0.28)',
  },
});
