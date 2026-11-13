import React from 'react';
import type { PixelArtId } from '@/components/wickglow/domain/pixel-art-ids';
import { PIXEL_ART } from '@/components/wickglow/features/background/pixel-art';
import { useSceneSource } from '@/components/wickglow/features/background/scene-downloads';
import { CLASSIC_VIDEO } from '@/components/wickglow/features/background/video-art';
import { VideoBackground } from '@/components/wickglow/features/background/video-background';

/**
 * One pixel-art video, played by the same muted, looping player as the plain
 * video background (pauses off-screen and under reduced motion, with the same
 * dark layer). Keyed by what it plays, so switching pictures builds a fresh
 * player. When the picture is not on this device yet, the bundled Classic video
 * plays instead. `onReady` fires on the first frame.
 */
export function PixelBackground({ id, onReady }: { id: PixelArtId; onReady?: () => void }) {
  const art = PIXEL_ART.find((item) => item.id === id) ?? PIXEL_ART[0];
  const playable = useSceneSource(art.source);
  const source = playable ?? CLASSIC_VIDEO;
  return <VideoBackground key={playable === null ? 'classic' : art.id} source={source} onReady={onReady} />;
}
