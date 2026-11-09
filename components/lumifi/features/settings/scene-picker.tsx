import { colors } from '@/src/theme/tokens';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { SCENES } from '@/components/lumifi/theme';

// Desktop: choose the background scene (Dusk / Midnight / Forest / Ember). Each
// button shows a swatch of the scene's middle gradient color. Phone/tablet use
// MoodPicker instead (the two systems are still separate; see progress.md).
export function ScenePicker() {
  const { scene, setScene } = useLumiFi();
  return (
    <View>
      <View style={styles.sceneGrid}>
        {SCENES.map((item) => {
          const selected = item.id === scene;
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${item.name} scene`} key={item.id} onPress={() => setScene(item.id)} style={[styles.sceneBtn, selected && { borderColor: colors.textPrimary }]}>
              <View style={[styles.swatch, { backgroundColor: item.b2 }]} />
              <Text style={[styles.sceneName, selected && { color: colors.textPrimary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
