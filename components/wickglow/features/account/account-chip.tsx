import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { colors, fade, fonts, radius, rounded } from '@/src/theme/tokens';
import { useTone } from '@/components/wickglow/features/tone';
import { ChevronIcon, UserIcon } from '@/components/wickglow/shared/icons';
import { MAX_NAME_LENGTH } from '@/src/data/auth';
import { statusColor, statusLine } from './account-row';
import { SignInCard } from './sign-in-card';
import { useAccount } from './account';

/**
 * Account control for a card header (owner, 2026-11-13). Signed out: a "Sign in"
 * pill that opens the sign-in card. Signed in: the avatar, first name and a
 * chevron that open a dropdown with the account details, rename, sign out and
 * delete. Hidden when the build has no Firebase config.
 */
export function AccountChip() {
  const account = useAccount();
  const tone = useTone(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const chipRef = useRef<React.ComponentRef<typeof Pressable>>(null);
  const { width: windowWidth } = useWindowDimensions();
  if (!account.available || account.user === undefined) return null;
  const user = account.user;

  if (!user) {
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Optional. Everything works without an account."
          onPress={() => setOpen(true)}
          style={[styles.pill, { backgroundColor: fade(tone.accent, 0.14), borderColor: fade(tone.accent, 0.4) }]}
        >
          <UserIcon size={18} color={tone.accent} />
          <Text style={[styles.pillText, { color: tone.accent }]}>Sign in</Text>
        </Pressable>
        <SignInCard visible={open} accent={tone.solid} onClose={() => setOpen(false)} />
      </>
    );
  }

  const sync = account.sync;
  const email = user.email ?? 'Signed in';
  const title = user.name ?? email;
  const first = (user.name ?? email.split('@')[0]).split(' ')[0];
  const initial = (user.name ?? email).charAt(0).toUpperCase();
  const canRetry = sync.phase === 'offline' || sync.phase === 'error';
  const close = () => {
    setOpen(false);
    setEditing(false);
    setNameError(null);
  };
  const saveName = async () => {
    const result = await account.setName(draft);
    if (result.ok) setEditing(false);
    else setNameError(result.message ?? 'Could not save the name.');
  };

  return (
    <View>
      <Pressable
        ref={chipRef}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Account, ${title}`}
        onPress={() => {
          if (open) {
            close();
            return;
          }
          chipRef.current?.measureInWindow((x, y, width, height) => {
            setMenuPos({ top: y + height + 8, right: Math.max(8, windowWidth - (x + width)) });
            setOpen(true);
          });
        }}
        style={[styles.chip, { backgroundColor: fade(tone.accent, 0.12), borderColor: fade(tone.accent, 0.35) }]}
      >
        <View style={[styles.avatar, { backgroundColor: fade(tone.accent, 0.2), borderColor: fade(tone.accent, 0.4) }]}>
          <Text style={[styles.avatarText, { color: tone.accent }]}>{initial}</Text>
          <View style={[styles.dot, { backgroundColor: statusColor(sync) }]} />
        </View>
        <Text style={styles.first} numberOfLines={1}>{first}</Text>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <ChevronIcon size={12} color={colors.textMuted} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable accessible={false} tabIndex={-1} onPress={close} style={StyleSheet.absoluteFill} />
        <View style={[styles.menu, { top: menuPos.top, right: menuPos.right }]}>
            {editing ? (
              <>
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
                  style={styles.input}
                />
                {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
                <View style={styles.editRow}>
                  <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.item}>
                    <Text style={styles.itemText}>Cancel</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void saveName()} style={[styles.save, { backgroundColor: tone.solid }]}>
                    <Text style={[styles.saveText, { color: tone.ink }]}>Save</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title} numberOfLines={1} ellipsizeMode="middle">{title}</Text>
                {user.name && user.email ? <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">{user.email}</Text> : null}
              </>
            )}

            <View style={styles.statusRow} accessibilityLiveRegion="polite">
              <View style={[styles.statusDot, { backgroundColor: statusColor(sync) }]} />
              <Text style={[styles.status, sync.phase === 'error' ? { color: colors.error } : null]}>{statusLine(sync)}</Text>
            </View>

            {!user.verified ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{note ?? 'Email not confirmed. Open the link we sent you.'}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Resend the confirmation email"
                  onPress={() => {
                    void account.resend().then((result) => setNote(result.ok ? 'Confirmation email sent.' : (result.message || null)));
                  }}
                >
                  <Text style={[styles.itemText, { color: tone.accent }]}>Resend</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.divider} />
            {sync.phase === 'choose' ? (
              <Pressable accessibilityRole="button" onPress={() => { account.setChoiceOpen(true); close(); }} style={styles.item}>
                <Text style={[styles.itemText, { color: tone.accent }]}>Choose progress</Text>
              </Pressable>
            ) : null}
            {canRetry ? (
              <Pressable accessibilityRole="button" onPress={account.retry} style={styles.item}>
                <Text style={styles.itemText}>Try again</Text>
              </Pressable>
            ) : null}
            {!editing ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDraft(user.name ?? '');
                  setNameError(null);
                  setEditing(true);
                }}
                style={styles.item}
              >
                <Text style={styles.itemText}>Edit name</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => { close(); void account.signOut(); }} style={styles.item}>
              <Text style={styles.itemText}>Sign out</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="link"
              accessibilityHint="Opens an email asking to delete your account. It is deleted 7 days later."
              onPress={account.requestDeletion}
              style={styles.item}
            >
              <Text style={[styles.itemText, { color: colors.error }]}>Delete account</Text>
            </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 40,
    paddingHorizontal: 14,
    gap: 7,
    flexDirection: 'row',
    ...rounded(radius.pill),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
  },
  chip: {
    minHeight: 40,
    paddingLeft: 5,
    paddingRight: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...rounded(radius.pill),
    borderWidth: 1,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  dot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.bgCard,
  },
  first: {
    maxWidth: 110,
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
  },
  menu: {
    position: 'absolute',
    width: 280,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#1d1519',
    ...rounded(radius.md),
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  email: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  status: {
    flexShrink: 1,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  noticeText: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  item: {
    minHeight: 38,
    justifyContent: 'center',
  },
  itemText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  input: {
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
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12.5,
    marginTop: 4,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  save: {
    minHeight: 36,
    paddingHorizontal: 16,
    ...rounded(radius.pill),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
  },
});
