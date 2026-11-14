import type { FirebaseOptions } from 'firebase/app';

/**
 * The Firebase web config from the `EXPO_PUBLIC_FIREBASE_*` env vars, or null
 * when any is missing, in which case the app runs local-only. These values are
 * public by design: access is enforced by the Firestore rules, not by hiding
 * them. Each var is read as a literal `process.env.NAME`, because that is the
 * only form Expo inlines into the bundle.
 */
export function readFirebaseConfig(): FirebaseOptions | null {
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
  const complete = Object.values(config).every((value) => typeof value === 'string' && value.length > 0);
  return complete ? (config as FirebaseOptions) : null;
}
