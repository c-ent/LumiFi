import React from 'react';
import type { PixelArtId } from '@/components/wickglow/domain/pixel-art-ids';
import { PIXEL_ART } from '@/components/wickglow/features/background/pixel-art';
import { VideoBackground } from '@/components/wickglow/features/background/video-background';

/**
 * One pixel-art video, played by the same muted, looping player as the plain
 * video background (pauses off-screen and under reduced motion, with the same
 * dark layer). Keyed by id so switching pictures builds a fresh player.
 * `onReady` fires on the first frame.
 */
export function PixelBackground({ id, onReady }: { id: PixelArtId; onReady?: () => void }) {
  const art = PIXEL_ART.find((item) => item.id === id);
  if (!art) return null;
  return <VideoBackground key={art.id} source={art.source} onReady={onReady} />;
}
