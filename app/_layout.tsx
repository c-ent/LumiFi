import { installWebScrollbar } from '@/components/wickglow/shared/web-scrollbar';
import { colors } from '@/src/theme/tokens';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Wickglow';
      installWebScrollbar();
      return;
    }
    void SystemUI.setBackgroundColorAsync(colors.bgBase);
  }, []);

  // KeyboardProvider powers the keyboard height in use-keyboard-inset.ts. It
  // detects the edge-to-edge window itself, so no translucency props are set.
  return (
    <KeyboardProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}>
        <Stack.Screen name="index" options={{ title: 'Wickglow' }} />
      </Stack>
    </KeyboardProvider>
  );
}
