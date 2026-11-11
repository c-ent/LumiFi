import React, { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

// A layer that never reports ready (a video whose first-frame event does not
// fire on some platform) still replaces the old one after this long.
const READY_FALLBACK_MS = 500;

/**
 * Switches between backgrounds without a transition. When `id` changes, the
 * new background is mounted hidden on top while the old one keeps showing.
 * Once the new one reports ready (a video after its first frame), it replaces
 * the old one at once and the old one is unmounted, so there is no black
 * flash and no fade.
 *
 * `render` draws one background and must call `onReady` once it has something
 * on screen; a gradient can call it straight away.
 */
export function Crossfade({ id, render }: { id: string; render: (id: string, onReady: () => void) => ReactNode }) {
  // The background on screen. `id` is the one asked for; while the two differ,
  // the asked-for one loads hidden on top.
  //
  // The layers are worked out from `id` and `shown` on every render. Do not
  // keep them in state and add the new one with a `setState` during render: a
  // ready call that changes nothing (the first background's own first frame)
  // waits in React's queue, a click renders at a higher priority and skips it,
  // and when React replays it the layer added during render is lost. The pick
  // then never shows until the next one.
  const [shown, setShown] = useState(id);
  const wanted = useRef(id);
  useLayoutEffect(() => {
    wanted.current = id;
  });

  // Only the asked-for background may take over; a late call from any other is ignored.
  const markReady = useCallback((layerId: string) => {
    if (layerId === wanted.current) setShown(layerId);
  }, []);

  // Fallback in case the new background never reports ready.
  useEffect(() => {
    if (id === shown) return undefined;
    const timer = setTimeout(() => markReady(id), READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [id, markReady, shown]);

  // Only the bottom layer is visible; the one above is loading. Picking again
  // while one loads replaces the loading one, so there are never more than two.
  const layers = id === shown ? [shown] : [shown, id];
  // `markReady` reads the ref only when a background later reports ready, never
  // while rendering. The rule cannot see into the call.
  const drawn = layers.map((layerId, i) => (
    <View key={layerId} style={[StyleSheet.absoluteFill, { opacity: i === 0 ? 1 : 0 }]} pointerEvents="none">
      {/* eslint-disable-next-line react-hooks/refs */}
      {render(layerId, () => markReady(layerId))}
    </View>
  ));
  return <>{drawn}</>;
}
