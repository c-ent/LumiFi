import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PencilIcon } from '@/components/wickglow/shared/icons';
import { MAX_NAME_LENGTH } from '@/src/data/auth';
import { colors, fade, fonts, radius, rounded } from '@/src/theme/tokens';
import { panelStyles } from '@/components/wickglow/shared/panel-styles';
import { useTone } from '@/components/wickglow/features/tone';
import { progressWide as wide } from '@/components/wickglow/features/progression/wide-styles';
import type { SyncStatus } from '@/components/wickglow/domain/account-sync';
import { useAccount } from './account';
import { SignInCard } from './sign-in-card';

export function statusLine(sync: SyncStatus): string {
  switch (sync.phase) {
    case 'synced': return 'Progress saved to your account';
    case 'checking': return 'Connecting…';
    case 'choose': return 'Choose which progress to keep';
    case 'offline': return 'Offline. Saving on this device for now';
    case 'error': return sync.message;
    default: return '';
  }
}

export function statusColor(sync: SyncStatus): string {
  switch (sync.phase) {
    case 'synced': return colors.success;
    case 'error': return colors.error;
    case 'offline':
    case 'choose': return colors.accent;
    default: return colors.textMuted;
  }
}

/**
 * The Account row in Stats (owner, 2026-11-13), on phone, tablet and desktop.
 * One compact card: a round initial, the email with a status dot under it,
 * and the main action on the right. A footer line holds the sign-out note and
 * the "Delete account" request. Signed out, the same shape offers Sign in,
 * which opens the sign-in card. Hidden when the build has no Firebase config.
 */
export function AccountRow({ mobile = false, wide: desk = false }: { mobile?: boolean; wide?: boolean }) {
  const account = useAccount();
  const tone = useTone(mobile);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  if (!account.available || account.user === undefined) return null;

  const box = desk ? wide.card : [panelStyles.levelCard, styles.card];
  const user = account.user;
  const badge = [styles.avatar, { backgroundColor: fade(tone.accent, 0.16), borderColor: fade(tone.accent, 0.35) }];
  const primary = [styles.action, { backgroundColor: tone.solid, borderColor: tone.solid }];

  if (!user) {
    return (
      <View style={box}>
        <View style={styles.head}>
          <View style={badge} accessible={false}>
            <Text style={[styles.avatarText, { color: tone.accent }]}>W</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.name}>Account</Text>
            <Text style={styles.status}>Keep your progress on every device</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Optional. Everything works without an account."
            onPress={() => setOpen(true)}
            style={primary}
          >
            <Text style={[styles.actionText, { color: tone.ink }]}>Sign in</Text>
          </Pressable>
        </View>
        <SignInCard visible={open} accent={tone.solid} onClose={() => setOpen(false)} />
      </View>
    );
  }

  const sync = account.sync;
  const busy = sync.phase === 'checking';
  const canRetry = sync.phase === 'offline' || sync.phase === 'error';
  const email = user.email ?? 'Signed in';
  const title = user.name ?? email;
  const initial = (user.name ?? user.email ?? 'W').charAt(0).toUpperCase();

  const startEdit = () => {
    setDraft(user.name ?? '');
    setNameError(null);
    setEditing(true);
  };
  const saveName = async () => {
    const result = await account.setName(draft);
    if (result.ok) setEditing(false);
    else setNameError(result.message ?? 'Could not save the name.');
  };

  return (
    <>
    <View style={box}>
      <View style={styles.head}>
        <View style={badge} accessible={false}>
          <Text style={[styles.avatarText, { color: tone.accent }]}>{initial}</Text>
        </View>
        <View style={styles.copy}>
          {editing ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              autoComplete="name"
              accessibilityLabel="Name"
              placeholder="Your name"
              placeholderTextColor={fade(colors.textPrimary, 0.4)}
              onSubmitEditing={() => void saveName()}
              style={styles.nameInput}
            />
          ) : (
            <View style={styles.nameRow}>
              <Text style={[styles.name, styles.nameText]} numberOfLines={1} ellipsizeMode="middle">{title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Edit name" onPress={startEdit} hitSlop={10}>
                <PencilIcon size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
          {editing && nameError ? <Text style={styles.nameError}>{nameError}</Text> : null}
          {!editing && user.name && user.email ? <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">{user.email}</Text> : null}
          <View style={styles.statusRow} accessibilityLiveRegion="polite">
            {busy
              ? <ActivityIndicator size="small" color={colors.textMuted} style={styles.spinner} />
              : <View style={[styles.dot, { backgroundColor: statusColor(sync) }]} />}
            <Text style={[styles.status, sync.phase === 'error' ? { color: colors.error } : null]} numberOfLines={2}>
              {statusLine(sync)}
            </Text>
          </View>
        </View>
        {editing ? (
          <View style={[styles.sideActions, styles.centered]}>
            <Pressable accessibilityRole="button" onPress={() => void saveName()} style={primary}>
              <Text style={[styles.actionText, { color: tone.ink }]}>Save</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.link}>
              <Text style={styles.linkText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.sideActions}>
            <Pressable accessibilityRole="button" onPress={() => void account.signOut()} style={styles.action}>
              <Text style={styles.actionText}>Sign out</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityHint="Opens an email asking to delete your account. It is deleted 7 days later."
              onPress={account.requestDeletion}
              style={styles.deleteLink}
              hitSlop={6}
            >
              <Text style={styles.deleteText}>Delete account</Text>
            </Pressable>
          </View>
        )}
      </View>

      {!user.verified ? (
        <View style={[styles.notice, { borderColor: fade(colors.accent, 0.3), backgroundColor: fade(colors.accent, 0.08) }]}>
          <Text style={styles.noticeText}>{note ?? 'Email not confirmed. Open the link we sent you.'}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resend the confirmation email"
            style={styles.link}
            onPress={() => {
              void account.resend().then((result) => setNote(result.ok ? 'Confirmation email sent.' : (result.message || null)));
            }}
          >
            <Text style={styles.linkText}>Resend</Text>
          </Pressable>
        </View>
      ) : null}

      {sync.phase === 'choose' || canRetry ? (
        <View style={styles.extra}>
          {sync.phase === 'choose' ? (
            <Pressable accessibilityRole="button" onPress={() => account.setChoiceOpen(true)} style={primary}>
              <Text style={[styles.actionText, { color: tone.ink }]}>Choose progress</Text>
            </Pressable>
          ) : null}
          {canRetry ? (
            <Pressable accessibilityRole="button" onPress={account.retry} style={styles.action}>
              <Text style={styles.actionText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

    </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    marginTop: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 17,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  spinner: {
    width: 12,
    height: 12,
    transform: [{ scale: 0.7 }],
  },
  status: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
    flexShrink: 1,
  },
  action: {
    minHeight: 40,
    paddingHorizontal: 14,
    ...rounded(radius.pill),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    ...rounded(radius.sm),
  },
  noticeText: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  link: {
    minHeight: 32,
    justifyContent: 'center',
  },
  linkText: {
    color: colors.accent,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
  },
  extra: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    flexShrink: 1,
  },
  nameInput: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    ...rounded(radius.sm),
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  nameError: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12.5,
    marginTop: 4,
  },
  email: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12.5,
    marginTop: 1,
  },
  sideActions: {
    alignItems: 'flex-end',
    gap: 2,
  },
  centered: {
    alignItems: 'center',
  },
  deleteLink: {
    minHeight: 24,
    justifyContent: 'center',
  },
  deleteText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
