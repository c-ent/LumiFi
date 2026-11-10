import { AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect } from 'react';
import { AmbientPlayback } from './use-ambient';

/**
 * Makes audio keep playing with the screen locked, and decides what the
 * lock-screen / notification media card shows.
 *
 * Only ONE player can own that card at a time, so we pick one: the music
 * player while music plays, otherwise the first ambient sound that is audible.
 */

// Hide the seek buttons: skipping around in a lofi track isn't useful here.
const LOCK_SCREEN_OPTIONS = { showSeekForward: false, showSeekBackward: false };
// Ambient loops have no duration, so mark them as a live stream (no progress bar).
const AMBIENT_LOCK_SCREEN_OPTIONS = { ...LOCK_SCREEN_OPTIONS, isLiveStream: true };

export function useBackgroundAudio(
  music: AudioPlayer,
  musicPlaying: boolean,
  trackTitle: string,
  trackArtist: string,
  ambient: AmbientPlayback,
) {
  // One-time global audio setup. `shouldPlayInBackground` is the key flag for
  // screen-off playback; `allowsRecording: false` keeps the microphone
  // permission out of the app (Wickglow never records).
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
    });
  }, []);

  const { rain, cafe, fire, wind, clock, brown, forest, keyboard, waves, levels } = ambient;

  // Re-pick who owns the lock-screen card whenever music or a level changes.
  useEffect(() => {
    const voices = [
      { player: rain, level: levels.rain },
      { player: cafe, level: levels.cafe },
      { player: fire, level: levels.fire },
      { player: wind, level: levels.wind },
      { player: clock, level: levels.clock },
      { player: brown, level: levels.brown },
      { player: forest, level: levels.forest },
      { player: keyboard, level: levels.keyboard },
      { player: waves, level: levels.waves },
    ];
    const ambientHolder = voices.find((voice) => voice.level > 0)?.player ?? null;
    const holder = musicPlaying ? music : ambientHolder;
    if (!holder) {
      music.clearLockScreenControls();
      for (const voice of voices) voice.player.clearLockScreenControls();
      return;
    }
    holder.setActiveForLockScreen(
      true,
      musicPlaying
        ? { title: trackTitle, artist: trackArtist }
        : { title: 'Ambient', artist: 'Wickglow' },
      musicPlaying ? LOCK_SCREEN_OPTIONS : AMBIENT_LOCK_SCREEN_OPTIONS,
    );
  }, [brown, cafe, clock, fire, forest, keyboard, levels.brown, levels.cafe, levels.clock, levels.fire, levels.forest, levels.keyboard, levels.rain, levels.waves, levels.wind, music, musicPlaying, rain, trackArtist, trackTitle, waves, wind]);
}
