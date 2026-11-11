// The user's own audio files: picking them, copying them into the app's private
// document folder so they survive restart and cache pressure, and cleaning up
// when removed. Nothing here uploads a file; the copies stay on the device.
//
// Web is deliberately unsupported: the browser hands back a `blob:` URL that it
// revokes on reload, so a web pick could not honour the "survives restart"
// promise. `ownTracksSupported()` gates the UI.

import { OwnTrack, titleFromFileName } from '@/src/core/own-tracks';
import { Directory, File, Paths } from 'expo-file-system';
import { getDocumentAsync } from 'expo-document-picker';
import { Platform } from 'react-native';

const FOLDER = 'own-tracks';
const AUDIO_TYPES = ['audio/*'];
// Long enough for any real extension, short enough that a hand-edited name
// cannot smuggle path parts into the file name.
const MAX_EXT = 8;

let sequence = 0;

/**
 * Whether this platform can keep a picked file at all. The picker UI checks it
 * and hides itself on web, where a picked file could not be stored.
 */
export function ownTracksSupported(): boolean {
  return Platform.OS !== 'web';
}

/** The id is the file's name, so a delete can be done from the saved entry
 * alone. The extension is kept so the platform player can sniff the format. */
function newId(extension: string): string {
  sequence += 1;
  return `${Date.now().toString(36)}-${sequence.toString(36)}${extension}`;
}

/**
 * Keeps the extension only when it is a plain dot plus alphanumerics, and caps
 * its length. A name arrives from outside, so anything else (a path part, a
 * double extension, a trailing dot) is dropped rather than trusted. An unknown
 * extension is safe because the player reads the file's own header.
 */
function safeExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return '';
  const ext = name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '');
  // A leading dot plus alphanumerics only, or nothing.
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext.slice(0, MAX_EXT) : '';
}

/** The app's own-tracks folder, created on first use. */
function ensureOwnTracksFolder(): Directory {
  const folder = new Directory(Paths.document, FOLDER);
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  return folder;
}

/**
 * Opens the picker and copies every chosen file into the app's own-tracks
 * folder. A file that cannot be copied is dropped rather than failing the whole
 * batch, so one bad pick cannot lose the rest. Returns the saved entries in the
 * order they were picked, or null when the user cancelled, so the caller can
 * tell a real pick from a dismissed one.
 */
export async function pickOwnTracks(): Promise<OwnTrack[] | null> {
  if (!ownTracksSupported()) return null;
  const result = await getDocumentAsync({
    type: AUDIO_TYPES,
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const folder = ensureOwnTracksFolder();
  const tracks: OwnTrack[] = [];
  for (const asset of result.assets) {
    const saved = await copyIntoFolder(folder, asset.uri, asset.name);
    if (saved) tracks.push(saved);
  }
  return tracks;
}

/**
 * Copies one picked file in. A single failure returns null instead of throwing
 * so the caller can keep the rest of a multi-select batch.
 */
async function copyIntoFolder(
  folder: Directory,
  sourceUri: string,
  name: string,
): Promise<OwnTrack | null> {
  try {
    const id = newId(safeExtension(name));
    const destination = new File(folder, id);
    const source = new File(sourceUri);
    await source.copy(destination, { overwrite: false });
    dropCacheCopy(source);
    return { id, title: titleFromFileName(name), uri: destination.uri };
  } catch {
    return null;
  }
}

/**
 * The picker hands over a copy it made in the app's cache folder. Once that is
 * copied into own-tracks it is a second full copy of the song, so it is
 * removed. Only a file inside the cache folder is ever deleted here: a URI
 * that points anywhere else could be the user's original, and is left alone.
 */
function dropCacheCopy(source: File): void {
  try {
    const cache = Paths.cache.uri;
    if (!cache || !source.uri.startsWith(cache)) return;
    if (source.exists) source.delete();
  } catch {
    // The system clears its cache on its own; a copy left behind is not an error.
  }
}

/**
 * The file for a saved track, rebuilt from its id. The stored `uri` is an
 * absolute path that can go stale (iOS changes the app container path on
 * update), so the id, which is the file's name, is the source of truth. An id
 * is data read back from storage, so only a plain file name is accepted: no
 * separators, no `.` or `..`. Returns null on web or for an unsafe id.
 */
function ownTrackFile(id: string): File | null {
  if (!ownTracksSupported()) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(id) || id === '.' || id === '..') return null;
  return new File(new Directory(Paths.document, FOLDER), id);
}

/** The current URI for a saved track's file, or null when it cannot be built. */
export function ownTrackUri(id: string): string | null {
  try {
    return ownTrackFile(id)?.uri ?? null;
  } catch {
    return null;
  }
}

/** Deletes a track's file by id. A file already gone is not an error. */
export function deleteOwnTrackFile(id: string): void {
  try {
    const file = ownTrackFile(id);
    if (file?.exists) file.delete();
  } catch {
    // A hand-edited or already-removed path: nothing to delete.
  }
}

/** Whether the file behind a saved track id still exists. */
export function ownTrackExists(id: string): boolean {
  try {
    return ownTrackFile(id)?.exists ?? false;
  } catch {
    return false;
  }
}
