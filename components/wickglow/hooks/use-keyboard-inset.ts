import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

// How much of the window the keyboard covers. A resized window already ends
// at the keyboard, so the overlap is 0 and the sheet is not lifted twice.
export function keyboardCover(windowHeight: number, screenY: number): number {
  if (!Number.isFinite(windowHeight) || !Number.isFinite(screenY)) return 0;
  return Math.max(0, Math.round(windowHeight - screenY));
}

// Web version of the same number. On mobile browsers the on-screen keyboard
// shrinks the *visual* viewport but not the layout viewport, so the keyboard
// height is the difference between the two.
export function visualKeyboardCover(innerHeight: number, viewportHeight: number, offsetTop: number): number {
  if (!Number.isFinite(innerHeight) || !Number.isFinite(viewportHeight) || !Number.isFinite(offsetTop)) return 0;
  return Math.max(0, Math.round(innerHeight - viewportHeight - offsetTop));
}

function coverFromEvent(event: KeyboardEvent): number {
  return keyboardCover(Dimensions.get('window').height, event.endCoordinates.screenY);
}

// The distance to lift a bottom-pinned sheet so a focused field stays visible.
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const viewport = window.visualViewport;
      if (!viewport) return undefined;
      // A pinch-zoomed page also shrinks the visual viewport, which is not a
      // keyboard, so a zoomed viewport reports no cover.
      const update = () => setInset(viewport.scale !== 1 ? 0 : visualKeyboardCover(window.innerHeight, viewport.height, viewport.offsetTop));
      update();
      viewport.addEventListener('resize', update);
      viewport.addEventListener('scroll', update);
      return () => {
        viewport.removeEventListener('resize', update);
        viewport.removeEventListener('scroll', update);
      };
    }

    // Native: iOS has "will" events that fire before the animation, so the
    // sheet moves with the keyboard. Android only has "did" events.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => setInset(coverFromEvent(event)));
    const hide = Keyboard.addListener(hideEvent, () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
