import { colors } from '@/src/theme/tokens';
import { useWickglow } from '../logic';

// The three colors a button/panel needs to match the current layout's theme.
export interface Tone {
  /** Highlight color: active icons, progress bars, outlines. */
  accent: string;
  /** Text/icon color to use ON TOP of a filled accent background. */
  ink: string;
  /** Fill for primary buttons. */
  solid: string;
}

// Phone panels tint from the mood, desktop and tablet panels from the scene.
// Lives here rather than in `theme.ts` because it needs the provider, and
// `logic.tsx` imports `theme.ts`, so putting it there would be a cycle.
export function useTone(mobile: boolean): Tone {
  const { sceneTheme, moodTheme } = useWickglow();
  if (mobile) return { accent: moodTheme.accent, ink: colors.textInverse, solid: moodTheme.accent };
  return { accent: sceneTheme.accent, ink: colors.textInverse, solid: colors.textPrimary };
}
