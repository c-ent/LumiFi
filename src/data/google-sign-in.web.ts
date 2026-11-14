import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { failure, type AuthResult } from './auth-errors';
import { getFirebase } from './firebase';

// Web: Google sign-in in a popup. Nothing extra to set up; the site's domain
// is in Firebase's authorized domains. Android uses `google-sign-in.ts`.

export function googleSignInAvailable(): boolean {
  return getFirebase() != null;
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const client = getFirebase();
  if (!client) return { ok: false, message: 'Accounts are not available in this build.' };
  try {
    await signInWithPopup(client.auth, new GoogleAuthProvider());
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** The popup keeps no session of its own. */
export async function signOutGoogle(): Promise<void> {}
