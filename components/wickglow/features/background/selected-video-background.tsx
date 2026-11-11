import React from 'react';
import { VIDEOS } from '@/components/wickglow/features/background/video-art';
import { VideoBackground } from '@/components/wickglow/features/background/video-background';
import { useWickglow } from '@/components/wickglow/logic';

/**
 * The chosen video background, played by the shared muted, looping player.
 * Keyed by id so switching videos builds a fresh player. Falls back to the
 * classic video if the stored id is somehow not in the list.
 */
export function SelectedVideoBackground() {
  const { videoBg } = useWickglow();
  const video = VIDEOS.find((item) => item.id === videoBg) ?? VIDEOS[0];
  return <VideoBackground key={video.id} source={video.source} />;
}
