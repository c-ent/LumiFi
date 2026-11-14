import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/src/theme/tokens';
import * as Lucide from './lucide';

// All app icons. Lucide (stroke 1.8, see AGENTS.md), from `lucide-react-native`
// on Android and iOS and `lucide-react` on web (`lucide.ts` / `lucide.web.ts`).
// The names and default sizes here are what the app uses, so a screen never
// imports Lucide directly. The play controls are filled; the Google mark keeps
// its own colours. The animated mixer and equalizer icons live in their own
// files and are drawn to line up with these.
interface IconProps {
  size?: number;
  color?: string;
}

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>;

const STROKE = 1.8;

/** A stroked Lucide icon with the app's stroke width and a default size. */
function stroked(Icon: LucideIcon, defaultSize = 19) {
  function AppIcon({ size = defaultSize, color = colors.textPrimary }: IconProps) {
    return <Icon size={size} color={color} strokeWidth={STROKE} />;
  }
  return AppIcon;
}

/** A Lucide icon filled with its colour, for the play controls. */
function filled(Icon: LucideIcon, defaultSize: number, defaultColor: string) {
  function AppIcon({ size = defaultSize, color = defaultColor }: IconProps) {
    return <Icon size={size} color={color} fill={color} strokeWidth={STROKE} />;
  }
  return AppIcon;
}

export const FlameIcon = stroked(Lucide.Flame);
export const ClockIcon = stroked(Lucide.Clock);
export const MusicIcon = stroked(Lucide.Music);
export const MixerIcon = stroked(Lucide.SlidersVertical);
export const SceneIcon = stroked(Lucide.Image);
export const TaskIcon = stroked(Lucide.SquareCheckBig);
export const TargetIcon = stroked(Lucide.Target);
export const BarsIcon = stroked(Lucide.ChartNoAxesColumn);
export const StarIcon = stroked(Lucide.Star);
export const TimerIcon = stroked(Lucide.Timer);
export const GearIcon = stroked(Lucide.Settings);
export const FullscreenIcon = stroked(Lucide.Maximize);
export const ResetIcon = stroked(Lucide.RotateCcw);
export const SkipIcon = stroked(Lucide.SkipForward);
export const VolumeIcon = stroked(Lucide.Volume1, 18);
export const UploadIcon = stroked(Lucide.Upload, 18);
export const DownloadIcon = stroked(Lucide.Download, 18);
export const TrashIcon = stroked(Lucide.Trash2);
export const CloseIcon = stroked(Lucide.X, 15);
export const RepeatIcon = stroked(Lucide.Repeat, 18);
export const CalendarIcon = stroked(Lucide.Calendar, 16);
export const PencilIcon = stroked(Lucide.PenLine, 15);
export const ChevronIcon = stroked(Lucide.ChevronRight, 12);
export const UserIcon = stroked(Lucide.User, 18);

export const PlayIcon = filled(Lucide.Play, 18, colors.textInverse);
export const PauseIcon = filled(Lucide.Pause, 18, colors.textInverse);
export const PrevIcon = filled(Lucide.SkipBack, 16, colors.textPrimary);
export const NextIcon = filled(Lucide.SkipForward, 16, colors.textPrimary);

/** Google's own mark, in its colours (brand rules), so not from Lucide. */
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
