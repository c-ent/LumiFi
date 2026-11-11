import React, { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setLoadingBackground } from '@/components/wickglow/features/background/background-loading';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { colors, fonts, radius } from '@/src/theme/tokens';

// A layer that never reports ready (a video that fails to load) still replaces
// the old one after this long. It is only a safety net: a video normally
// reports ready on its first frame, and showing it before then is a black
// flash, so this must stay longer than a large video takes to load.
const READY_FALLBACK_MS = 4000;
// The loading cue waits this long, so a cached video or a gradient, which are
// ready almost at once, swap without a cue flickering in and out.
const LOADING_CUE_MS = 250;

/**
 * Switches between backgrounds without a transition. When `id` changes, the
 * new background is mounted hidden on top while the old one keeps showing.
 * Once the new one reports ready (a video after its first frame), it replaces
 * the old one at once and the old one is unmounted, so there is no black
 * flash and no fade. While a slow one loads, a small "Loading scene" pill
 * shows over the old background and the picker's tile shows a spinner (see
 * background-loading.ts).
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

  // Show the loading cue once the new background has taken a moment.
  const [slow, setSlow] = useState<string | null>(null);
  useEffect(() => {
    if (id === shown) return undefined;
    const timer = setTimeout(() => setSlow(id), LOADING_CUE_MS);
    return () => clearTimeout(timer);
  }, [id, shown]);
  const loadingId = slow === id && id !== shown ? id : null;
  useEffect(() => {
    setLoadingBackground(loadingId);
  }, [loadingId]);
  useEffect(() => () => setLoadingBackground(null), []);

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
  return (
    <>
      {drawn}
      {loadingId ? <LoadingCue /> : null}
    </>
  );
}

// A small pill near the top of the screen, clear of the timer in the middle.
function LoadingCue() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  return (
    <View style={[styles.cueRow, { top: insets.top + 72 }]} pointerEvents="none">
      <View style={styles.cue} accessible accessibilityLiveRegion="polite" accessibilityLabel="Loading scene">
        {/* Under reduced motion the words alone say it, without a spinner. */}
        {reduced ? null : <ActivityIndicator size="small" color={colors.textPrimary} />}
        <Text style={styles.cueText}>Loading scene…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cueRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cueText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});
