import { colors } from '@/src/theme/tokens';
import { useLumiFi } from '../logic';

export interface Tone {
  accent: string;
  ink: string;
  solid: string;
}

// Phone panels tint from the mood, desktop and tablet panels from the scene.
// Lives here rather than in `theme.ts` because it needs the provider, and
// `logic.tsx` imports `theme.ts`, so putting it there would be a cycle.
export function useTone(mobile: boolean): Tone {
  const { sceneTheme, moodTheme } = useLumiFi();
  if (mobile) return { accent: moodTheme.accent, ink: colors.textInverse, solid: moodTheme.accent };
  return { accent: sceneTheme.accent, ink: colors.textInverse, solid: colors.textPrimary };
}
