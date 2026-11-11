import type { VideoId } from '@/components/wickglow/domain/video-ids';

// The videos in assets/backgrounds/videos. Metro needs literal require paths,
// so each file is listed by hand and keyed by its id. `thumb` is a small still
// frame shown in the scene picker, so the grid never has to decode video.
export const VIDEOS: { id: VideoId; name: string; source: number; thumb: number }[] = [
  { id: 'classic', name: 'Classic', source: require('../../../../assets/backgrounds/videos/270983_medium.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/classic.jpg') },
  { id: 'desktop_windows', name: 'Desktop Windows', source: require('../../../../assets/backgrounds/videos/desktop_windows.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/desktop_windows.jpg') },
  { id: 'cherry_blossom_cottage', name: 'Cherry Blossom Cottage', source: require('../../../../assets/backgrounds/videos/cherry_blossom_cottage.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/cherry_blossom_cottage.jpg') },
  { id: 'flower_hill_girl', name: 'Flower Hill', source: require('../../../../assets/backgrounds/videos/flower_hill_girl.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/flower_hill_girl.jpg') },
  { id: 'cyberpunk_desk', name: 'Cyberpunk Desk', source: require('../../../../assets/backgrounds/videos/cyberpunk_desk.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/cyberpunk_desk.jpg') },
  { id: 'rainy_cottage', name: 'Rainy Cottage', source: require('../../../../assets/backgrounds/videos/rainy_cottage.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/rainy_cottage.jpg') },
  { id: 'cozy_lofi_room', name: 'Cozy Lofi Room', source: require('../../../../assets/backgrounds/videos/cozy_lofi_room.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/cozy_lofi_room.jpg') },
  { id: 'turtle_lily_pond', name: 'Turtle Pond', source: require('../../../../assets/backgrounds/videos/turtle_lily_pond.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/turtle_lily_pond.jpg') },
  { id: 'twilight_skyline', name: 'Twilight Skyline', source: require('../../../../assets/backgrounds/videos/twilight_skyline.mp4'), thumb: require('../../../../assets/backgrounds/thumbnails/twilight_skyline.jpg') },
];
