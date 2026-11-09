import { useState } from 'react';
import { Animated } from 'react-native';

// Returns an `Animated.Value` that is created once and kept for the component's
// life, so animations don't restart on every render (like useRef for animations).
//
// react-native-web 0.21 ships `Animated` but not `useAnimatedValue`, which
// react-native added in 0.71. Importing it from 'react-native' therefore
// resolves to undefined on web and throws on the first render, so build the
// value here instead. Mirrors react-native's own implementation.
export function useAnimatedValue(initialValue: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initialValue));
  return value;
}
