import React, { useEffect } from 'react';
import Reanimated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { colors } from '@/src/theme/tokens';

// `createAnimatedComponent` wraps an SVG Path so `animatedProps` can drive its `d`.
const AnimatedPath = Reanimated.createAnimatedComponent(Path);

// The mixer icon's three columns, in its 24-unit grid: x position, where the
// knob rests (as on the still MixerIcon), where it drifts to, and how long one
// drift there and back takes (halved 2026-11-14, owner asked for faster). Out
// of step, so it reads as "on" rather than "playing".
// Columns and knobs match Lucide's sliders-vertical (MixerIcon, 2026-11-14).
const COLUMNS = [
  { x: 5, rest: 14, to: 9, ms: 1700 },
  { x: 12, rest: 8, to: 13, ms: 2050 },
  { x: 19, rest: 16, to: 11, ms: 1850 },
];
// One loop of the shared clock: a whole number of every column's drift
// (the least common multiple of 1700, 2050 and 1850 ms, about 43 minutes), so
// the clock wrapping to 0 does not make a knob jump.
const CYCLE_MS = 2578900;
// Gap left in the track on each side of a knob, and the knob's half width.
const GAP = 2;
const HALF_KNOB = 2;

/** Each knob's height at `clock` ms: it eases between rest and `to` along a cosine, slowing at both ends. */
function knobY(column: (typeof COLUMNS)[number], clock: number): number {
  'worklet';
  const phase = (1 - Math.cos((2 * Math.PI * clock) / column.ms)) / 2;
  return column.rest + (column.to - column.rest) * phase;
}

/**
 * The mixer icon with its knobs slowly sliding, shown on the desktop Ambient
 * mixer dock button while any ambient sound is turned up. Drawn as SVG with
 * the same stroke as the other icons (so it stays crisp while moving): tracks
 * in `color`, knobs in `accent`. The paths are rebuilt on the UI thread
 * (Reanimated), not through React renders. Under reduced motion, or while
 * `paused` (the dock is faded out in zen), the knobs stand still at their
 * usual spots.
 */
export function AmbientIcon({
  size = 19,
  color = colors.textPrimary,
  accent = colors.textPrimary,
  paused = false,
}: {
  size?: number;
  color?: string;
  accent?: string;
  paused?: boolean;
}) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(0);
  const still = reduced || paused;

  useEffect(() => {
    cancelAnimation(clock);
    clock.set(0);
    if (still) return undefined;
    clock.set(withRepeat(withTiming(CYCLE_MS, { duration: CYCLE_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [clock, still]);

  const trackProps = useAnimatedProps(() => {
    const t = clock.get();
    let d = '';
    for (const column of COLUMNS) {
      const y = knobY(column, t);
      d += `M${column.x} 21V${(y + GAP).toFixed(2)}M${column.x} ${(y - GAP).toFixed(2)}V3`;
    }
    return { d };
  });
  const knobProps = useAnimatedProps(() => {
    const t = clock.get();
    let d = '';
    for (const column of COLUMNS) {
      d += `M${column.x - HALF_KNOB} ${knobY(column, t).toFixed(2)}h${HALF_KNOB * 2}`;
    }
    return { d };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <AnimatedPath animatedProps={trackProps} stroke={color} />
      <AnimatedPath animatedProps={knobProps} stroke={accent} />
    </Svg>
  );
}
