import { WickglowScreen } from '@/components/wickglow/wickglow-screen';
import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.fill}>
      <WickglowScreen />
    </View>
  );
}

/**
 * Expo Router shows this in place of the screen when rendering it throws.
 * Without it a render error leaves a blank or red screen with no way back.
 * Saved progress is untouched: "Try again" renders the screen again from the
 * same save. The fonts may not have loaded when this shows, which is fine,
 * since an unknown font name falls back to the system font.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={[styles.fill, styles.error]}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorLine}>Your progress is saved.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={() => void retry()} style={styles.errorBtn}>
        <Text style={styles.errorBtnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  error: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
  },
  errorLine: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  errorBtn: {
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 22,
    ...rounded(radius.pill),
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBtnText: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
});
