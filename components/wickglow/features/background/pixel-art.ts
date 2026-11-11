import type { PixelArtId } from '@/components/wickglow/domain/pixel-art-ids';

// The pixel-art videos in assets/backgrounds/pixel-art. Metro needs literal
// require paths, so each file is listed by hand and keyed by its id. `thumb` is
// a small still frame (taken 1 s in) shown in the scene picker, so the grid
// never has to decode the 4K video.
export const PIXEL_ART: { id: PixelArtId; name: string; source: number; thumb: number }[] = [
  { id: 'aurora', name: 'Aurora', source: require('../../../../assets/backgrounds/pixel-art/aurora_4k.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/pixel_aurora.jpg') },
  { id: 'meadow', name: 'Meadow', source: require('../../../../assets/backgrounds/pixel-art/meadow_4k.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/pixel_meadow.jpg') },
  { id: 'mountain', name: 'Mountain', source: require('../../../../assets/backgrounds/pixel-art/mountain_4k.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/pixel_mountain.jpg') },
];
