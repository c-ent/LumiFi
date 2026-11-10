import type { PixelArtId } from '@/components/wickglow/domain/pixel-art-ids';

// The pixel-art videos in assets/backgrounds/pixel-art. Metro needs literal
// require paths, so each file is listed by hand and keyed by its id.
export const PIXEL_ART: { id: PixelArtId; name: string; source: number }[] = [
  { id: 'aurora', name: 'Aurora', source: require('../../../../assets/backgrounds/pixel-art/aurora_4k.mp4') },
  { id: 'meadow', name: 'Meadow', source: require('../../../../assets/backgrounds/pixel-art/meadow_4k.mp4') },
  { id: 'mountain', name: 'Mountain', source: require('../../../../assets/backgrounds/pixel-art/mountain_4k.mp4') },
];
