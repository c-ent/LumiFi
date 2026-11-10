import { colors } from '@/src/theme/tokens';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { CloseIcon } from '@/components/wickglow/shared/icons';
import { panelStyles as styles } from '@/components/wickglow/shared/panel-styles';

// Title bar for a desktop panel card: the panel's name and a close (X) button.
export function PanelHeading({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.head}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={styles.roundSm}>
        <CloseIcon color={colors.textPrimary} size={18} />
      </Pressable>
    </View>
  );
}
