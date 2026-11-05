import { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// The mark in assets/images/logo.svg. Colors stay on the artwork so a mood
// cannot repaint the logo.
export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bg = `${id}bg`;
  const orb = `${id}orb`;

  return (
    <Svg width={size} height={size} viewBox="0 0 128 128">
      <Defs>
        <LinearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2e161b" />
          <Stop offset="1" stopColor="#130b0e" />
        </LinearGradient>
        <LinearGradient id={orb} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffb985" />
          <Stop offset="1" stopColor="#f26f3a" />
        </LinearGradient>
      </Defs>
      <Rect width={128} height={128} rx={30} fill={`url(#${bg})`} />
      <Circle cx={64} cy={64} r={50} fill="#f68b4d" opacity={0.1} />
      <Circle cx={64} cy={64} r={36} fill="#f68b4d" opacity={0.22} />
      <Circle cx={64} cy={64} r={22} fill={`url(#${orb})`} />
    </Svg>
  );
}
