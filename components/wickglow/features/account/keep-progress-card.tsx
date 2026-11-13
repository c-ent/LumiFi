import React from 'react';
import { Modal, Pressable, Text } from 'react-native';
import type { ProgressSummary } from '@/components/wickglow/domain/account-sync';
import { useAccount } from './account';
import { cardStyles as styles } from './account-card-styles';

function describe(summary: ProgressSummary): string {
  const tasks = summary.tasks === 1 ? '1 task' : `${summary.tasks} tasks`;
  return `Level ${summary.level} · ${summary.xp} XP · ${summary.minutes} min · ${tasks}`;
}

/**
 * First sign-in when the device and the account both hold progress: show both
 * and keep only the one picked (owner, 2026-11-13). "Decide later" closes the
 * card; nothing syncs until a choice is made, and the Account row reopens it.
 * Mounted once by the provider, so it shows on every layout.
 */
export function KeepProgressCard() {
  const { sync, choose, choiceOpen, setChoiceOpen } = useAccount();
  if (sync.phase !== 'choose') return null;
  const later = () => setChoiceOpen(false);

  return (
    <Modal visible={choiceOpen} transparent animationType="fade" onRequestClose={later} statusBarTranslucent>
      <Pressable accessible={false} tabIndex={-1} style={styles.scrim} onPress={later}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()} accessible={false}>
          <Text style={styles.title} accessibilityRole="header">Keep which progress?</Text>
          <Text style={[styles.lead, { marginTop: 6 }]}>
            This device and your account both have progress. Pick one to keep. The other one is replaced, on every device.
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Keep this device: ${describe(sync.device)}`} style={styles.option} onPress={() => choose('device')}>
            <Text style={styles.optionTitle}>Keep this device</Text>
            <Text style={styles.optionMeta}>{describe(sync.device)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Keep my account: ${describe(sync.account)}`} style={styles.option} onPress={() => choose('account')}>
            <Text style={styles.optionTitle}>Keep my account</Text>
            <Text style={styles.optionMeta}>{describe(sync.account)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={later}>
            <Text style={styles.secondaryText}>Decide later</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
