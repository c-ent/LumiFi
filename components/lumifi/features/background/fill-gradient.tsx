import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Defs, Rect, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

/**
 * A gradient that fills its parent. React Native has no CSS `linear-gradient`,
 * so the gradient is an SVG rectangle sized to the parent's measured pixels.
 */

// One color stop: `offset` is "0".."1" along the gradient.
type StopColor = { offset: string; color: string };

// Percentage sizes on react-native-svg stay at the first measurement after a
// rotation, so the gradient is given the view's real pixel size instead.
export function useFillSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
  };
  return { size, onLayout };
}

// `x2`/`y2` set the gradient direction: default is top to bottom.
export function FillGradient({ id, stops, x2 = '0', y2 = '1' }: { id: string; stops: StopColor[]; x2?: string; y2?: string }) {
  const { size, onLayout } = useFillSize();
  return (
    <View collapsable={false} style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <SvgGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
              {stops.map((stop) => (
                <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
              ))}
            </SvgGradient>
          </Defs>
          <Rect width={size.width} height={size.height} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}
