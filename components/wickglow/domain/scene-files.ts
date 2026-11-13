// Android and iOS: remote background videos are downloaded once into the app's
// private `scenes` folder and played from there, so they work offline. The web
// version (scene-files.web.ts) streams from the host instead.
//
// A download is written to `<name>.part` and only renamed to its real name once
// its size matches the catalog, so a half-finished or cut-off file is never
// played. Leftover `.part` files (the app was closed mid-download) are removed
// the first time the folder is opened.

import { Directory, File, Paths } from 'expo-file-system';
import { RemoteFile, isCompleteDownload, localFileName, remoteUrl } from '@/src/core/remote-scenes';

const FOLDER = 'scenes';
const PART = '.part';

/** Whether scenes are downloaded to the device (true) or streamed (web). */
export const scenesDownload = true;

let cleaned = false;

function scenesFolder(): Directory {
  const folder = new Directory(Paths.document, FOLDER);
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  if (!cleaned) {
    cleaned = true;
    removePartials(folder);
  }
  return folder;
}

function removePartials(folder: Directory): void {
  try {
    for (const entry of folder.list()) {
      if (entry instanceof File && entry.name.endsWith(PART)) entry.delete();
    }
  } catch {
    // A leftover part file only takes space; it is replaced on the next download.
  }
}

/**
 * The playable URI of a remote scene: the downloaded file's URI, or null when
 * it is not on the device yet.
 */
export function sceneFileUri(file: RemoteFile): string | null {
  try {
    const local = new File(scenesFolder(), localFileName(file));
    return local.exists ? local.uri : null;
  } catch {
    return null;
  }
}

/**
 * Downloads a scene into the scenes folder. Resolves once the file is in place;
 * rejects when there is no host, the request fails, or the size is wrong (then
 * nothing is kept). `onProgress` gets the bytes written and the server's total
 * (-1 when the server does not send one).
 */
export async function downloadSceneFile(
  file: RemoteFile,
  onProgress: (written: number, total: number) => void,
): Promise<void> {
  const url = remoteUrl(file);
  if (!url) throw new Error('No scene host is set');
  const folder = scenesFolder();
  const name = localFileName(file);
  const part = new File(folder, name + PART);
  try {
    await File.downloadFileAsync(url, part, {
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => onProgress(bytesWritten, totalBytes),
    });
    if (!isCompleteDownload(part.size, file)) throw new Error('Incomplete download');
    const target = new File(folder, name);
    if (target.exists) target.delete();
    await part.move(target);
  } catch (error) {
    try {
      if (part.exists) part.delete();
    } catch {
      // Removed on the next start instead.
    }
    throw error;
  }
}
