import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
} from '@expo-google-fonts/figtree';
import {
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
} from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import React, { useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { colors, fonts } from '@/src/theme/tokens';
import { layoutForWindow } from '@/components/wickglow/features/layout';
import { DesktopWickglow } from '@/components/wickglow/screens/desktop';
import { MobileWickglow } from '@/components/wickglow/screens/mobile';
import { TabletWickglow } from '@/components/wickglow/screens/tablet';
import { WickglowProvider } from '@/components/wickglow/logic';

/**
 * The single screen of the app (rendered by app/index.tsx). It does only two
 * things: load fonts, and pick which of the three layouts to show for the
 * current window size. Everything else lives in the layouts under `screens/`.
 */

// useSyncExternalStore needs a subscribe function; there is nothing to
// subscribe to, so this is a no-op. The trick below returns `false` on the
// server render and `true` in the browser, so web (static export) renders a
// blank frame first and avoids a hydration mismatch from window-size layouts.
function subscribe() {
  return () => {};
}

export function WickglowScreen() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  // Register the custom fonts under the names used in `fonts` tokens. On
  // Android and iOS the same files are also embedded at build time by the
  // `expo-font` plugin in app.json, under these same names (the family name is
  // the file name), so text is in the right font from the first frame. This
  // call stays for web, which has no build-time embedding, and for a
  // development build made before the fonts were added to the plugin.
  useFonts({
    [fonts.time]: Outfit_200ExtraLight,
    [fonts.timeLight]: Outfit_300Light,
    [fonts.timeRegular]: Outfit_400Regular,
    [fonts.timeMedium]: Outfit_500Medium,
    [fonts.body]: Figtree_400Regular,
    [fonts.bodyMedium]: Figtree_500Medium,
    [fonts.bodySemibold]: Figtree_600SemiBold,
  });
  // useWindowDimensions re-renders on resize and device rotation.
  const { width, height } = useWindowDimensions();
  const layout = layoutForWindow(width, height, Platform.OS === 'web' ? 'web' : 'native');

  if (!isClient) {
    return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />;
  }

  return (
    <WickglowProvider>
      {layout === 'phone' ? <MobileWickglow /> : layout === 'tablet' ? <TabletWickglow /> : <DesktopWickglow />}
    </WickglowProvider>
  );
}
