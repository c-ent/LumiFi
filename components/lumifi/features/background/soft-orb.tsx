import React from 'react';
import { Animated, Platform, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * A soft glowing ball of color used in the scene background.
 *
 * Why two code paths: on web we can use the CSS `filter: blur()`. React Native
 * on Android/iOS has no equivalent that is cheap and reliable, so there the
 * blur is faked with an SVG radial gradient that fades out smoothly.
 * `glowStops` and `orbFrame` are pure helpers so they can be unit tested
 * (see soft-orb.test.ts).
 */

// Same radius as the web `filter: blur(70px)`. The glow is drawn out to two
// standard deviations, which is where that blur has faded out.
export const ORB_BLUR = 70;
export const ORB_PAD = ORB_BLUR * 2;

// Where the orb sits, as position offsets (px, or % for left/top) from the
// scene edges. Same idea as CSS absolute positioning.
export type OrbPlace = {
  left?: number | `${number}%`;
  top?: number | `${number}%`;
  right?: number;
  bottom?: number;
};

// Animated x/y offsets from the parent's drift loop.
type Drift = {
  x: Animated.AnimatedInterpolation<number>;
  y: Animated.AnimatedInterpolation<number>;
};

type GlowStop = { offset: number; opacity: number };

// A blurred disc stays solid through the middle and only falls off near its
// edge. Offsets are fractions of the expanded box, whose edge is the blur tail.
export function glowStops(size: number): GlowStop[] {
  const radius = size / 2;
  const expanded = radius + ORB_PAD;
  const raw = [
    { distance: 0, opacity: 1 },
    { distance: Math.max(0, radius - ORB_BLUR), opacity: 0.92 },
    { distance: radius, opacity: 0.5 },
    { distance: Math.min(expanded, radius + ORB_BLUR * 0.65), opacity: 0.16 },
    { distance: expanded, opacity: 0 },
  ];
  const stops: GlowStop[] = [];
  let last = -1;
  for (const point of raw) {
    const offset = Math.round((point.distance / expanded) * 1000) / 1000;
    if (offset <= last) continue;
    last = offset;
    stops.push({ offset, opacity: point.opacity });
  }
  if (stops[stops.length - 1]?.offset !== 1) stops.push({ offset: 1, opacity: 0 });
  return stops;
}

// Growing the box keeps its center on the original disc. A percentage edge
// anchors the near side, so that orb shifts back by the padding instead.
export function orbFrame(size: number, place: OrbPlace) {
  const box = size + ORB_PAD * 2;
  let shiftX = 0;
  let shiftY = 0;
  const style: ViewStyle = { width: box, height: box };
  if (typeof place.left === 'number') Object.assign(style, { left: place.left - ORB_PAD });
  else if (place.left != null) {
    Object.assign(style, { left: place.left });
    shiftX = -ORB_PAD;
  }
  if (typeof place.top === 'number') Object.assign(style, { top: place.top - ORB_PAD });
  else if (place.top != null) {
    Object.assign(style, { top: place.top });
    shiftY = -ORB_PAD;
  }
  if (place.right != null) Object.assign(style, { right: place.right - ORB_PAD });
  if (place.bottom != null) Object.assign(style, { bottom: place.bottom - ORB_PAD });
  return { style, shiftX, shiftY };
}

/** `size` is the disc diameter in px; `opacity` is the overall strength. */
export function SceneOrb({
  color,
  size,
  opacity,
  place,
  drift,
}: {
  color: string;
  size: number;
  opacity: number;
  place: OrbPlace;
  drift: Drift;
}) {
  // Web: a plain colored circle with a real CSS blur.
  if (Platform.OS === 'web') {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.base,
          place,
          {
            width: size,
            height: size,
            opacity,
            backgroundColor: color,
            borderRadius: size / 2,
            filter: `blur(${ORB_BLUR}px)`,
          },
          { transform: [{ translateX: drift.x }, { translateY: drift.y }] },
        ]}
      />
    );
  }

  // Native: an oversized SVG circle filled with a gradient that fades to
  // transparent. The unique id keeps orbs from sharing one gradient definition.
  const frame = orbFrame(size, place);
  const stops = glowStops(size);
  const radius = (size + ORB_PAD * 2) / 2;
  const gradientId = `orb-${size}-${color.replace('#', '')}`;
  return (
    <Animated.View
      pointerEvents="none"
      collapsable={false}
      style={[
        styles.base,
        frame.style,
        { opacity },
        {
          transform: [
            { translateX: drift.x },
            { translateY: drift.y },
            { translateX: frame.shiftX },
            { translateY: frame.shiftY },
          ],
        },
      ]}
    >
      <Svg width={radius * 2} height={radius * 2}>
        <Defs>
          <RadialGradient id={gradientId} cx={radius} cy={radius} r={radius} gradientUnits="userSpaceOnUse">
            {stops.map((stop) => (
              <Stop key={stop.offset} offset={stop.offset} stopColor={color} stopOpacity={stop.opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={radius} cy={radius} r={radius} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
  },
});
