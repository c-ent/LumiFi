import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

// A layer that never reports ready (a video whose first-frame event does not
// fire on some platform) still replaces the old one after this long.
const READY_FALLBACK_MS = 500;
// Each layer can hold a video player, so rapid switching keeps at most this many.
const MAX_LAYERS = 3;

type Layer = { id: string; ready: boolean };

/**
 * Switches between backgrounds without a transition. When `id` changes, the
 * new background is mounted hidden on top while the old one keeps showing.
 * Once the new one reports ready (a video after its first frame), it replaces
 * the old one at once and everything below it is unmounted, so there is no
 * black flash and no fade.
 *
 * `render` draws one background and must call `onReady` once it has something
 * on screen; a gradient can call it straight away.
 */
export function Crossfade({ id, render }: { id: string; render: (id: string, onReady: () => void) => ReactNode }) {
  const [layers, setLayers] = useState<Layer[]>(() => [{ id, ready: true }]);
  const [lastId, setLastId] = useState(id);

  // A new id adds a hidden layer on top, during render rather than in an
  // effect so the old background never shows for a frame without it. Layers
  // in between are trimmed.
  if (lastId !== id) {
    setLastId(id);
    setLayers((current) => {
      // Back to the base before anything above it showed: just drop the rest.
      if (current[0].id === id) return [current[0]];
      return [...current.filter((layer) => layer.id !== id), { id, ready: false }].slice(-MAX_LAYERS);
    });
  }
  const top = layers[layers.length - 1];

  // When the top layer is ready it becomes the only one; a ready layer that is
  // no longer on top just waits, hidden, until it is trimmed.
  const markReady = useCallback((layerId: string) => {
    setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === layerId);
      if (index < 0 || current[index].ready) return current;
      if (index === current.length - 1) return [{ ...current[index], ready: true }];
      return current.map((layer, i) => (i === index ? { ...layer, ready: true } : layer));
    });
  }, []);

  // Fallback in case the top layer never reports ready.
  useEffect(() => {
    if (top.ready) return undefined;
    const timer = setTimeout(() => markReady(top.id), READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [markReady, top.id, top.ready]);

  // Only the bottom layer is visible; the ones above are loading.
  return (
    <>
      {layers.map((layer, i) => (
        <View key={layer.id} style={[StyleSheet.absoluteFill, { opacity: i === 0 ? 1 : 0 }]} pointerEvents="none">
          {render(layer.id, () => markReady(layer.id))}
        </View>
      ))}
    </>
  );
}
