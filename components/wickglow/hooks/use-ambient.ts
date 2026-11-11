import { AMBIENT_SOURCES } from '@/components/ambient-tracks';
import { AMBIENT_KEYS, AmbientKey, AmbientMix } from '@/src/core/ambient';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * The ambient sound mixer: one looping player per sound in `src/core/ambient.ts`,
 * each at its own slider level.
 *
 * Each sound needs its own player so volumes mix independently, but a player
 * is only built the first time its level goes above zero. Building all of them
 * at launch loaded sources nobody had asked to hear. Once built, a player is
 * kept and paused at zero, so a drag through zero does not rebuild it, and all
 * of them are released when the provider unmounts.
 *
 * Levels are slider values, 0..100, the same as the save. This file is the one
 * place they become a 0..1 volume.
 */

// What the hook returns: `sync` to push a level now, and `playerFor` so other
// code can put a sound on the lock screen.
export interface AmbientPlayback {
  sync: (key: AmbientKey, level: number) => void;
  /** The player for a sound, or null when it has never been turned up. */
  playerFor: (key: AmbientKey) => AudioPlayer | null;
}

// updateInterval: status events once a second is plenty for a loop.
// keepAudioSessionActive: keeps the OS audio session alive so sound continues
// with the screen locked (this is what makes background playback work).
const PLAYER_OPTIONS = { updateInterval: 1000, keepAudioSessionActive: true };

type Voices = Partial<Record<AmbientKey, AudioPlayer>>;

export function useAmbient(mix: AmbientMix): AmbientPlayback {
  // The players built so far. A ref, not state: building one must not re-render.
  const voices = useRef<Voices>({});

  // A ref mirrors `mix` so the web listener below always reads the latest
  // values without having to re-subscribe on every slider change.
  const mixRef = useRef(mix);
  useEffect(() => {
    mixRef.current = mix;
  }, [mix]);

  // Apply one slider value to the audio immediately (used while dragging).
  const sync = useCallback((key: AmbientKey, level: number) => {
    applyVoice(voices.current, key, level);
  }, []);

  const playerFor = useCallback((key: AmbientKey) => voices.current[key] ?? null, []);

  // Keep every sound in step with its level whenever the mix changes. This
  // also starts the sounds restored from a saved mix. The mix comes from the
  // saved state, so it is a new object only when a slider moved.
  useEffect(() => {
    for (const key of AMBIENT_KEYS) applyVoice(voices.current, key, mix[key]);
  }, [mix]);

  // Release every player on unmount. `createAudioPlayer` does not release on
  // its own the way the `useAudioPlayer` hook does.
  useEffect(() => {
    const built = voices;
    return () => {
      const players = built.current;
      built.current = {};
      for (const key of AMBIENT_KEYS) {
        try {
          players[key]?.remove();
        } catch {
          // Already released with the native module: nothing left to free.
        }
      }
    };
  }, []);

  // Web only: browsers block audio until the user interacts with the page, so
  // a sound restored from a saved level stays silent. The first click/tap
  // anywhere starts every sound whose level is above zero.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const kick = () => {
      const current = mixRef.current;
      for (const key of AMBIENT_KEYS) {
        const player = voices.current[key];
        if (player && current[key] > 0 && !player.playing) player.play();
      }
    };
    window.addEventListener('pointerdown', kick);
    return () => window.removeEventListener('pointerdown', kick);
  }, []);

  return { sync, playerFor };
}

// Set volume, then play if audible or pause if silent. A sound at zero that
// was never turned up has no player, and none is built for it.
function applyVoice(voices: Voices, key: AmbientKey, level: number) {
  let player = voices[key];
  if (!player) {
    if (level <= 0) return;
    player = createAudioPlayer(AMBIENT_SOURCES[key], PLAYER_OPTIONS);
    voices[key] = player;
  }
  player.loop = true;
  player.volume = Math.max(0, Math.min(1, level / 100));
  if (level <= 0) {
    if (player.playing) player.pause();
    return;
  }
  if (!player.playing) player.play();
}
