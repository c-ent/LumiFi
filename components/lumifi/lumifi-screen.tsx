import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
} from '@expo-google-fonts/figtree';
import {
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_500Medium,
} from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import React, { useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { colors, fonts } from '@/src/theme/tokens';
import { layoutForWindow } from '@/components/lumifi/features/layout';
import { DesktopLumiFi } from '@/components/lumifi/screens/desktop';
import { MobileLumiFi } from '@/components/lumifi/screens/mobile';
import { TabletLumiFi } from '@/components/lumifi/screens/tablet';
import { LumiFiProvider } from '@/components/lumifi/logic';

function subscribe() {
  return () => {};
}

export function LumiFiScreen() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  useFonts({
    [fonts.time]: Outfit_200ExtraLight,
    [fonts.timeLight]: Outfit_300Light,
    [fonts.timeMedium]: Outfit_500Medium,
    [fonts.body]: Figtree_400Regular,
    [fonts.bodyMedium]: Figtree_500Medium,
    [fonts.bodySemibold]: Figtree_600SemiBold,
  });
  const { width, height } = useWindowDimensions();
  const layout = layoutForWindow(width, height, Platform.OS === 'web' ? 'web' : 'native');

  if (!isClient) {
    return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />;
  }

  return (
    <LumiFiProvider>
      {layout === 'phone' ? <MobileLumiFi /> : layout === 'tablet' ? <TabletLumiFi /> : <DesktopLumiFi />}
    </LumiFiProvider>
  );
}
