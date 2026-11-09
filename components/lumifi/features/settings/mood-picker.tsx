import { colors } from '@/src/theme/tokens';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { MOODS } from '@/components/lumifi/theme';

// Phone/tablet: choose a mood (Amber / Moonlit / Spirit). A mood only changes
// colors (background, flame, accent), never the layout. Each button shows a dot
// in that mood's flame color. Desktop uses ScenePicker instead.
export function MoodPicker() {
  const { mood, setMood } = useLumiFi();
  return (
    <View>
      <Text style={styles.kicker}>Mood</Text>
      <View style={styles.moodRow}>
        {MOODS.map((item) => {
          const selected = item.id === mood;
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${item.name} mood`} key={item.id} onPress={() => setMood(item.id)} style={[styles.moodBtn, selected && { borderColor: colors.textPrimary }]}>
              <View style={[styles.moodFlame, { backgroundColor: item.flame2, shadowColor: item.flame2 }]} />
              <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
