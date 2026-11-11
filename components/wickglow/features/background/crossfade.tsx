import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';

const FADE_MS = 700;
// A layer that never reports ready (a video whose first-frame event does not
// fire on some platform) still fades in after this long.
const READY_FALLBACK_MS = 1500;
// Each layer can hold a video player, so rapid switching keeps at most this many.
const MAX_LAYERS = 3;

type Layer = { id: string; opacity: Animated.Value; ready: boolean };

/**
 * Crossfades between backgrounds. When `id` changes, the new background is
 * mounted on top at opacity 0 and fades in once it reports ready (a video
 * after its first frame), while the old one keeps playing underneath. When the
 * fade ends, everything below it is unmounted. The first background, and every
 * change under reduced motion, appears without a fade.
 *
 * `render` draws one background and must call `onReady` once it has something
 * on screen; a gradient can call it straight away.
 */
export function Crossfade({ id, render }: { id: string; render: (id: string, onReady: () => void) => ReactNode }) {
  const reduced = useReducedMotion();
  const [layers, setLayers] = useState<Layer[]>(() => [{ id, opacity: new Animated.Value(1), ready: true }]);
  const [lastId, setLastId] = useState(id);

  // A new id adds a layer on top, during render rather than in an effect so
  // the old background never shows for a frame without it. Layers in between
  // are trimmed, and the one left at the bottom is made fully opaque so
  // nothing shows through it.
  if (lastId !== id) {
    setLastId(id);
    setLayers((current) => {
      // Back to the base before anything above it showed: just drop the rest.
      if (current[0].id === id && current.slice(1).every((layer) => !layer.ready)) return [current[0]];
      const next = [...current.filter((layer) => layer.id !== id), { id, opacity: new Animated.Value(0), ready: false }].slice(-MAX_LAYERS);
      next[0].opacity.stopAnimation();
      next[0].opacity.setValue(1);
      return next;
    });
  }
  const top = layers[layers.length - 1];

  const markReady = useCallback((layerId: string) => {
    setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === layerId);
      if (index < 0 || current[index].ready) return current;
      return current.map((layer, i) => (i === index ? { ...layer, ready: true } : layer));
    });
  }, []);

  // Fallback in case the top layer never reports ready.
  useEffect(() => {
    if (top.ready) return undefined;
    const timer = setTimeout(() => markReady(top.id), READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [markReady, top.id, top.ready]);

  // Fade the top layer in once it is ready, then drop the layers below it.
  const fading = layers.length > 1 && top.ready ? top : null;
  useEffect(() => {
    if (!fading) return undefined;
    const dropBelow = () => setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === fading.id);
      return index > 0 ? current.slice(index) : current;
    });
    // Under reduced motion the new background simply replaces the old one.
    const animation = Animated.timing(fading.opacity, {
      toValue: 1,
      duration: reduced ? 0 : FADE_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) dropBelow();
    });
    return () => animation.stop();
  }, [fading, reduced]);

  return (
    <>
      {layers.map((layer) => (
        <Animated.View key={layer.id} style={[StyleSheet.absoluteFill, { opacity: layer.opacity }]} pointerEvents="none">
          {render(layer.id, () => markReady(layer.id))}
        </Animated.View>
      ))}
    </>
  );
}
