import { AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect } from 'react';
import { AmbientPlayback } from './use-ambient';

const LOCK_SCREEN_OPTIONS = { showSeekForward: false, showSeekBackward: false };
const AMBIENT_LOCK_SCREEN_OPTIONS = { ...LOCK_SCREEN_OPTIONS, isLiveStream: true };

export function useBackgroundAudio(
  music: AudioPlayer,
  musicPlaying: boolean,
  trackTitle: string,
  trackArtist: string,
  ambient: AmbientPlayback,
) {
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
    });
  }, []);

  const { rain, cafe, fire, wind, clock, brown, forest, keyboard, waves, levels } = ambient;

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
        : { title: 'Ambient', artist: 'LumiFi' },
      musicPlaying ? LOCK_SCREEN_OPTIONS : AMBIENT_LOCK_SCREEN_OPTIONS,
    );
  }, [brown, cafe, clock, fire, forest, keyboard, levels.brown, levels.cafe, levels.clock, levels.fire, levels.forest, levels.keyboard, levels.rain, levels.waves, levels.wind, music, musicPlaying, rain, trackArtist, trackTitle, waves, wind]);
}
