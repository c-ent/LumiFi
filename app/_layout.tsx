import { colors, fade } from '@/src/theme/tokens';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Wickglow';
      // A thin, dark scrollbar in place of the browser default, so a panel's
      // own scroll (e.g. the scene picker) matches the glass-panel look
      // instead of an OS-chrome bar. Injected once; safe if this effect reruns.
      if (!document.getElementById('wickglow-scrollbar')) {
        const style = document.createElement('style');
        style.id = 'wickglow-scrollbar';
        style.textContent = `
          * { scrollbar-width: thin; scrollbar-color: ${fade('#FFFFFF', 0.18)} transparent; }
          *::-webkit-scrollbar { width: 8px; height: 8px; }
          *::-webkit-scrollbar-track { background: transparent; }
          *::-webkit-scrollbar-thumb { background-color: ${fade('#FFFFFF', 0.18)}; border-radius: 8px; }
          *::-webkit-scrollbar-thumb:hover { background-color: ${fade(colors.accent, 0.6)}; }
        `;
        document.head.appendChild(style);
      }
      return;
    }
    void SystemUI.setBackgroundColorAsync(colors.bgBase);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}>
        <Stack.Screen name="index" options={{ title: 'Wickglow' }} />
      </Stack>
    </>
  );
}
