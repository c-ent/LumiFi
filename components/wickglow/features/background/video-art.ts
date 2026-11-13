import type { VideoId } from '@/components/wickglow/domain/video-ids';
import type { SceneSource } from '@/components/wickglow/features/background/scene-downloads';

// The video backgrounds. Classic is bundled (it is the default and the
// fallback); the others live on the scene host (src/core/remote-scenes.ts) and
// are downloaded on Android or streamed on web, which keeps the app small. The
// files are in public/scenes/<path>; `bytes` must be the exact file size.
// Metro needs literal require paths, so each bundled file is listed by hand.
// `thumb` is a small still frame shown in the scene picker, always bundled, so
// the grid never has to decode or download video.
export const VIDEOS: { id: VideoId; name: string; source: SceneSource; thumb: number }[] = [
  { id: 'classic', name: 'Classic', source: require('../../../../assets/backgrounds/videos/270983_medium.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/classic.jpg') },
  { id: 'cyberpunk_desk', name: 'Cyberpunk Desk', source: { path: 'v1/videos/cyberpunk_desk.mp4', bytes: 572638 }, thumb: require('../../../../assets/backgrounds/thumbnails/cyberpunk_desk.jpg') },
  { id: 'frog_lily_pond', name: 'Frog Pond', source: { path: 'v1/videos/frog_lily_pond.mp4', bytes: 9847972 }, thumb: require('../../../../assets/backgrounds/thumbnails/frog_lily_pond.jpg') },
  { id: 'snowy_sled', name: 'Snowy Sled', source: { path: 'v1/videos/snowy_sled.mp4', bytes: 4168013 }, thumb: require('../../../../assets/backgrounds/thumbnails/snowy_sled.jpg') },
  { id: 'mossy_branch', name: 'Mossy Branch', source: { path: 'v1/videos/mossy_branch.mp4', bytes: 6860109 }, thumb: require('../../../../assets/backgrounds/thumbnails/mossy_branch.jpg') },
  { id: 'night_hills', name: 'Night Hills', source: { path: 'v1/videos/night_hills.mp4', bytes: 3401590 }, thumb: require('../../../../assets/backgrounds/thumbnails/night_hills.jpg') },
];

/** The bundled Classic video, played when a picked scene is not on the device. */
export const CLASSIC_VIDEO: number = require('../../../../assets/backgrounds/videos/270983_medium.mp4');
