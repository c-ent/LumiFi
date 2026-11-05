import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_STORAGE_KEY, parseSavedState, SavedState, STORAGE_KEY } from './saved-state';

export async function loadLumiFiState(): Promise<SavedState> {
  let raw: string | null = null;
  let legacy = false;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      legacy = raw != null;
    }
  } catch {
    // A read that fails leaves nothing to parse, so the app starts fresh.
    return parseSavedState(null);
  }
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
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private browsing.
  }
}
