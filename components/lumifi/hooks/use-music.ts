import { musicTracks, sessionEndChime } from '@/components/music-tracks';
import { LOWERED_MUSIC_RATIO, musicLevelAtSessionEnd, MusicEnd } from '@/src/core/session-end';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useMusic(volume: number) {
  const [trackIndex, setTrackIndex] = useState(0);
  const [gain, setGain] = useState(1);
  const player = useAudioPlayer(musicTracks[0].uri, { keepAudioSessionActive: true });
  const chime = useAudioPlayer(sessionEndChime);
  const status = useAudioPlayerStatus(player);
  const replaced = useRef(false);
  const playingRef = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    playingRef.current = status.playing;
  }, [status.playing]);

  const clearFade = useCallback(() => {
    if (fadeTimer.current) {
      clearInterval(fadeTimer.current);
      fadeTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearFade(), [clearFade]);

  useEffect(() => {
    // expo-audio exposes volume as a mutable property on the native player.
    // eslint-disable-next-line react-hooks/immutability
    player.volume = Math.max(0, Math.min(1, volume * gain));
  }, [gain, player, volume]);

  useEffect(() => {
    if (!replaced.current) {
      replaced.current = true;
      return;
    }
    player.replace(musicTracks[trackIndex].uri);
  }, [player, trackIndex]);

  const nextTrack = useCallback(() => {
    setTrackIndex((index) => (index + 1) % musicTracks.length);
  }, []);

  const prevTrack = useCallback(() => {
    setTrackIndex((index) => (index === 0 ? musicTracks.length - 1 : index - 1));
  }, []);

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (next) => {
      if (next.didJustFinish) nextTrack();
    });
    return () => subscription.remove();
  }, [player, nextTrack]);

  const toggleMusic = useCallback(() => {
    if (status.playing) player.pause();
    else player.play();
  }, [player, status.playing]);

  const play = useCallback(() => {
    if (!playingRef.current) player.play();
  }, [player]);

  const selectTrack = useCallback((index: number) => {
    if (index === trackIndex) {
      player.play();
      return;
    }
    setTrackIndex(index);
    player.replace(musicTracks[index].uri);
    player.play();
  }, [player, trackIndex]);

  const restoreMusic = useCallback(() => {
    clearFade();
    setGain(1);
  }, [clearFade]);

  const onSessionEnd = useCallback((setting: MusicEnd) => {
    if (!playingRef.current) return;
    clearFade();
    if (setting === 'keep') {
      setGain(1);
      return;
    }
    if (setting === 'lower') {
      setGain(LOWERED_MUSIC_RATIO);
      return;
    }
    if (volume <= 0) {
      player.pause();
      return;
    }
    const started = Date.now();
    const from = volume;
    fadeTimer.current = setInterval(() => {
      const step = musicLevelAtSessionEnd('fade', from, Date.now() - started);
      setGain(from === 0 ? 0 : step.level / from);
      if (!step.stop) return;
      player.pause();
      clearFade();
      setGain(1);
    }, 100);
  }, [clearFade, player, volume]);

  const playChime = useCallback(() => {
    void chime.seekTo(0).then(() => {
      chime.play();
    });
  }, [chime]);

  const track = musicTracks[trackIndex];

  return {
    musicPlaying: status.playing,
    trackIndex,
    trackTitle: track.title,
    trackArtist: track.artist,
    toggleMusic,
    play,
    nextTrack,
    prevTrack,
    selectTrack,
    restoreMusic,
    onSessionEnd,
    playChime,
    player,
  };
}
