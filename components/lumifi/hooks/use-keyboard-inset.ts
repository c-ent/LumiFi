import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

// How much of the window the keyboard covers. A resized window already ends
// at the keyboard, so the overlap is 0 and the sheet is not lifted twice.
export function keyboardCover(windowHeight: number, screenY: number): number {
  if (!Number.isFinite(windowHeight) || !Number.isFinite(screenY)) return 0;
  return Math.max(0, Math.round(windowHeight - screenY));
}

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
      const update = () => setInset(visualKeyboardCover(window.innerHeight, viewport.height, viewport.offsetTop));
      update();
      viewport.addEventListener('resize', update);
      viewport.addEventListener('scroll', update);
      return () => {
        viewport.removeEventListener('resize', update);
        viewport.removeEventListener('scroll', update);
      };
    }

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
