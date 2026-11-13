import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors, fade } from '@/src/theme/tokens';
import { CloseIcon, GoogleIcon } from '@/components/wickglow/shared/icons';
import { useKeyboardInset } from '@/components/wickglow/hooks/use-keyboard-inset';
import { MAX_NAME_LENGTH } from '@/src/data/auth';
import { useAccount } from './account';
import { cardStyles as styles } from './account-card-styles';

type Mode = 'signIn' | 'signUp';

/**
 * The small glass card that opens from the Account row while signed out:
 * email, password, Sign in or Create account, Forgot password, and Google.
 * It closes itself once the user is signed in.
 */
export function SignInCard({ visible, accent, onClose }: { visible: boolean; accent: string; onClose: () => void }) {
  const account = useAccount();
  const keyboard = useKeyboardInset();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (action: () => Promise<{ ok: boolean; message?: string; cancelled?: boolean }>, done?: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      if (done) {
        setInfo(done);
      } else {
        setPassword('');
        onClose();
      }
    } else if (!result.cancelled) {
      setError(result.message ?? 'Something went wrong. Try again.');
    }
  };

  const submit = () => run(() => (mode === 'signIn' ? account.signIn(email, password) : account.signUp(email, password, name)));
  const signingUp = mode === 'signUp';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessible={false} tabIndex={-1} style={[styles.scrim, keyboard > 0 ? { paddingBottom: keyboard } : null]} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()} accessible={false}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={styles.head}>
              <Text style={styles.title} accessibilityRole="header">{signingUp ? 'Create account' : 'Sign in'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
                <CloseIcon color={colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.lead}>Keep your XP, streak, tasks and history the same on every device.</Text>

            {signingUp ? (
              <>
                <Text style={styles.label}>Name (optional)</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="name"
                  textContentType="name"
                  accessibilityLabel="Name"
                  placeholder="What should we call you?"
                  placeholderTextColor={fade(colors.textPrimary, 0.4)}
                  style={styles.input}
                />
              </>
            ) : null}
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              accessibilityLabel="Email"
              placeholder="you@example.com"
              placeholderTextColor={fade(colors.textPrimary, 0.4)}
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              textContentType={signingUp ? 'newPassword' : 'password'}
              accessibilityLabel="Password"
              placeholder={signingUp ? 'At least 8 characters' : ''}
              placeholderTextColor={fade(colors.textPrimary, 0.4)}
              onSubmitEditing={() => void submit()}
              style={styles.input}
            />

            {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
            {info ? <Text style={styles.info} accessibilityLiveRegion="polite">{info}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy }}
              onPress={() => void submit()}
              style={[styles.primary, { backgroundColor: accent, opacity: busy ? 0.7 : 1 }]}
            >
              {busy ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.primaryText}>{signingUp ? 'Create account' : 'Sign in'}</Text>}
            </Pressable>

            {account.google ? (
              <>
                <Text style={styles.or}>or</Text>
                <Pressable accessibilityRole="button" onPress={() => void run(account.signInGoogle)} style={[styles.secondary, { flexDirection: 'row', gap: 8 }]}>
                  <GoogleIcon size={20} />
                  <Text style={styles.secondaryText}>Continue with Google</Text>
                </Pressable>
              </>
            ) : null}

            <View style={styles.links}>
              <Pressable
                accessibilityRole="button"
                style={styles.link}
                onPress={() => {
                  setMode(signingUp ? 'signIn' : 'signUp');
                  setError(null);
                  setInfo(null);
                }}
              >
                <Text style={styles.linkText}>{signingUp ? 'I have an account' : 'Create an account'}</Text>
              </Pressable>
              {!signingUp ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.link}
                  onPress={() => void run(() => account.resetPassword(email), 'If that email has an account, a reset link is on its way.')}
                >
                  <Text style={styles.linkText}>Forgot password</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
