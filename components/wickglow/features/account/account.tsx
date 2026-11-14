import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Linking } from 'react-native';
import {
  accountsAvailable,
  changeName,
  createAccount,
  refreshAccount,
  resendVerification,
  sendPasswordReset,
  signInWithEmail,
  signOutAccount,
  watchAccount,
  type AccountUser,
  type AuthResult,
} from '@/src/data/auth';
import { googleSignInAvailable, signInWithGoogle } from '@/src/data/google-sign-in';
import { fetchProgress, listenProgress, pushProgress, resetProgress } from '@/src/data/progress-remote';
import { createAccountSync, SyncStatus, SyncStore } from '@/components/wickglow/domain/account-sync';

// The account: who is signed in, how syncing is going, and the sign-in
// actions. Its own context, so a sign-in or a sync status change re-renders
// the account UI and nothing else. `WickglowSession` provides it with the
// saved-state store.

/** Account deletion is by email request; the owner deletes by hand after 7 days (owner, 2026-11-13). */
export const DELETION_EMAIL = 'encarnacionelher@gmail.com';

export interface AccountValue {
  /** False when the build has no Firebase config: the account UI is hidden. */
  available: boolean;
  google: boolean;
  /** Undefined until Firebase has said whether someone is signed in. */
  user: AccountUser | null | undefined;
  sync: SyncStatus;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name?: string) => Promise<AuthResult>;
  signInGoogle: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  resend: () => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  setName: (name: string) => Promise<AuthResult>;
  choose: (keep: 'device' | 'account') => void;
  /** The keep-which-progress card is showing (it can be put off with "Decide later"). */
  choiceOpen: boolean;
  setChoiceOpen: (open: boolean) => void;
  retry: () => void;
  requestDeletion: () => void;
}

const AccountContext = createContext<AccountValue | null>(null);

export function deletionMailto(user: AccountUser): string {
  const subject = 'Delete my Wickglow account';
  const body = [
    'Please delete my Wickglow account and its saved progress.',
    '',
    `Account email: ${user.email ?? '(none)'}`,
    `Account id: ${user.uid}`,
    '',
    'I understand the account is deleted 7 days after this request.',
  ].join('\n');
  return `mailto:${DELETION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The short messages shown after a sign-in the user started (not on a restored session). */
export const SIGNED_IN_MESSAGE = 'Signed in. Your progress saves to your account';
export const SIGNED_UP_MESSAGE = 'Account created. Check your email to confirm it';
/** Shown when no email app opens for the deletion request, so it can be sent by hand. */
export const DELETION_FAILED_MESSAGE = `Could not open your email app. To delete your account, write to ${DELETION_EMAIL}`;

export function AccountProvider({ store, notify, children }: {
  store: SyncStore;
  /** Shows a short message (the app toast). */
  notify: (message: string) => void;
  children: React.ReactNode;
}) {
  // Latest `notify`, so the memoised actions below never call a stale one.
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const [available] = useState(accountsAvailable);
  const [google] = useState(() => available && googleSignInAvailable());
  const [user, setUser] = useState<AccountUser | null | undefined>(available ? undefined : null);
  const [sync] = useState(() => createAccountSync({
    store,
    remote: { fetch: fetchProgress, listen: listenProgress, push: pushProgress, reset: resetProgress },
    now: Date.now,
  }));
  const status = useSyncExternalStore(sync.subscribe, sync.status, sync.status);
  // The question last put off with "Decide later". A new question shows again.
  const [putOff, setPutOff] = useState<SyncStatus | null>(null);
  const choiceOpen = status.phase === 'choose' && putOff !== status;

  useEffect(() => watchAccount(setUser), []);
  useEffect(() => () => sync.dispose(), [sync]);

  // Waiting changes go up as soon as the app leaves the foreground (on web,
  // when the tab is hidden), so a task edit is not lost to the 10 s wait.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') sync.flush();
    });
    return () => subscription.remove();
  }, [sync]);

  const uid = user?.uid ?? null;
  useEffect(() => {
    if (uid) sync.start(uid);
    else sync.stop();
  }, [sync, uid]);

  // Coming back to the app after opening the verification link: re-read the
  // user so the row stops saying "Email not confirmed".
  const unverified = user != null && !user.verified;
  useEffect(() => {
    if (!unverified) return undefined;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshAccount().then((fresh) => { if (fresh) setUser(fresh); });
    });
    return () => subscription.remove();
  }, [unverified]);

  const value = useMemo<AccountValue>(() => ({
    available,
    google,
    user,
    sync: status,
    signIn: async (email, password) => {
      const result = await signInWithEmail(email, password);
      if (result.ok) notifyRef.current(SIGNED_IN_MESSAGE);
      return result;
    },
    signUp: async (email, password, name) => {
      const result = await createAccount(email, password, name);
      // The name is set after the sign-in event fired, so re-read the user.
      if (result.ok && name?.trim()) void refreshAccount().then((fresh) => { if (fresh) setUser(fresh); });
      if (result.ok) notifyRef.current(SIGNED_UP_MESSAGE);
      return result;
    },
    signInGoogle: async () => {
      const result = await signInWithGoogle();
      if (result.ok) notifyRef.current(SIGNED_IN_MESSAGE);
      return result;
    },
    resetPassword: sendPasswordReset,
    resend: resendVerification,
    signOut: signOutAccount,
    setName: async (name) => {
      const result = await changeName(name);
      if (result.ok) void refreshAccount().then((fresh) => { if (fresh) setUser(fresh); });
      return result;
    },
    choose: sync.choose,
    choiceOpen,
    setChoiceOpen: (open) => setPutOff(open ? null : status),
    retry: () => {
      sync.retry();
      void refreshAccount().then((fresh) => { if (fresh) setUser(fresh); });
    },
    requestDeletion: () => {
      if (user) void Linking.openURL(deletionMailto(user)).catch(() => notifyRef.current(DELETION_FAILED_MESSAGE));
    },
  }), [available, choiceOpen, google, status, sync, user]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used inside AccountProvider');
  return value;
}
