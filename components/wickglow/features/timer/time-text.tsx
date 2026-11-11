import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useWickglowClock } from '@/components/wickglow/logic';
import { formatTime } from '@/components/wickglow/theme';

/**
 * The big "MM:SS". It reads the clock context itself, so the once-a-second tick
 * re-renders this one Text and not the screen around it. The screen passes the
 * style, since each layout sizes the digits differently.
 */
export function TimeText({ style }: { style?: StyleProp<TextStyle> }) {
  const { remaining } = useWickglowClock();
  return <Text style={style}>{formatTime(remaining)}</Text>;
}
