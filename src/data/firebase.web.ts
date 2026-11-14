import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { readFirebaseConfig } from './firebase-config';
import type { FirebaseClient } from './firebase';

// Web. The browser build of `firebase/auth` keeps the session in IndexedDB.

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
  client = { app, auth: getAuth(app), db: getFirestore(app) };
  return client;
}
