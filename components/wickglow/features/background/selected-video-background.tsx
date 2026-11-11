import React from 'react';
import type { VideoId } from '@/components/wickglow/domain/video-ids';
import { VIDEOS } from '@/components/wickglow/features/background/video-art';
import { VideoBackground } from '@/components/wickglow/features/background/video-background';

/**
 * One video background, played by the shared muted, looping player. Keyed by
 * id so switching videos builds a fresh player. Falls back to the classic
 * video if the id is somehow not in the list. `onReady` fires on the first frame.
 */
export function SelectedVideoBackground({ id, onReady }: { id: VideoId; onReady?: () => void }) {
  const video = VIDEOS.find((item) => item.id === id) ?? VIDEOS[0];
  return <VideoBackground key={video.id} source={video.source} onReady={onReady} />;
}
