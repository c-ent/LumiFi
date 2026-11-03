import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SessionEndCardProps {
  title: string;
  line: string;
  actionLabel: string;
  accent: string;
  showLater: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

export function SessionEndCard({ title, line, actionLabel, accent, showLater, onStart, onDismiss }: SessionEndCardProps) {
  return (
    <Pressable accessible={false} tabIndex={-1} onPress={onDismiss} style={styles.scrim}>
      <Pressable
        accessible={!showLater}
        accessibilityRole={showLater ? undefined : 'button'}
        accessibilityLabel={showLater ? undefined : 'Dismiss'}
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
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    ...rounded(radius.md),
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
