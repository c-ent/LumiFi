import { ErrorScreen } from '@/components/wickglow/shared/error-screen';
import { WickglowScreen } from '@/components/wickglow/wickglow-screen';
import { colors } from '@/src/theme/tokens';
import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.fill}>
      <WickglowScreen />
    </View>
  );
}

/** Expo Router shows this in place of the screen when rendering it throws. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <ErrorScreen onRetry={() => void retry()} />;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
});
