import { colors } from '@/src/theme/tokens';
import Slider from '@react-native-community/slider';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { useTone } from '@/components/lumifi/features/tone';
import { AMBIENT_KEYS, type AmbientKey } from '@/components/lumifi/hooks/use-ambient';

export function MixerBlock({ mobile = false }: { mobile?: boolean }) {
  const { mix, setMix, silenceAmbient } = useLumiFi();
  const tone = useTone(mobile);
  const ambientOn = AMBIENT_KEYS.some((key) => mix[key] > 0);
  const rows: { key: AmbientKey; label: string }[] = [
    { key: 'rain', label: 'Rain' },
    { key: 'cafe', label: 'Cafe' },
    { key: 'fire', label: 'Fireplace' },
    { key: 'wind', label: 'Wind' },
    { key: 'clock', label: 'Clock' },
    { key: 'brown', label: 'Brown noise' },
    { key: 'forest', label: 'Forest' },
    { key: 'keyboard', label: 'Keyboard' },
    { key: 'waves', label: 'Waves' },
  ];
  return (
    <View>
      <View style={styles.mixHead}>
        <Text style={[styles.kicker, styles.mixKicker]}>Ambient sounds</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Turn off ambient sounds"
          accessibilityState={{ disabled: !ambientOn }}
          disabled={!ambientOn}
          onPress={silenceAmbient}
          style={[styles.mini, !ambientOn && styles.mixOffMuted]}
        >
          <Text style={[styles.miniText, !ambientOn && { color: colors.textMuted }]}>Turn off</Text>
        </Pressable>
      </View>
      {rows.map((row) => (
        <View key={row.key} style={styles.mixRow}>
          <Text style={styles.mixLabel}>{row.label}</Text>
          <Slider
            accessibilityLabel={`${row.label} volume`}
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={mix[row.key]}
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
