import type { VideoId } from '@/components/wickglow/domain/video-ids';

// The videos in assets/backgrounds/videos. Metro needs literal require paths,
// so each file is listed by hand and keyed by its id. `thumb` is a small still
// frame shown in the scene picker, so the grid never has to decode video.
export const VIDEOS: { id: VideoId; name: string; source: number; thumb: number }[] = [
  { id: 'classic', name: 'Classic', source: require('../../../../assets/backgrounds/videos/270983_medium.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/classic.jpg') },
  { id: 'flower_hill_girl', name: 'Flower Hill', source: require('../../../../assets/backgrounds/videos/flower_hill_girl.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/flower_hill_girl.jpg') },
  { id: 'cyberpunk_desk', name: 'Cyberpunk Desk', source: require('../../../../assets/backgrounds/videos/cyberpunk_desk.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/cyberpunk_desk.jpg') },
  { id: 'rainy_cottage', name: 'Rainy Cottage', source: require('../../../../assets/backgrounds/videos/rainy_cottage.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/rainy_cottage.jpg') },
  { id: 'frog_lily_pond', name: 'Frog Pond', source: require('../../../../assets/backgrounds/videos/frog_lily_pond.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/frog_lily_pond.jpg') },
  { id: 'snowy_sled', name: 'Snowy Sled', source: require('../../../../assets/backgrounds/videos/snowy_sled.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/snowy_sled.jpg') },
  { id: 'blossom_grove', name: 'Blossom Grove', source: require('../../../../assets/backgrounds/videos/blossom_grove.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/blossom_grove.jpg') },
  { id: 'hilltop_picnic', name: 'Hilltop Picnic', source: require('../../../../assets/backgrounds/videos/hilltop_picnic.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/hilltop_picnic.jpg') },
  { id: 'mossy_branch', name: 'Mossy Branch', source: require('../../../../assets/backgrounds/videos/mossy_branch.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/mossy_branch.jpg') },
  { id: 'night_hills', name: 'Night Hills', source: require('../../../../assets/backgrounds/videos/night_hills.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/night_hills.jpg') },
  { id: 'pixel_coder', name: 'Pixel Coder', source: require('../../../../assets/backgrounds/videos/pixel_coder.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/pixel_coder.jpg') },
  { id: 'moonlit_city', name: 'Moonlit City', source: require('../../../../assets/backgrounds/videos/moonlit_city.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/moonlit_city.jpg') },
];
