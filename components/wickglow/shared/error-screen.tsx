import { colors, fonts, radius, rounded } from '@/src/theme/tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Shown by the route's ErrorBoundary in place of a screen that threw while
 * rendering. Without it a render error leaves a blank or red screen with no way
 * back. Saved progress is untouched: "Try again" renders the screen again from
 * the same save. The fonts may not have loaded when this shows, which is fine,
 * since an unknown font name falls back to the system font.
 */
export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.fill}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.line}>Your progress is saved.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry} style={styles.btn}>
        <Text style={styles.btnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
  },
  line: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  btn: {
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 22,
    ...rounded(radius.pill),
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: colors.textInverse,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
});
