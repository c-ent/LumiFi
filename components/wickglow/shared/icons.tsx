import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/src/theme/tokens';

// All app icons, drawn as inline SVG paths (hand-drawn in the Lucide style) on
// a 24x24 grid. `lucide-react-native` isn't installed yet; see the Icons row in
// AGENTS.md for the plan to swap these. Every icon takes `size` and `color`.
interface IconProps {
  size?: number;
  color?: string;
}

// Shared wrapper giving every icon the same stroke style (1.8 wide, round caps).
function Stroke({ size = 19, color = colors.textPrimary, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Stroke>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </Stroke>
  );
}

export function MusicIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M9 18V5l12-2v13" />
      <Circle cx="6" cy="18" r="3" />
      <Circle cx="18" cy="16" r="3" />
    </Stroke>
  );
}

export function MixerIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </Stroke>
  );
}

export function SceneIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Rect x="3" y="3" width="18" height="18" rx="3" />
      <Circle cx="9" cy="9" r="2" />
      <Path d="M21 15l-5-5L5 21" />
    </Stroke>
  );
}

export function TaskIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M9 11l3 3L22 4" />
      <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Stroke>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Circle cx="12" cy="12" r="4.5" />
      <Circle cx="12" cy="12" r="1" />
    </Stroke>
  );
}

export function BarsIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M18 20V10M12 20V4M6 20v-6" />
    </Stroke>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z" />
    </Stroke>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Circle cx="12" cy="13" r="8" />
      <Path d="M12 9v4l2 2M9 2h6" />
    </Stroke>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </Stroke>
  );
}

export function FullscreenIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </Stroke>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <Path d="M3 3v5h5" />
    </Stroke>
  );
}

export function SkipIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M5 4l10 8-10 8z" />
      <Path d="M19 5v14" />
    </Stroke>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <Stroke {...props} size={props.size ?? 18}>
      <Path d="M4 9v6h4l5 4V5L8 9z" />
      <Path d="M16.5 8.5a5 5 0 0 1 0 7" />
    </Stroke>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Stroke {...props} size={props.size ?? 18}>
      <Path d="M12 16V4" />
      <Path d="M7 9l5-5 5 5" />
      <Path d="M4 20h16" />
    </Stroke>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Stroke {...props} size={props.size ?? 18}>
      <Path d="M12 4v12" />
      <Path d="M7 11l5 5 5-5" />
      <Path d="M4 20h16" />
    </Stroke>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M3 6h18" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Path d="M10 11v6M14 11v6" />
    </Stroke>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Stroke {...props} size={props.size ?? 15}>
      <Path d="M6 6l12 12M18 6L6 18" />
    </Stroke>
  );
}

export function PlayIcon({ size = 18, color = colors.textInverse }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M5 3l12 7-12 7z" fill={color} />
    </Svg>
  );
}

export function PauseIcon({ size = 18, color = colors.textInverse }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M5 3h4v14H5zM11 3h4v14h-4z" fill={color} />
    </Svg>
  );
}

export function PrevIcon({ size = 16, color = colors.textPrimary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M3 2h2v12H3zM14 2v12L6 8z" fill={color} />
    </Svg>
  );
}

export function NextIcon({ size = 16, color = colors.textPrimary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M11 2h2v12h-2zM2 2l8 6-8 6z" fill={color} />
    </Svg>
  );
}

export function RepeatIcon(props: IconProps) {
  return (
    <Stroke {...props} size={props.size ?? 18}>
      <Path d="M17 2l4 4-4 4" />
      <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <Path d="M7 22l-4-4 4-4" />
      <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Stroke>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Stroke {...props} size={props.size ?? 16}>
      <Path d="M8 3v3M16 3v3" />
      <Path d="M4 8h16" />
      <Path d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </Stroke>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Stroke {...props} size={props.size ?? 15}>
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Stroke>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <Stroke {...props} size={props.size ?? 12}>
      <Path d="M9 6l6 6-6 6" />
    </Stroke>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Stroke {...props} size={props.size ?? 18}>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    </Stroke>
  );
}

export function GoogleIcon({ size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="-3 0 262 262">
      <Path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4" />
      <Path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853" />
      <Path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05" />
      <Path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335" />
    </Svg>
  );
}
