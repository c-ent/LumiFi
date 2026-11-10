import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_STORAGE_KEY, parseSavedState, SavedState, STORAGE_KEY } from './saved-state';

// The one place the app reads and writes its saved state, through Zustand's
// persist in `logic.tsx`. Load parses what it finds through `parseSavedState`
// and quietly moves a pre-rename `nightlamp:state` save onto the current key.
// Save is the only writer, so the read-failed guard below is the only thing
// standing between a bad read and overwriting real progress.

// Set while the last load failed to read storage. A rejected read leaves
// nothing to parse, so the app shows fresh defaults for the session, but those
// defaults must not be written back: the progress they would replace may still
// be sitting in storage, and a failed read says nothing about what is there.
// Changes made during such a session stay in memory until a read succeeds.
let readFailed = false;
// The skipped-save warning is printed once per session, not on every save.
let warnedSkippedSave = false;
// The read in flight, if any. Two overlapping loads share it, so they cannot
// finish in a different order from the one that set `readFailed`.
let inFlight: Promise<SavedState> | null = null;

/**
 * Reads the saved state, falling back to fresh defaults on any failure. A
 * failed read also arms `readFailed`, because defaults that came from an error
 * must never be written back: real progress may still be in storage. Callers
 * that overlap share one read, so the flag always matches the state returned.
 */
export function loadWickglowState(): Promise<SavedState> {
  if (!inFlight) {
    inFlight = readWickglowState().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function readWickglowState(): Promise<SavedState> {
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

/**
 * Writes the state, unless the last load failed. Storage can be unavailable in
 * private browsing, and a failed write is dropped rather than surfaced: the
 * in-memory state is still correct, so the next successful write catches up.
 */
export async function saveWickglowState(state: SavedState): Promise<void> {
  if (readFailed) {
    if (!warnedSkippedSave) {
      warnedSkippedSave = true;
      console.warn('Wickglow: the saved state could not be read, so changes are not being saved this session.');
    }
    return;
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private browsing.
  }
}
