import React, { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useReducedMotion } from '@/components/wickglow/hooks/use-reduced-motion';

// "Video by MrBones03 from Pixabay" (Pixabay Content License, no attribution needed).
const DEFAULT_SOURCE: number = require('../../../../assets/backgrounds/videos/270983_medium.mp4');

/**
 * A muted, looping video that fills its parent, used as an alternative to the
 * gradient. It plays only while the app is in the foreground and the system is
 * not asking for reduced motion (then it holds the first frame), so it costs
 * nothing on a locked screen. It has no audio and ignores touches.
 * `onReady` fires once the first frame is on screen, so a crossfade can wait
 * for it instead of fading in a black box.
 */
export function VideoBackground({ source = DEFAULT_SOURCE, onReady }: { source?: number; onReady?: () => void }) {
  const reduced = useReducedMotion();
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    const sync = (state: string | null | undefined) => {
      if (state === 'active' && !reduced) player.play();
      else player.pause();
    };
    sync(AppState.currentState);
    const sub = AppState.addEventListener('change', sync);
    return () => sub.remove();
  }, [player, reduced]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        onFirstFrameRender={onReady}
      />
      {/* Slightly dark, see-through layer so the timer and panels stay readable. */}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Explicit size: on web the view is a bare <video>, which ignores top/right/
  // bottom/left and draws at the file's own size. With a 100% box, `cover`
  // scales the picture to fill the screen and crops the overflow, never stretches.
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 3, 15, 0.42)' },
});
