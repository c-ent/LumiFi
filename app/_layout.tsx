import { colors } from '@/src/theme/tokens';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'LumiFi';
      return;
    }
    void SystemUI.setBackgroundColorAsync(colors.bgBase);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}>
        <Stack.Screen name="index" options={{ title: 'LumiFi' }} />
      </Stack>
    </>
  );
}
