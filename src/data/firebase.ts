import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { readFirebaseConfig } from './firebase-config';

// Android and iOS. Web uses `firebase.web.ts`.
// `getReactNativePersistence` only exists in the react-native build of
// `firebase/auth`, which Metro picks, but TypeScript reads the browser types,
// so it is pulled in with a typed require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

export type FirebaseClient = { app: FirebaseApp; auth: Auth; db: Firestore };

let client: FirebaseClient | null | undefined;

/** The Firebase client, created on first use, or null when the env config is missing. */
export function getFirebase(): FirebaseClient | null {
  if (client !== undefined) return client;
  const config = readFirebaseConfig();
  if (!config) {
    client = null;
    return client;
  }
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  let auth: Auth;
  try {
    // Keeps the signed-in session across app restarts.
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialized, e.g. after a fast refresh.
    auth = getAuth(app);
  }
  client = { app, auth, db: getFirestore(app) };
  return client;
}
