import type { VideoId } from '@/components/wickglow/domain/video-ids';

// The videos in assets/backgrounds/videos. Metro needs literal require paths,
// so each file is listed by hand and keyed by its id. `thumb` is a small still
// frame shown in the scene picker, so the grid never has to decode video.
export const VIDEOS: { id: VideoId; name: string; source: number; thumb: number }[] = [
  { id: 'classic', name: 'Classic', source: require('../../../../assets/backgrounds/videos/270983_medium.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/classic.jpg') },
  { id: 'cyberpunk_desk', name: 'Cyberpunk Desk', source: require('../../../../assets/backgrounds/videos/cyberpunk_desk.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/cyberpunk_desk.jpg') },
  { id: 'frog_lily_pond', name: 'Frog Pond', source: require('../../../../assets/backgrounds/videos/frog_lily_pond.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/frog_lily_pond.jpg') },
  { id: 'snowy_sled', name: 'Snowy Sled', source: require('../../../../assets/backgrounds/videos/snowy_sled.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/snowy_sled.jpg') },
  { id: 'mossy_branch', name: 'Mossy Branch', source: require('../../../../assets/backgrounds/videos/mossy_branch.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/mossy_branch.jpg') },
  { id: 'night_hills', name: 'Night Hills', source: require('../../../../assets/backgrounds/videos/night_hills.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/night_hills.jpg') },
];
