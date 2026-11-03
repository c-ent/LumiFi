export const PHONE_MAX_WIDTH = 600;
export const TABLET_MAX_WIDTH = 840;

export type AppLayout = 'phone' | 'tablet' | 'desktop';

export function layoutForWidth(width: number): AppLayout {
  if (width < PHONE_MAX_WIDTH) return 'phone';
  if (width <= TABLET_MAX_WIDTH) return 'tablet';
  return 'desktop';
}

// Web follows the window width, so a 1280px browser stays the desktop scene.
// A phone or tablet is never that wide in both directions. Once the window is
// at least 600 wide, rotation uses the split layout instead of the desktop scene.
//
// This is a dimension band, not a device check: an iPad in portrait (768-834)
// lands on the tablet layout, and an iPad Pro in landscape (shorter side 1024)
// lands on the desktop scene, because 1024 is past TABLET_MAX_WIDTH.
export function layoutForWindow(width: number, height: number, platform: 'web' | 'native'): AppLayout {
  if (platform === 'web') return layoutForWidth(width);
  if (Math.min(width, height) > TABLET_MAX_WIDTH) return 'desktop';
  if (width < PHONE_MAX_WIDTH) return 'phone';
  return 'tablet';
}
