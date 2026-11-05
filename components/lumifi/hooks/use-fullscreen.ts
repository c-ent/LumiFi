import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// Element fullscreen is a browser API, so native never has it. Some mobile
// browsers expose the call but refuse it for a non-video element (iOS Safari),
// or report `fullscreenEnabled` false, so the control is hidden unless a real
// call can ask for the element and the document allows it.
type FullscreenDocument = Document & { webkitFullscreenEnabled?: boolean };

export function canUseFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled;
  const root = document.documentElement;
  return Boolean(enabled && (root.requestFullscreen || (root as { webkitRequestFullscreen?: unknown }).webkitRequestFullscreen));
}

function subscribeToClient() {
  return () => {};
}

export function useFullscreen() {
  const isClient = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!canUseFullscreen()) return undefined;
    const onChange = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(() => {
    if (!canUseFullscreen()) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch((error) => console.warn('Could not exit fullscreen mode.', error));
    } else {
      void document.documentElement.requestFullscreen().catch((error) => console.warn('Could not enter fullscreen mode.', error));
    }
  }, []);

  return { supported: isClient && canUseFullscreen(), active, toggle };
}
