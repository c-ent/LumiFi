import { colors } from '@/src/theme/tokens';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLoadingBackground } from '@/components/wickglow/features/background/background-loading';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';
import { useWickglow } from '@/components/wickglow/logic';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { MOODS } from '@/components/wickglow/theme';

// Phone/tablet: choose a mood (Amber / Moonlit / Rose / ...). A mood only changes
// colors (background, flame, accent), never the layout. Each button shows a
// circle in that mood's flame color. Desktop uses ScenePicker instead.
// `video` adds the looping-video background as one more choice; the tablet
// passes it and the phone does not.
export function MoodPicker({ video = false }: { video?: boolean }) {
  const { mood, setMood, videoBg, setVideoBg } = useWickglow();
  const loading = useLoadingBackground();
  const reduced = useReducedMotion();
  // Empty cells that fill out the last row of three, so a short last row
  // starts at the left (see `moodRow`).
  const tiles = MOODS.length + (video ? 1 : 0);
  const spacers = (3 - (tiles % 3)) % 3;
  return (
    <View>
      <Text style={[styles.kicker, styles.kickerLg]}>Mood</Text>
      <View style={styles.moodRow}>
        {MOODS.map((item) => {
          const selected = item.id === mood && !(video && videoBg);
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${item.name} mood`} key={item.id} onPress={() => setMood(item.id)} style={[styles.moodBtn, selected && { borderColor: colors.textPrimary }]}>
              <View style={[styles.moodFlame, { backgroundColor: item.flame2 }]} />
              <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
        {video ? (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: videoBg !== null }} accessibilityLabel="Video background" onPress={() => setVideoBg('classic')} style={[styles.moodBtn, videoBg && { borderColor: colors.textPrimary }]}>
            {/* While the video loads, a spinner takes the dot's place. */}
            {loading?.startsWith('video:') && !reduced ? (
              <ActivityIndicator size="small" color={colors.textPrimary} accessibilityLabel="Loading" />
            ) : (
              <View style={[styles.moodFlame, { backgroundColor: colors.textMuted }]} />
            )}
            <Text style={[styles.sceneName, videoBg && { color: colors.textPrimary }]}>Video</Text>
          </Pressable>
        ) : null}
        {Array.from({ length: spacers }, (_, i) => (
          <View key={`spacer-${i}`} style={styles.moodSpacer} pointerEvents="none" importantForAccessibility="no-hide-descendants" />
        ))}
      </View>
    </View>
  );
}
