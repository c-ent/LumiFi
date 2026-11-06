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

export function ownTracksSupported(): boolean {
  return Platform.OS !== 'web';
}

/** A unique, filesystem-safe id that doubles as the file's name in the folder. */
function newId(extension: string): string {
  sequence += 1;
  return `${Date.now().toString(36)}-${sequence.toString(36)}${extension}`;
}

function safeExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return '';
  const ext = name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '');
  // A leading dot plus alphanumerics only, or nothing.
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext.slice(0, MAX_EXT) : '';
}

function ownTracksFolder(): Directory {
  return new Directory(Paths.document, FOLDER);
}

function ensureFolder(): Directory {
  const folder = ownTracksFolder();
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

  const folder = ensureFolder();
  const tracks: OwnTrack[] = [];
  for (const asset of result.assets) {
    const saved = await copyIntoFolder(folder, asset.uri, asset.name);
    if (saved) tracks.push(saved);
  }
  return tracks;
}

async function copyIntoFolder(
  folder: Directory,
  sourceUri: string,
  name: string,
): Promise<OwnTrack | null> {
  try {
    const id = newId(safeExtension(name));
    const destination = new File(folder, id);
    await new File(sourceUri).copy(destination, { overwrite: false });
    return { id, title: titleFromFileName(name), uri: destination.uri };
  } catch {
    return null;
  }
}

/** Deletes a track's file. A file already gone is not an error. */
export function deleteOwnTrackFile(uri: string): void {
  if (!ownTracksSupported()) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A hand-edited or already-removed path: nothing to delete.
  }
}

/** Whether the file behind a saved entry still exists. */
export function ownTrackExists(uri: string): boolean {
  if (!ownTracksSupported()) return false;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
