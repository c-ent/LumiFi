import { useSyncExternalStore } from 'react';

// Which background is loading, as the swap in crossfade.tsx names it
// (`video:rainy_cottage`, `pixel:...`, `scene:...`, `mood:...`), or null.
// Only one backdrop is mounted at a time, so one shared value is enough. The
// pickers read it to put a spinner on the tile that was picked.

let loading: string | null = null;
const listeners = new Set<() => void>();

export function setLoadingBackground(id: string | null) {
  if (id === loading) return;
  loading = id;
  for (const listener of [...listeners]) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const get = () => loading;

/** The background that is loading, or null. */
export function useLoadingBackground(): string | null {
  return useSyncExternalStore(subscribe, get, get);
}
