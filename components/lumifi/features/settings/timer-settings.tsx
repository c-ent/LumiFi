import { commitDurationMinutes } from '@/src/core/phase';
import { colors } from '@/src/theme/tokens';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useLumiFi } from '@/components/lumifi/logic';
import { panelStyles as styles } from '@/components/lumifi/shared/panel-styles';
import { PRESETS, TimerCfg } from '@/components/lumifi/theme';
import { useTone } from '@/components/lumifi/features/tone';

/**
 * The Timer settings panel: length presets and custom lengths, auto-start,
 * "hide the interface while I focus" (zen), and what the music does when a
 * session ends. Every control just calls a setter on the app context.
 */
export function TimerSettings({ mobile = false }: { mobile?: boolean }) {
  const lamp = useLumiFi();
  const tone = useTone(mobile);
  // A preset is "selected" only when all three lengths match the current settings.
  const same = (preset: TimerCfg) => preset.focus === lamp.cfg.focus && preset.short === lamp.cfg.short && preset.long === lamp.cfg.long;
  return (
    <View>
      <Text style={styles.kicker}>Timer length</Text>
      <View style={styles.presetRow}>
        {PRESETS.map((preset) => {
          const selected = same(preset);
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${preset.focus} minute focus preset`} key={preset.focus} onPress={() => lamp.applyPreset(preset)} style={[styles.preset, selected && { backgroundColor: tone.solid, borderColor: tone.solid }]}>
              <Text style={[styles.miniText, selected && { color: tone.ink }]}>{preset.focus} / {preset.short}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.fields}>
        <DurationField label="Focus (min)" value={lamp.cfg.focus} max={180} onChange={(value) => lamp.setDuration('focus', value)} />
        <DurationField label="Short break" value={lamp.cfg.short} max={60} onChange={(value) => lamp.setDuration('short', value)} />
        <DurationField label="Long break" value={lamp.cfg.long} max={90} onChange={(value) => lamp.setDuration('long', value)} />
      </View>
      <CheckRow label="Start the next session automatically" checked={lamp.auto} onPress={() => lamp.setAuto(!lamp.auto)} accent={tone.accent} />
      <CheckRow label="Hide the interface while I focus" checked={lamp.zenOpt} onPress={() => lamp.setZenOpt(!lamp.zenOpt)} accent={tone.accent} />
      <Text style={styles.kicker}>When a session ends</Text>
      <View style={styles.presetRow}>
        {([
          ['keep', 'Keep playing'],
          ['lower', 'Lower the volume'],
          ['fade', 'Fade out and stop'],
        ] as const).map(([id, label]) => {
          const selected = lamp.musicEnd === id;
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} key={id} onPress={() => lamp.setMusicEnd(id)} style={[styles.preset, selected && { backgroundColor: tone.solid, borderColor: tone.solid }]}>
              <Text style={[styles.miniText, selected && { color: tone.ink }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>Lower drops the music to half until the next session starts. The chime still plays.</Text>
      <Text style={styles.note}>Every fourth focus session is followed by a long break.</Text>
    </View>
  );
}

// A number field for minutes. It keeps its own `text` so you can clear the box
// and type freely; the value is only validated and saved when you finish
// (blur / Enter), via `commitDurationMinutes` (clamps to 1..max, falls back to
// the old value on junk). Saving on every keystroke would reset the timer mid-typing.
function DurationField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  // `source` remembers the last `value` we synced from, so when the value
  // changes from outside (e.g. picking a preset) we can refresh the text.
  // Setting state during render like this is React's sanctioned "adjust state
  // when a prop changes" pattern, and avoids an extra effect + flicker.
  const [source, setSource] = useState(value);
  // Mirrors `text` so commit() reads the latest even if called before a re-render.
  const textRef = useRef(text);
  if (source !== value) {
    setSource(value);
    setText(String(value));
  }
  useEffect(() => {
    textRef.current = String(value);
  }, [value]);

  const write = (raw: string) => {
    textRef.current = raw;
    setText(raw);
  };

  const commit = () => {
    const next = commitDurationMinutes(textRef.current, max, value);
    write(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.meta}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={write}
        keyboardType="number-pad"
        blurOnSubmit
        style={[styles.input, styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
        // Web fires blur when leaving the field; native fires onEndEditing.
        // Each platform commits on its own event, so a value is never saved twice.
        onBlur={() => {
          if (Platform.OS === 'web') commit();
        }}
        onEndEditing={() => {
          if (Platform.OS !== 'web') commit();
        }}
        onSubmitEditing={commit}
      />
    </View>
  );
}

// A labelled on/off row (a checkbox that fills with the accent when checked).
function CheckRow({ label, checked, onPress, accent }: { label: string; checked: boolean; onPress: () => void; accent: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onPress} style={styles.checkRow}>
      <View style={[styles.check, { borderColor: checked ? accent : colors.border, backgroundColor: checked ? accent : 'transparent' }]} />
      <Text style={styles.taskText}>{label}</Text>
    </Pressable>
  );
}
