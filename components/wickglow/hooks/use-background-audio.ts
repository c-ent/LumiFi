import { AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect } from 'react';
import { AMBIENT_KEYS, AmbientMix, firstAudible } from '@/src/core/ambient';
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
  mix: AmbientMix,
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

  const { playerFor } = ambient;
  // The ambient sound that would hold the card. Only a change of this, not
  // every slider step, needs the card re-picked.
  const audible = firstAudible(mix);

  // Re-pick who owns the lock-screen card whenever music or the audible sound
  // changes. This effect runs after the one in `useAmbient` that builds a
  // player for a level above zero, so the audible sound's player exists by now.
  useEffect(() => {
    const ambientHolder = audible ? playerFor(audible) : null;
    const holder = musicPlaying ? music : ambientHolder;
    if (!holder) {
      music.clearLockScreenControls();
      for (const key of AMBIENT_KEYS) playerFor(key)?.clearLockScreenControls();
      return;
    }
    holder.setActiveForLockScreen(
      true,
      musicPlaying
        ? { title: trackTitle, artist: trackArtist }
        : { title: 'Ambient', artist: 'Wickglow' },
      musicPlaying ? LOCK_SCREEN_OPTIONS : AMBIENT_LOCK_SCREEN_OPTIONS,
    );
  }, [audible, music, musicPlaying, playerFor, trackArtist, trackTitle]);
}
