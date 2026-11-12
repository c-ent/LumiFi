import { colors, radius, rounded } from '@/src/theme/tokens';
import React from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLoadingBackground } from '@/components/wickglow/features/background/background-loading';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { PIXEL_ART } from '@/components/wickglow/features/background/pixel-art';
import { VIDEOS } from '@/components/wickglow/features/background/video-art';
import { useWickglow } from '@/components/wickglow/logic';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { SCENES } from '@/components/wickglow/theme';

// Desktop: choose the background. Three groups: the gradient scenes (Dusk /
// Midnight / Forest / Ember, each with a swatch of its middle color), Pixel art
// (looping pixel-art videos) and Videos (looping video).
// Exactly one choice across all groups is selected. Phone/tablet use MoodPicker
// instead (the two systems are still separate; see progress.md).
export function ScenePicker() {
  const { scene, setScene, videoBg, setVideoBg, pixelBg, setPixelBg } = useWickglow();
  // The background that is still loading, e.g. `video:rainy_cottage`.
  const loading = useLoadingBackground();
  return (
    <View>
      <Text style={styles.kicker}>Scenes</Text>
      <View style={styles.sceneGrid}>
        {SCENES.map((item) => {
          const selected = item.id === scene && !videoBg && pixelBg === null;
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${item.name} scene`} key={item.id} onPress={() => setScene(item.id)} style={[styles.sceneBtn, selected && { borderColor: colors.textPrimary }]}>
              <View style={[styles.swatch, { backgroundColor: item.b2 }]} />
              <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.kicker}>Pixel art</Text>
      <View style={styles.sceneGrid}>
        {PIXEL_ART.map((item) => {
          const selected = item.id === pixelBg;
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${item.name} pixel art background`} key={item.id} onPress={() => setPixelBg(item.id)} style={[styles.sceneBtn, selected && { borderColor: colors.textPrimary }]}>
              <View>
                <Image source={item.thumb} style={styles.sceneThumb} contentFit="cover" />
                {loading === `pixel:${item.id}` ? <TileSpinner /> : null}
              </View>
              <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.kicker}>Videos</Text>
      <View style={styles.sceneGrid}>
        {VIDEOS.map((item) => {
          const selected = item.id === videoBg;
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${item.name} video background`} key={item.id} onPress={() => setVideoBg(item.id)} style={[styles.sceneBtn, selected && { borderColor: colors.textPrimary }]}>
              <View>
                <Image source={item.thumb} style={styles.sceneThumb} contentFit="cover" />
                {loading === `video:${item.id}` ? <TileSpinner /> : null}
              </View>
              <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Dims the picked tile and spins over it while its background loads. Under
// reduced motion the dimming alone shows it, with the pill on the background.
function TileSpinner() {
  const reduced = useReducedMotion();
  return (
    <View style={tile.cover} pointerEvents="none" accessibilityLabel="Loading">
      {reduced ? null : <ActivityIndicator size="small" color={colors.textPrimary} />}
    </View>
  );
}

const tile = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgInset,
    ...rounded(radius.sm),
  },
});
