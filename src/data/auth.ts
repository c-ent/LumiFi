import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirebase } from './firebase';
import { codeOf, failure, MIN_PASSWORD_LENGTH, type AuthResult } from './auth-errors';
import { signOutGoogle } from './google-sign-in';

export type { AuthResult } from './auth-errors';

// Sign-in for both platforms. Firebase throws a `FirebaseError` with a `code`;
// these functions catch it and hand screens a plain result with a message a
// person can read (conventions.md, Firebase).

export interface AccountUser {
  uid: string;
  email: string | null;
  /** False until the link in the verification email is opened. Google accounts are verified. */
  verified: boolean;
  /** The Auth profile name: from Google, or typed at sign-up. Null when there is none. */
  name: string | null;
}

export const MAX_NAME_LENGTH = 40;

export { MIN_PASSWORD_LENGTH };

/** True when the Firebase config is present, so accounts can be offered. */
export function accountsAvailable(): boolean {
  return getFirebase() != null;
}

function toUser(user: User | null): AccountUser | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email, verified: user.emailVerified, name: user.displayName?.trim() || null };
}

/** Calls `listener` with the signed-in user (or null) now and on every change. */
export function watchAccount(listener: (user: AccountUser | null) => void): () => void {
  const client = getFirebase();
  if (!client) {
    listener(null);
    return () => {};
  }
  return onAuthStateChanged(client.auth, (user) => listener(toUser(user)));
}

export function checkEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Enter your email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'That email does not look right.';
  return null;
}

export function checkPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  return null;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const client = getFirebase();
  if (!client) return unavailable();
  const problem = checkEmail(email) ?? (password ? null : 'Enter your password.');
  if (problem) return { ok: false, message: problem };
  try {
    await signInWithEmailAndPassword(client.auth, email.trim(), password);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Creates the account and sends the verification email. The account works at once. `name` is optional. */
export async function createAccount(email: string, password: string, name = ''): Promise<AuthResult> {
  const client = getFirebase();
  if (!client) return unavailable();
  const problem = checkEmail(email) ?? checkPassword(password);
  if (problem) return { ok: false, message: problem };
  try {
    const credential = await createUserWithEmailAndPassword(client.auth, email.trim(), password);
    const displayName = name.trim().slice(0, MAX_NAME_LENGTH);
    if (displayName) await updateProfile(credential.user, { displayName }).catch(() => undefined);
    // A failed send is not a failed sign-up; the row offers "Resend".
    await sendEmailVerification(credential.user).catch(() => undefined);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Sets the profile name; an empty name clears it. */
export async function changeName(name: string): Promise<AuthResult> {
  const user = getFirebase()?.auth.currentUser;
  if (!user) return unavailable();
  const displayName = name.trim().slice(0, MAX_NAME_LENGTH);
  try {
    await updateProfile(user, { displayName: displayName || null });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const client = getFirebase();
  if (!client) return unavailable();
  const problem = checkEmail(email);
  if (problem) return { ok: false, message: problem };
  try {
    await sendPasswordResetEmail(client.auth, email.trim());
    return { ok: true };
  } catch (error) {
    // Firebase no longer says whether an email has an account, and neither
    // does the app: an unknown email reads as sent.
    if (codeOf(error) === 'auth/user-not-found') return { ok: true };
    return failure(error);
  }
}

export async function resendVerification(): Promise<AuthResult> {
  const user = getFirebase()?.auth.currentUser;
  if (!user) return unavailable();
  try {
    await sendEmailVerification(user);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Reloads the user, so a link opened in the email shows as confirmed. */
export async function refreshAccount(): Promise<AccountUser | null> {
  const user = getFirebase()?.auth.currentUser;
  if (!user) return null;
  try {
    await reload(user);
  } catch {
    // Offline: keep what is known.
  }
  return toUser(getFirebase()?.auth.currentUser ?? null);
}

export async function signOutAccount(): Promise<AuthResult> {
  const client = getFirebase();
  if (!client) return { ok: true };
  try {
    await signOutGoogle();
    await signOut(client.auth);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

function unavailable(): AuthResult {
  return { ok: false, message: 'Accounts are not available in this build.' };
}
