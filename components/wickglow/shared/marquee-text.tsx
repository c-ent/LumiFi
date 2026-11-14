import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';

// Scroll speed in px per second, and how long the text rests at each end.
const SPEED = 28;
const REST_MS = 1600;

/**
 * One line of text that slowly scrolls when it is wider than its box: it rests
 * at the start, glides to show the end, rests, and glides back. Text that fits
 * stays still. Under reduced motion it does not move and shortens with an
 * ellipsis instead.
 *
 * `lineHeight` sets the box height: the text is laid out off to the side at
 * its natural width (so it can be measured), which gives the box no height of
 * its own.
 */
export function MarqueeText({ children, style, lineHeight }: { children: string; style?: StyleProp<TextStyle>; lineHeight: number }) {
  const reduced = useReducedMotion();
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const overflow = Math.max(0, Math.ceil(textWidth - boxWidth));

  useEffect(() => {
    offset.setValue(0);
    if (reduced || overflow <= 0) return undefined;
    const glide = Math.max(600, (overflow / SPEED) * 1000);
    const native = Platform.OS !== 'web';
    const ease = Easing.inOut(Easing.quad);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(REST_MS),
        Animated.timing(offset, { toValue: -overflow, duration: glide, easing: ease, useNativeDriver: native }),
        Animated.delay(REST_MS),
        Animated.timing(offset, { toValue: 0, duration: glide, easing: ease, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [children, offset, overflow, reduced]);

  if (reduced) {
    return <Text style={[style, { lineHeight }]} numberOfLines={1}>{children}</Text>;
  }

  return (
    <View
      style={[s.box, { height: lineHeight }]}
      onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
    >
      {/* A wide track so the text is never squeezed and reports its full width. */}
      <View style={s.track} pointerEvents="none">
        <Animated.View style={{ transform: [{ translateX: offset }] }}>
          <Text
            style={[style, { lineHeight }]}
            numberOfLines={1}
            onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
          >
            {children}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4000,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
