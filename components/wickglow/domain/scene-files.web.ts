// Web: remote background videos are not downloaded. The browser streams each
// one from the site's own `/scenes/` folder (public/scenes) and keeps it in its
// cache, so every remote scene is playable straight away.

import { RemoteFile, SCENE_WEB_PATH, remoteUrl } from '@/src/core/remote-scenes';

/** Whether scenes are downloaded to the device (true) or streamed (web). */
export const scenesDownload = false;

/** The same-site URL the browser streams the scene from. */
export function sceneFileUri(file: RemoteFile): string | null {
  return remoteUrl(file, SCENE_WEB_PATH);
}

/** Never called on web, since nothing is downloaded. */
export async function downloadSceneFile(): Promise<void> {
  throw new Error('Scenes are streamed on web');
}
