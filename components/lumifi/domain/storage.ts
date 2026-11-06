import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_STORAGE_KEY, parseSavedState, SavedState, STORAGE_KEY } from './saved-state';

// Set while the last load failed to read storage. A rejected read leaves
// nothing to parse, so the app shows fresh defaults for the session, but those
// defaults must not be written back: the progress they would replace may still
// be sitting in storage, and a failed read says nothing about what is there.
// Changes made during such a session stay in memory until a read succeeds.
let readFailed = false;

export async function loadLumiFiState(): Promise<SavedState> {
  let raw: string | null = null;
  let legacy = false;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      // The legacy read is guarded too: if it throws, the defaults that come
      // back must not be written over the current key, which would leave the
      // progress that only the legacy key holds unreachable.
      raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      legacy = raw != null;
    }
  } catch {
    readFailed = true;
    return parseSavedState(null);
  }
  readFailed = false;
  const state = parseSavedState(raw);
  // The legacy copy is moved across only once it is safely in hand and parsed.
  // A failure here must not take the readable progress with it, so it is caught
  // on its own and the loaded state is returned either way.
  if (legacy) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, raw as string);
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // The next launch retries the migration.
    }
  }
  return state;
}

export async function saveLumiFiState(state: SavedState): Promise<void> {
  if (readFailed) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private browsing.
  }
}
