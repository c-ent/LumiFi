import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '@/src/theme/tokens';
import { useTone } from '@/components/wickglow/features/tone';
import { useAccount } from './account';
import { cardStyles as styles } from './account-card-styles';

export const UNSAVED_SIGN_OUT_TEXT = "Some progress isn't saved to your account yet. Signing out removes it from this device.";

/**
 * Signing out clears the progress from this device (owner, 2026-11-14). When
 * all of it is in the account, sign-out is immediate and this never shows.
 * Otherwise it shows "Saving" for a moment while the rest goes up, signs out
 * by itself if that works, and else warns, with Cancel as the main choice.
 * Mounted once by the provider, so it shows on every layout.
 */
export function SignOutCard() {
  const { leaving, confirmSignOut, cancelSignOut } = useAccount();
  const tone = useTone(false);
  if (!leaving) return null;
  const saving = leaving === 'saving';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={cancelSignOut} statusBarTranslucent>
      <Pressable accessible={false} tabIndex={-1} style={styles.scrim} onPress={cancelSignOut}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()} accessible={false}>
          <ScrollView bounces={false}>
            <View accessibilityLiveRegion="polite">
              <Text style={styles.title} accessibilityRole="header">
                {saving ? 'Saving your progress…' : 'Sign out?'}
              </Text>
              <Text style={[styles.lead, { marginTop: 6 }]}>
                {saving ? 'One moment, then you are signed out.' : UNSAVED_SIGN_OUT_TEXT}
              </Text>
            </View>
            {saving ? (
              <ActivityIndicator color={colors.textMuted} style={{ marginBottom: 4 }} />
            ) : (
              <Pressable accessibilityRole="button" style={[styles.primary, { backgroundColor: tone.solid }]} onPress={cancelSignOut}>
                <Text style={[styles.primaryText, { color: tone.ink }]}>Stay signed in</Text>
              </Pressable>
            )}
            {saving ? (
              <Pressable accessibilityRole="button" style={styles.secondary} onPress={cancelSignOut}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityHint="The progress not saved to your account is removed from this device."
                style={styles.secondary}
                onPress={confirmSignOut}
              >
                <Text style={[styles.secondaryText, { color: colors.error }]}>Sign out anyway</Text>
              </Pressable>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
