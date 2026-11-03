import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Rect, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { SceneOrb } from '@/components/lumifi/features/background/soft-orb';
import { useFillSize } from '@/components/lumifi/features/background/fill-gradient';
import { useAnimatedValue } from '@/components/lumifi/hooks/use-animated-value';
import { useReducedMotion } from '@/components/lumifi/hooks/use-reduced-motion';
import { useLumiFi } from '@/components/lumifi/logic';

export function SceneBackground() {
  const { sceneTheme } = useLumiFi();
  const driftA = useLoop(38000);
  const driftB = useLoop(46000);
  const driftC = useLoop(30000);
  const breathe = useAnimatedValue(0);
  const reduced = useReducedMotion();
  const { running, mode } = useLumiFi();
  const { size, onLayout } = useFillSize();

  useEffect(() => {
    if (!(running && mode === 'focus')) {
      breathe.setValue(0);
      return undefined;
    }
    if (reduced) {
      // Stop mid-breathe so the core stays lit without pulsing.
      breathe.setValue(0.5);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, mode, reduced, running]);

  return (
    <View collapsable={false} style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
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
