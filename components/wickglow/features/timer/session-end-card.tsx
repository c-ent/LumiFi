import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { glassPanel } from '@/components/wickglow/shared/panel-styles';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SessionEndCardProps {
  title: string;
  /** The one encouraging sentence (a random line from src/core/session-end.ts). */
  line: string;
  /** Text of the main button, e.g. "Start break". */
  actionLabel: string;
  accent: string;
  /** False when the next session already auto-started: then there is nothing to choose. */
  showLater: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

/**
 * The gentle "Focus finished" card shown when a session completes. It replaces
 * a harsh alarm: a short message and two quiet buttons (start the next phase or
 * "Later"). Tapping anywhere outside the card dismisses it.
 */
export function SessionEndCard({ title, line, actionLabel, accent, showLater, onStart, onDismiss }: SessionEndCardProps) {
  return (
    // Outer Pressable = full-screen backdrop that dismisses on tap. It is hidden
    // from screen readers (accessible={false}) since the card itself is the target.
    <Pressable accessible={false} tabIndex={-1} onPress={onDismiss} style={styles.scrim}>
      {/* The card. When it has buttons, a tap on empty card space must NOT
          reach the backdrop (stopPropagation). When it has none (auto-start),
          the whole card becomes a single "Dismiss" button. */}
      <Pressable
        accessible={!showLater}
        accessibilityRole={showLater ? undefined : 'button'}
        accessibilityLabel={showLater ? undefined : `${title}. ${line}. Dismiss`}
        onPress={showLater ? (event) => event.stopPropagation() : onDismiss}
        style={styles.card}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.line}>{line}</Text>
        {showLater ? (
          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={onStart} style={[styles.primary, { backgroundColor: accent }]}>
              <Text style={styles.primaryText}>{actionLabel}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.later}>
              <Text style={styles.laterText}>Later</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Covers the whole screen and sits above everything (zIndex 30).
  scrim: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    ...glassPanel,
    ...rounded(radius.sheet),
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  line: {
    color: colors.textPrimary,
    fontFamily: fonts.timeLight,
    fontSize: 28,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primary: {
    flex: 1,
    minHeight: 48,
    ...rounded(radius.lg),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  later: {
    minHeight: 48,
    paddingHorizontal: 18,
    ...rounded(radius.lg),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
});
