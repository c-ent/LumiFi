import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTone } from '@/components/wickglow/features/tone';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';

/**
 * The pill switch at the top of a phone or tablet page that shows one view at
 * a time: Tracks / Ambient on Sounds, Stats / Calendar on Stats. `first` drops
 * the top margin when nothing sits above it.
 */
export function SegmentTabs<T extends string>({
  value,
  options,
  labels,
  onChange,
  mobile = false,
  first = false,
}: {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (next: T) => void;
  mobile?: boolean;
  first?: boolean;
}) {
  const tone = useTone(mobile);
  const selectedStyle = { backgroundColor: tone.solid, borderColor: tone.solid };
  const selectedText = { color: tone.ink };
  return (
    <View style={[styles.presetRow, styles.sourceRow, first ? styles.sourceRowFirst : null]}>
      {options.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === item }}
          accessibilityLabel={labels[item]}
          onPress={() => onChange(item)}
          style={[styles.preset, styles.sourceTab, value === item ? selectedStyle : null]}
        >
          <Text style={[styles.miniText, value === item ? selectedText : null]}>{labels[item]}</Text>
        </Pressable>
      ))}
    </View>
  );
}
