import type { PixelArtId } from '@/components/wickglow/domain/pixel-art-ids';
import type { SceneSource } from '@/components/wickglow/features/background/scene-downloads';

// The pixel-art videos. They live on the scene host (src/core/remote-scenes.ts)
// and are downloaded on Android or streamed on web, which keeps the app small.
// The files are in public/scenes/<path>; `bytes` must be the exact file size.
// `thumb` is a small still frame (taken 1 s in) shown in the scene picker,
// always bundled, so the grid never has to decode or download the 4K video.
export const PIXEL_ART: { id: PixelArtId; name: string; source: SceneSource; thumb: number }[] = [
  { id: 'aurora', name: 'Aurora', source: { path: 'v1/pixel-art/aurora_4k.mp4', bytes: 2375576 }, thumb: require('../../../../assets/backgrounds/thumbnails/pixel_aurora.jpg') },
  { id: 'meadow', name: 'Meadow', source: { path: 'v1/pixel-art/meadow_4k.mp4', bytes: 4748455 }, thumb: require('../../../../assets/backgrounds/thumbnails/pixel_meadow.jpg') },
];
