import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { KeyboardEvents } from 'react-native-keyboard-controller';

// The keyboard height reported by react-native-keyboard-controller, made safe
// to lay out with. The app is edge-to-edge, so that height already reaches the
// bottom edge of the screen (navigation bar included), which is where the
// sheet is pinned.
export function keyboardCover(height: number): number {
  if (!Number.isFinite(height)) return 0;
  return Math.max(0, Math.round(height));
}

// Web version of the same number. On mobile browsers the on-screen keyboard
// shrinks the *visual* viewport but not the layout viewport, so the keyboard
// height is the difference between the two.
export function visualKeyboardCover(innerHeight: number, viewportHeight: number, offsetTop: number): number {
  if (!Number.isFinite(innerHeight) || !Number.isFinite(viewportHeight) || !Number.isFinite(offsetTop)) return 0;
  return Math.max(0, Math.round(innerHeight - viewportHeight - offsetTop));
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

    // Native: react-native-keyboard-controller (needs the KeyboardProvider in
    // app/_layout.tsx). Its "will" events fire as the keyboard starts to move
    // on Android as well as iOS, with the final height, so the sheet rises
    // with the keyboard instead of after it. React Native's own Keyboard
    // events gave a wrong height on edge-to-edge Android and the keyboard
    // covered the field.
    const show = KeyboardEvents.addListener('keyboardWillShow', (event) => setInset(keyboardCover(event.height)));
    const hide = KeyboardEvents.addListener('keyboardWillHide', () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
