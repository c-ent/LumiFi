// Background videos that are not bundled in the app but fetched from the scene
// host. Keeping them out of the bundle keeps the Android download small. On
// Android a scene is downloaded once into the app's own folder and then plays
// offline; on web the browser streams it from the site itself.
//
// The files live in `public/scenes/` (served by the web deploy on Vercel at
// `/scenes/...`), with a version folder (`v1/`) below it.

/**
 * The public base URL Android downloads scenes from, with no trailing slash.
 * It is a public address, not a secret. While it is empty the remote scenes
 * are hidden, so the app still works with only the bundled Classic video and
 * the gradients.
 */
export const SCENE_HOST = 'https://wickglow.vercel.app/scenes';

/**
 * Where web loads scenes from: the same site, so the dev server, preview
 * deploys and production each serve their own copy of `public/scenes/`.
 */
export const SCENE_WEB_PATH = '/scenes';

/**
 * A file on the scene host. `path` is relative to the host and carries a
 * version folder (`v1/...`): a re-encoded file gets a new version, so a phone
 * that holds the old one downloads the new one instead of trusting it.
 * `bytes` is the exact file size, used to check a finished download.
 */
export interface RemoteFile {
  path: string;
  bytes: number;
}

/** True when a scene host is set, so remote scenes can be offered. */
export function remoteScenesEnabled(host: string = SCENE_HOST): boolean {
  return host.trim() !== '';
}

/**
 * The full URL of a remote file, or null while no host is set. Each path part
 * is URL-encoded, so a space or other unsafe character in a name stays one part.
 */
export function remoteUrl(file: RemoteFile, host: string = SCENE_HOST): string | null {
  const base = host.trim().replace(/\/+$/, '');
  if (!base) return null;
  const path = file.path
    .split('/')
    .filter((part) => part !== '')
    .map(encodeURIComponent)
    .join('/');
  return `${base}/${path}`;
}

/**
 * The name the downloaded file is kept under on the device: the remote path
 * with each separator turned into `_` and anything but letters, digits, `.`,
 * `_` and `-` dropped, so it can never point outside the scenes folder. The
 * version folder stays in the name, so a new version is a new file.
 */
export function localFileName(file: RemoteFile): string {
  const name = file.path
    .split('/')
    .filter((part) => part !== '' && part !== '.' && part !== '..')
    .join('_')
    .replace(/[^A-Za-z0-9._-]/g, '');
  return name || 'scene';
}

/** A file size as a short label: `9.4 MB`, or `0.6 MB` for a small one. */
export function formatMegabytes(bytes: number): string {
  const mb = Math.max(0, bytes) / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/**
 * How far a download is, from 0 to 1. The server's total is used when it sends
 * one; otherwise the expected size from the catalog. Never above 1.
 */
export function downloadFraction(written: number, total: number, expected: number): number {
  const whole = total > 0 ? total : expected;
  if (!(whole > 0) || !(written > 0)) return 0;
  return Math.min(1, written / whole);
}

/** Whether a finished download is the whole file, judged by its size. */
export function isCompleteDownload(size: number | null | undefined, file: RemoteFile): boolean {
  return typeof size === 'number' && size === file.bytes;
}
