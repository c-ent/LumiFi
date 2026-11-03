import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_STORAGE_KEY, parseSavedState, SavedState, STORAGE_KEY } from './saved-state';

export async function loadLumiFiState(): Promise<SavedState> {
  try {
    let raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw != null) {
        await AsyncStorage.setItem(STORAGE_KEY, raw);
        await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    return parseSavedState(raw);
  } catch {
    return parseSavedState(null);
  }
}

export async function saveLumiFiState(state: SavedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private browsing.
  }
}
