import { useSyncExternalStore } from 'react';
import { downloadSceneFile, sceneFileUri } from '@/components/wickglow/domain/scene-files';
import { RemoteFile, downloadFraction, remoteScenesEnabled } from '@/src/core/remote-scenes';

// Where each background video comes from, and whether a remote one is on the
// device yet. The scene picker and the backdrop read the same shared state, so
// a tile's progress and the backdrop update together.
//
// A scene's source is either a bundled module (`require(...)`, always ready) or
// a RemoteFile on the scene host. On web a remote scene is always ready (it is
// streamed); on Android it is ready once downloaded.

export type SceneSource = number | RemoteFile;

/**
 * Whether a source is a file on the scene host. Checked by shape, not by
 * "not a number": on web a bundled `require(...)` of a video can come back as
 * an asset object instead of a number.
 */
function isRemote(source: SceneSource): source is RemoteFile {
  const value = source as unknown;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RemoteFile).path === 'string' &&
    typeof (value as RemoteFile).bytes === 'number'
  );
}

export type SceneStatus =
  | { kind: 'ready' }
  | { kind: 'missing' }
  | { kind: 'downloading'; progress: number }
  | { kind: 'failed' };

const READY: SceneStatus = { kind: 'ready' };
const MISSING: SceneStatus = { kind: 'missing' };
const FAILED: SceneStatus = { kind: 'failed' };

// Keyed by the remote path. Each value is replaced, never changed in place, so
// useSyncExternalStore sees a new snapshot only when a status really changes.
const statuses = new Map<string, SceneStatus>();
const listeners = new Set<() => void>();

function setStatus(file: RemoteFile, status: SceneStatus): void {
  statuses.set(file.path, status);
  for (const listener of [...listeners]) listener();
}

function statusOf(file: RemoteFile): SceneStatus {
  const known = statuses.get(file.path);
  if (known) return known;
  // First look: the folder on disk is the source of truth.
  const status = sceneFileUri(file) ? READY : MISSING;
  statuses.set(file.path, status);
  return status;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Whether this scene can be offered: bundled, or remote with a host set. */
export function sceneOffered(source: SceneSource): boolean {
  return !isRemote(source) || remoteScenesEnabled();
}

/** The scene's remote file, or null for a bundled scene. */
export function remoteFileOf(source: SceneSource): RemoteFile | null {
  return isRemote(source) ? source : null;
}

/** Whether the scene is playable now, missing, downloading or failed. */
export function useSceneStatus(source: SceneSource): SceneStatus {
  const get = () => (isRemote(source) ? statusOf(source) : READY);
  return useSyncExternalStore(subscribe, get, get);
}

/**
 * What the video player should load: the bundled module, the downloaded file's
 * URI (Android) or the stream URL (web). Null while a remote scene is not on
 * the device, so the caller can fall back to the bundled Classic video.
 */
export function useSceneSource(source: SceneSource): number | string | null {
  const status = useSceneStatus(source);
  if (!isRemote(source)) return source;
  return status.kind === 'ready' ? sceneFileUri(source) : null;
}

/**
 * Downloads a remote scene. Resolves true once it is playable, false when it
 * failed or another download of the same scene is already running.
 */
export async function downloadScene(file: RemoteFile): Promise<boolean> {
  const current = statusOf(file);
  if (current.kind === 'ready') return true;
  if (current.kind === 'downloading') return false;
  let progress = 0;
  setStatus(file, { kind: 'downloading', progress });
  try {
    await downloadSceneFile(file, (written, total) => {
      // Whole percents only, so a fast connection does not re-render per chunk.
      const next = Math.floor(downloadFraction(written, total, file.bytes) * 100) / 100;
      if (next === progress) return;
      progress = next;
      setStatus(file, { kind: 'downloading', progress });
    });
    setStatus(file, READY);
    return true;
  } catch {
    setStatus(file, FAILED);
    return false;
  }
}
