import React from 'react';
import type { VideoId } from '@/components/wickglow/domain/video-ids';
import { useSceneSource } from '@/components/wickglow/features/background/scene-downloads';
import { CLASSIC_VIDEO, VIDEOS } from '@/components/wickglow/features/background/video-art';
import { VideoBackground } from '@/components/wickglow/features/background/video-background';

/**
 * One video background, played by the shared muted, looping player. Keyed by
 * what it plays, so switching videos builds a fresh player. Falls back to the
 * bundled Classic video when the id is not in the list, or when the picked video
 * is remote and not on this device (for example after a reinstall, or a choice
 * saved on another layout). `onReady` fires on the first frame.
 */
export function SelectedVideoBackground({ id, onReady }: { id: VideoId; onReady?: () => void }) {
  const video = VIDEOS.find((item) => item.id === id) ?? VIDEOS[0];
  const playable = useSceneSource(video.source);
  const source = playable ?? CLASSIC_VIDEO;
  return <VideoBackground key={playable === null ? 'classic' : video.id} source={source} onReady={onReady} />;
}
