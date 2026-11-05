import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// Element fullscreen is a browser API, so native never has it. Some mobile
// browsers expose the call but refuse it for a non-video element (iOS Safari),
// or report `fullscreenEnabled` false, so the control is hidden unless a real
// call can ask for the element and the document allows it.
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export function requestEnterFullscreen(): Promise<void> | void {
  const root = document.documentElement as FullscreenElement;
  // A browser can ship only the prefixed call, so prefer the standard one and
  // fall back rather than failing on a name the document does not carry.
  if (root.requestFullscreen) return root.requestFullscreen();
  return root.webkitRequestFullscreen?.();
}

export function requestExitFullscreen(): Promise<void> | void {
  const doc = document as FullscreenDocument;
  if (doc.exitFullscreen) return doc.exitFullscreen();
  return doc.webkitExitFullscreen?.();
}

export function fullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

// The prefixed events fire in place of the standard ones on those browsers, so
// the active state follows either.
const CHANGE_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'];

function subscribeToChanges(onChange: () => void): () => void {
  for (const event of CHANGE_EVENTS) document.addEventListener(event, onChange);
  return () => {
    for (const event of CHANGE_EVENTS) document.removeEventListener(event, onChange);
  };
}

export function canUseFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled;
  const root = document.documentElement as FullscreenElement;
  return Boolean(enabled && (root.requestFullscreen || root.webkitRequestFullscreen));
}

function subscribeToClient() {
  return () => {};
}

export function useFullscreen() {
  const isClient = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!canUseFullscreen()) return undefined;
    return subscribeToChanges(() => setActive(Boolean(fullscreenElement())));
  }, []);

  const toggle = useCallback(() => {
    if (!canUseFullscreen()) return;
    const leave = Boolean(fullscreenElement());
    void Promise.resolve(leave ? requestExitFullscreen() : requestEnterFullscreen()).catch((error) =>
      console.warn(leave ? 'Could not exit fullscreen mode.' : 'Could not enter fullscreen mode.', error),
    );
  }, []);

  return { supported: isClient && canUseFullscreen(), active, toggle };
}
