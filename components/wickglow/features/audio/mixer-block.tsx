import { colors } from '@/src/theme/tokens';
import Slider from '@react-native-community/slider';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useWickglow } from '@/components/wickglow/logic';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { useTone } from '@/components/wickglow/features/tone';
import { AMBIENT_SOUNDS, ambientOn } from '@/src/core/ambient';

/**
 * The "Ambient sounds" list: one volume slider per looping sound, plus a
 * "Turn off" button. Used in the Sounds panel on all three layouts.
 *
 * The sliders only change `mix` (0..100) in the app state; the audio itself
 * is played by hooks/use-ambient.ts. `mobile` just picks the phone's mood
 * colors instead of the desktop scene colors (see features/tone.ts).
 */
export function MixerBlock({ mobile = false }: { mobile?: boolean }) {
  const { mix, setMix, silenceAmbient } = useWickglow();
  const tone = useTone(mobile);
  // Disable "Turn off" when nothing is playing, so it never looks pressable for no reason.
  const anyOn = ambientOn(mix);
  return (
    <View>
      <View style={styles.mixHead}>
        <Text style={[styles.kicker, styles.mixKicker, mobile && styles.kickerLg]}>Ambient sounds</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Turn off ambient sounds"
          accessibilityState={{ disabled: !anyOn }}
          disabled={!anyOn}
          onPress={silenceAmbient}
          style={[styles.mini, !anyOn && styles.mixOffMuted]}
        >
          <Text style={[styles.miniText, !anyOn && { color: colors.textMuted }]}>Turn off</Text>
        </Pressable>
      </View>
      {AMBIENT_SOUNDS.map((row) => (
        <View key={row.key} style={styles.mixRow}>
          <Text style={styles.mixLabel}>{row.label}</Text>
          <Slider
            accessibilityLabel={`${row.label} volume`}
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={mix[row.key]}
            // Fires continuously while dragging; rounding keeps whole-number steps.
            onValueChange={(value) => setMix(row.key, Math.round(value))}
            minimumTrackTintColor={tone.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={tone.accent}
          />
          <Text style={styles.mixValue}>{mix[row.key]}</Text>
        </View>
      ))}
      <Text style={styles.note}>Each loop plays while its slider is up. Rain also falls across the screen.</Text>
    </View>
  );
}
