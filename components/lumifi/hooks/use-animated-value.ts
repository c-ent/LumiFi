import { useState } from 'react';
import { Animated } from 'react-native';

// react-native-web 0.21 ships `Animated` but not `useAnimatedValue`, which
// react-native added in 0.71. Importing it from 'react-native' therefore
// resolves to undefined on web and throws on the first render, so build the
// value here instead. Mirrors react-native's own implementation.
export function useAnimatedValue(initialValue: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initialValue));
  return value;
}
