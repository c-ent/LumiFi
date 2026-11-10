import { colors } from '@/src/theme/tokens';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useWickglow } from '@/components/wickglow/logic';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { MOODS } from '@/components/wickglow/theme';

// Phone/tablet: choose a mood (Amber / Moonlit / Spirit). A mood only changes
// colors (background, flame, accent), never the layout. Each button shows a dot
// in that mood's flame color. Desktop uses ScenePicker instead.
// `video` adds the looping-video background as one more choice; the tablet
// passes it and the phone does not.
export function MoodPicker({ video = false }: { video?: boolean }) {
  const { mood, setMood, videoBg, setVideoBg } = useWickglow();
  return (
    <View>
      <Text style={styles.kicker}>Mood</Text>
      <View style={styles.moodRow}>
        {MOODS.map((item) => {
          const selected = item.id === mood && !(video && videoBg);
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${item.name} mood`} key={item.id} onPress={() => setMood(item.id)} style={[styles.moodBtn, selected && { borderColor: colors.textPrimary }]}>
              <View style={[styles.moodFlame, { backgroundColor: item.flame2, shadowColor: item.flame2 }]} />
              <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
        {video ? (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: videoBg }} accessibilityLabel="Video background" onPress={() => setVideoBg(true)} style={[styles.moodBtn, videoBg && { borderColor: colors.textPrimary }]}>
            <View style={[styles.moodFlame, { backgroundColor: colors.textMuted, shadowColor: colors.textMuted }]} />
            <Text style={[styles.sceneName, videoBg && { color: colors.textPrimary }]}>Video</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
