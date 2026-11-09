import { colors, fade, fonts, radius, rounded } from '@/src/theme/tokens';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TaskIcon } from '@/components/lumifi/shared/icons';

// Which of the three looks to show:
// - 'break': plain muted reminder text (no chip, nothing to pick during a break)
// - 'empty': dashed chip, "Pick a task to focus on"
// - 'task': solid chip with the focused task's title
export type FocusLineMode = 'break' | 'empty' | 'task';

const ICON_SIZE = 15;

/**
 * The line under the timer. In focus mode it is a pill that shows which task
 * the session counts toward, and (when `onPress` is given) opens the task list.
 * The tablet layout passes no `onPress` because its task list is already
 * visible beside the timer, so there it is just a label.
 *
 * `zen` fades it out with the rest of the controls while you focus.
 */
export function FocusLine({
  mode,
  text,
  accent,
  onPress,
  zen = false,
}: {
  mode: FocusLineMode;
  text: string;
  accent: string;
  onPress?: () => void;
  zen?: boolean;
}) {
  const opacity = zen ? 0 : 1;

  if (mode === 'break') {
    return <Text style={[styles.break, { opacity }]}>{text}</Text>;
  }

  const body = (
    <>
      <TaskIcon size={ICON_SIZE} color={accent} />
      <Text style={[styles.text, mode === 'task' ? styles.textOn : null]} numberOfLines={1}>{text}</Text>
    </>
  );
  // `fade(color, a)` = the accent at alpha `a`. The "task" state is a bit
  // stronger than "empty" so a chosen task reads as filled-in.
  const chip = [styles.chip, mode === 'empty' ? styles.chipEmpty : null, { borderColor: fade(accent, mode === 'task' ? 0.4 : 0.5), backgroundColor: fade(accent, mode === 'task' ? 0.1 : 0.06) }];

  if (!onPress) {
    return <View style={[chip, { opacity }]}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint="Opens the task list"
      onPress={onPress}
      // While the zen fade hides the chip it must not take taps or be read out.
      disabled={zen}
      pointerEvents={zen ? 'none' : 'auto'}
      accessibilityElementsHidden={zen}
      importantForAccessibility={zen ? 'no-hide-descendants' : 'auto'}
      // Pressable accepts a function for `style` so it can react to the pressed state.
      style={({ pressed }) => [chip, { opacity: pressed ? 0.7 : opacity }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  break: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    maxWidth: '100%',
    minHeight: 34,
    borderWidth: 1,
    ...rounded(radius.pill),
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipEmpty: {
    borderStyle: 'dashed',
  },
  text: {
    flexShrink: 1,
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  textOn: {
    color: colors.textPrimary,
  },
});
