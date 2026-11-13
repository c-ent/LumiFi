import { commitDurationMinutes, MAX_MINUTES } from '@/src/core/phase';
import { colors, radius, rounded } from '@/src/theme/tokens';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useWickglow } from '@/components/wickglow/logic';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';
import { PRESETS, TimerCfg } from '@/components/wickglow/theme';
import { useTone } from '@/components/wickglow/features/tone';

/**
 * The Timer settings panel: length presets and custom lengths, auto-start,
 * "hide the interface while I focus" (zen), and what the music does when a
 * session ends. Every control just calls a setter on the app context.
 */
export function TimerSettings({ mobile = false }: { mobile?: boolean }) {
  const lamp = useWickglow();
  // Actions never change identity, so they are pulled out once (see logic.tsx).
  const { setAuto, setZenOpt, setMusicEnd, applyPreset, setDuration } = lamp;
  const tone = useTone(mobile);
  // A preset is "selected" only when all three lengths match the current settings.
  const same = (preset: TimerCfg) => preset.focus === lamp.cfg.focus && preset.short === lamp.cfg.short && preset.long === lamp.cfg.long;
  // Phone and tablet put each group in its own card, like the other sheets.
  // The desktop panel is already a card, so its groups stay plain.
  const box = mobile ? styles.card : null;
  const longBreakNote = <Text style={styles.note}>Every fourth focus session is followed by a long break.</Text>;
  return (
    <View>
      <Text style={[styles.kicker, mobile && styles.kickerLg]}>Timer length</Text>
      <View style={box}>
        <View style={styles.presetRow}>
          {PRESETS.map((preset) => {
            const selected = same(preset);
            return (
              <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${preset.focus} minute focus preset`} key={preset.focus} onPress={() => applyPreset(preset)} style={[styles.preset, selected && { backgroundColor: tone.solid, borderColor: tone.solid }]}>
                <Text style={[styles.miniText, selected && { color: tone.ink }]}>{preset.focus} / {preset.short}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.fields}>
          <DurationField label="Focus (min)" value={lamp.cfg.focus} max={MAX_MINUTES.focus} onChange={(value) => setDuration('focus', value)} />
          <DurationField label="Short break" value={lamp.cfg.short} max={MAX_MINUTES.short} onChange={(value) => setDuration('short', value)} />
          <DurationField label="Long break" value={lamp.cfg.long} max={MAX_MINUTES.long} onChange={(value) => setDuration('long', value)} />
        </View>
        {mobile ? longBreakNote : null}
      </View>
      {mobile ? <Text style={[styles.kicker, styles.kickerLg]}>Sessions</Text> : null}
      <View style={box}>
        <CheckRow first={mobile} label="Start the next session automatically" checked={lamp.auto} onPress={() => setAuto(!lamp.auto)} accent={tone.accent} />
        <CheckRow label="Hide the interface while I focus" checked={lamp.zenOpt} onPress={() => setZenOpt(!lamp.zenOpt)} accent={tone.accent} />
      </View>
      <Text style={[styles.kicker, mobile && styles.kickerLg]}>When a session ends</Text>
      <View style={box}>
        <View style={choiceStyles.list}>
          {([
            ['keep', 'Keep playing'],
            ['lower', 'Lower the volume'],
            ['fade', 'Fade out and stop'],
          ] as const).map(([id, label]) => (
            <ChoiceRow key={id} label={label} selected={lamp.musicEnd === id} onPress={() => setMusicEnd(id)} accent={tone.accent} />
          ))}
        </View>
        <Text style={styles.note}>Lower drops the music to half until the next session starts. The chime still plays.</Text>
      </View>
      {mobile ? null : longBreakNote}
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
        accessibilityLabel={label}
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

// One option of a single-choice group, drawn as a full-width row with a radio
// dot. Full width and one height for every option, so the group reads as a
// list rather than a set of pills that wrap at different widths.
function ChoiceRow({ label, selected, onPress, accent }: { label: string; selected: boolean; onPress: () => void; accent: string }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} style={[choiceStyles.row, selected && { borderColor: accent }]}>
      <View style={[choiceStyles.dot, { borderColor: selected ? accent : colors.border }]}>
        {selected ? <View style={[choiceStyles.dotOn, { backgroundColor: accent }]} /> : null}
      </View>
      <Text style={[styles.taskText, choiceStyles.text, selected && { color: colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const choiceStyles = StyleSheet.create({
  list: {
    gap: 8,
    marginBottom: 12,
  },
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...rounded(radius.md),
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    flex: 1,
  },
});

// A labelled on/off row (a checkbox that fills with the accent when checked).
// `first` drops the top margin when it opens a card.
function CheckRow({ label, checked, onPress, accent, first = false }: { label: string; checked: boolean; onPress: () => void; accent: string; first?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onPress} style={[styles.checkRow, first ? { marginTop: 0 } : null]}>
      <View style={[styles.check, { borderColor: checked ? accent : colors.border, backgroundColor: checked ? accent : 'transparent' }]} />
      <Text style={styles.taskText}>{label}</Text>
    </Pressable>
  );
}
