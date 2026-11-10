import React from 'react';
import { PIXEL_ART } from '@/components/wickglow/features/background/pixel-art';
import { VideoBackground } from '@/components/wickglow/features/background/video-background';
import { useWickglow } from '@/components/wickglow/logic';

/**
 * The chosen pixel-art video, played by the same muted, looping player as the
 * plain video background (pauses off-screen and under reduced motion, with the
 * same dark layer). Keyed by id so switching pictures builds a fresh player.
 */
export function PixelBackground() {
  const { pixelBg } = useWickglow();
  const art = PIXEL_ART.find((item) => item.id === pixelBg);
  if (!art) return null;
  return <VideoBackground key={art.id} source={art.source} />;
}
