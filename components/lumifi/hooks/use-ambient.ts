import { ambientBrown, ambientCafe, ambientClock, ambientFire, ambientForest, ambientKeyboard, ambientRain, ambientWaves, ambientWind } from '@/components/ambient-tracks';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * The ambient sound mixer: nine looping background sounds (rain, cafe, ...),
 * each with its own volume from 0 to 1.
 *
 * Why nine separate `useAudioPlayer` calls: React hooks can't be called in a
 * loop with a changing count, and each sound needs its own player so volumes
 * mix independently. A volume of 0 means "paused", so unused sounds cost nothing.
 */

// The volume of each sound, 0..1. This is what gets saved to storage.
export interface AmbientLevels {
  rain: number;
  cafe: number;
  fire: number;
  wind: number;
  clock: number;
  brown: number;
  forest: number;
  keyboard: number;
  waves: number;
}

export type AmbientKey = keyof AmbientLevels;

export const AMBIENT_KEYS: AmbientKey[] = ['rain', 'cafe', 'fire', 'wind', 'clock', 'brown', 'forest', 'keyboard', 'waves'];

// What the hook returns: the raw players (so other code can pause them or put
// them on the lock screen), the current levels, and `sync` to push a volume now.
export interface AmbientPlayback {
  rain: AudioPlayer;
  cafe: AudioPlayer;
  fire: AudioPlayer;
  wind: AudioPlayer;
  clock: AudioPlayer;
  brown: AudioPlayer;
  forest: AudioPlayer;
  keyboard: AudioPlayer;
  waves: AudioPlayer;
  levels: AmbientLevels;
  sync: (key: AmbientKey, gain: number) => void;
}

// updateInterval: status events once a second is plenty for a loop.
// keepAudioSessionActive: keeps the OS audio session alive so sound continues
// with the screen locked (this is what makes background playback work).
const PLAYER_OPTIONS = { updateInterval: 1000, keepAudioSessionActive: true };

export function useAmbient(levels: AmbientLevels): AmbientPlayback {
  const rain = useAudioPlayer(ambientRain, PLAYER_OPTIONS);
  const cafe = useAudioPlayer(ambientCafe, PLAYER_OPTIONS);
  const fire = useAudioPlayer(ambientFire, PLAYER_OPTIONS);
  const wind = useAudioPlayer(ambientWind, PLAYER_OPTIONS);
  const clock = useAudioPlayer(ambientClock, PLAYER_OPTIONS);
  const brown = useAudioPlayer(ambientBrown, PLAYER_OPTIONS);
  const forest = useAudioPlayer(ambientForest, PLAYER_OPTIONS);
  const keyboard = useAudioPlayer(ambientKeyboard, PLAYER_OPTIONS);
  const waves = useAudioPlayer(ambientWaves, PLAYER_OPTIONS);
  useAmbientVoice(rain, levels.rain);
  useAmbientVoice(cafe, levels.cafe);
  useAmbientVoice(fire, levels.fire);
  useAmbientVoice(wind, levels.wind);
  useAmbientVoice(clock, levels.clock);
  useAmbientVoice(brown, levels.brown);
  useAmbientVoice(forest, levels.forest);
  useAmbientVoice(keyboard, levels.keyboard);
  useAmbientVoice(waves, levels.waves);

  const voices = useMemo(
    () => ({ rain, cafe, fire, wind, clock, brown, forest, keyboard, waves }),
    [brown, cafe, clock, fire, forest, keyboard, rain, waves, wind],
  );

  // A ref mirrors `levels` so the web listener below always reads the latest
  // values without having to re-subscribe on every slider change.
  const levelsRef = useRef(levels);
  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  // Apply one slider value to the audio immediately (used while dragging).
  const sync = useCallback((key: AmbientKey, gain: number) => {
    applyVoice(voices[key], gain);
  }, [voices]);

  // Web only: browsers block audio until the user interacts with the page, so
  // a sound restored from a saved level stays silent. The first click/tap
  // anywhere starts every sound whose level is above zero.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const kick = () => {
      const current = levelsRef.current;
      for (const key of AMBIENT_KEYS) resumeVoice(voices[key], current[key]);
    };
    window.addEventListener('pointerdown', kick);
    return () => window.removeEventListener('pointerdown', kick);
  }, [voices]);

  return { rain, cafe, fire, wind, clock, brown, forest, keyboard, waves, levels, sync };
}

// Keeps one player in step with its level whenever the level changes.
function useAmbientVoice(player: AudioPlayer, gain: number) {
  useEffect(() => {
    applyVoice(player, gain);
  }, [gain, player]);
}

// Set volume, then play if audible or pause if silent.
function applyVoice(player: AudioPlayer, gain: number) {
  player.loop = true;
  player.volume = clampGain(gain);
  if (gain <= 0) {
    if (player.playing) player.pause();
    return;
  }
  if (!player.playing) player.play();
}

// Start a sound that should be audible but isn't playing (see the web kick above).
function resumeVoice(player: AudioPlayer, gain: number) {
  if (gain <= 0 || player.playing) return;
  player.play();
}

function clampGain(gain: number) {
  return Math.max(0, Math.min(1, gain));
}
