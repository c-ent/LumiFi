import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { failure, type AuthResult } from './auth-errors';
import { getFirebase } from './firebase';

// Android (and iOS, untested): the native Google account picker from
// `@react-native-google-signin/google-signin`, whose ID token signs in to
// Firebase. It needs:
// - a development build made after the package was added (Expo Go and older
//   builds have no native module, so the module is loaded lazily and the
//   button is hidden without it);
// - an Android app in Firebase with package `com.cent.wickglow` and the SHA-1
//   from `eas credentials`;
// - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: the public "Web client" OAuth id from
//   Firebase, Authentication, Sign-in method, Google, Web SDK configuration.
//   Not a secret: it names the app to Google, like the Firebase config.

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let loaded: GoogleSigninModule | null | undefined;
let configured = false;

function load(): GoogleSigninModule | null {
  if (loaded !== undefined) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    loaded = null;
  }
  return loaded;
}

function ready(): GoogleSigninModule | null {
  if (!WEB_CLIENT_ID || !getFirebase()) return null;
  const module = load();
  if (!module) return null;
  if (!configured) {
    try {
      module.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
      configured = true;
    } catch {
      return null;
    }
  }
  return module;
}

export function googleSignInAvailable(): boolean {
  return ready() != null;
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const client = getFirebase();
  const module = ready();
  if (!client || !module) return { ok: false, message: 'Google sign-in is not available in this build.' };
  const { GoogleSignin, statusCodes } = module;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') return { ok: false, message: '', cancelled: true };
    const token = response.data.idToken;
    if (!token) return { ok: false, message: 'Google did not return a sign-in token. Try again.' };
    await signInWithCredential(client.auth, GoogleAuthProvider.credential(token));
    return { ok: true };
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
    if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS) {
      return { ok: false, message: '', cancelled: true };
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { ok: false, message: 'Google Play services are needed for Google sign-in.' };
    }
    return failure(error);
  }
}

/** Forgets the Google account too, so the next sign-in shows the account picker. */
export async function signOutGoogle(): Promise<void> {
  const module = loaded ?? null;
  if (!module || !configured) return;
  try {
    await module.GoogleSignin.signOut();
  } catch {
    // Not signed in with Google.
  }
}
