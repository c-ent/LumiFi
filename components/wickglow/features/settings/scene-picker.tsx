import { colors } from '@/src/theme/tokens';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { PIXEL_ART } from '@/components/wickglow/features/background/pixel-art';
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
              <View style={[styles.swatch, { backgroundColor: colors.textMuted }]} />
              <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.kicker}>Videos</Text>
      <View style={styles.sceneGrid}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: videoBg }} accessibilityLabel="Video background" onPress={() => setVideoBg(true)} style={[styles.sceneBtn, videoBg && { borderColor: colors.textPrimary }]}>
          <View style={[styles.swatch, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.sceneName, videoBg && { color: colors.textPrimary }]}>Video</Text>
        </Pressable>
      </View>
    </View>
  );
}
