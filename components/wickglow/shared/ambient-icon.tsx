import React, { useEffect, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { colors } from '@/src/theme/tokens';

// The mixer icon's three columns, in its 24-unit grid: x position, where the
// knob rests (as on the still MixerIcon), where it drifts to, and how long one
// drift there and back takes. Slower than the music bars and out of step, so
// it reads as "on" rather than "playing".
const COLUMNS = [
  { x: 4, rest: 14, to: 9, ms: 3400 },
  { x: 12, rest: 8, to: 13, ms: 4100 },
  { x: 20, rest: 16, to: 11, ms: 3700 },
];
// Gap left in the track on each side of a knob, and the knob's half width.
const GAP = 2;
const HALF_KNOB = 3;
// About 30 redraws a second is plenty for a drift this slow.
const FRAME_MS = 33;

/**
 * The mixer icon with its knobs slowly sliding, shown on the desktop Ambient
 * mixer dock button while any ambient sound is turned up. Drawn as SVG with
 * the same stroke as the other icons (so it stays crisp while moving): tracks
 * in `color`, knobs in `accent`. Under reduced motion the knobs stand still at
 * their usual spots, keeping only the tint.
 */
export function AmbientIcon({ size = 19, color = colors.textPrimary, accent = colors.textPrimary }: { size?: number; color?: string; accent?: string }) {
  const reduced = useReducedMotion();
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (reduced) return undefined;
    let frame = 0;
    let last = 0;
    const start = Date.now();
    const tick = () => {
      const now = Date.now();
      if (now - last >= FRAME_MS) {
        last = now;
        setTime(now - start);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  // Each knob eases between rest and `to` along a cosine, so it slows at both
  // ends. Under reduced motion the clock reads zero: every knob at rest.
  const clock = reduced ? 0 : time;
  const knobs = COLUMNS.map(({ x, rest, to, ms }) => {
    const phase = (1 - Math.cos((2 * Math.PI * clock) / ms)) / 2;
    return { x, y: rest + (to - rest) * phase };
  });
  const tracks = knobs.map(({ x, y }) => `M${x} 21V${(y + GAP).toFixed(2)}M${x} ${(y - GAP).toFixed(2)}V3`).join('');
  const bars = knobs.map(({ x, y }) => `M${x - HALF_KNOB} ${y.toFixed(2)}h${HALF_KNOB * 2}`).join('');

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d={tracks} stroke={color} />
      <Path d={bars} stroke={accent} />
    </Svg>
  );
}
