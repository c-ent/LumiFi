import { musicTracks, sessionEndChime } from '@/components/music-tracks';
import { ownTrackExists, ownTrackUri } from '@/components/wickglow/domain/own-music';
import { preloadTrack } from '@/components/wickglow/domain/preload-track';
import { mergePlaylist, nextPlayableIndex, OwnTrack } from '@/src/core/own-tracks';
import { LOWERED_MUSIC_RATIO, musicLevelAtSessionEnd, MusicEnd } from '@/src/core/session-end';
import { type AudioPlayer, clearPreloadedSource, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Loads a new source and puts the levels back. On web `replace` builds a fresh
 * media element at full volume with loop unset, so without this a manual pick
 * or an automatic advance would play at full volume.
 */
function replaceWithLevels(player: AudioPlayer, uri: number | string, levels: { volume: number; gain: number; loop: boolean }) {
  player.replace(uri);
  player.volume = Math.max(0, Math.min(1, levels.volume * levels.gain));
  player.loop = levels.loop;
}

/**
 * The local music player: one `expo-audio` player that walks a playlist of
 * bundled lofi tracks plus the user's own files.
 *
 * Streaming links (Spotify/YouTube/...) never go through here; they play in
 * that service's own player. See stream-stage.tsx.
 *
 * `volume` is the user's slider (0..1). `gain` is a separate multiplier used
 * only by the session-end "lower" / "fade out" behavior, so the slider value
 * itself never changes.
 */
export function useMusic(volume: number, ownTracks: OwnTrack[], loop = false) {
  // Bundled tracks stay in front, own files after them. `musicTracks` is a
  // module constant, so the playlist only changes when the own list does.
  // The stored uri can go stale (iOS moves the app container on update), so
  // each own file's uri is rebuilt from its id.
  const playlist = useMemo(
    () => mergePlaylist(
      musicTracks,
      ownTracks.map((track) => ({ ...track, uri: ownTrackUri(track.id) ?? '' })),
    ),
    [ownTracks],
  );

  // The cursor is the entry's key, not its index: removing an own file shifts
  // later own indices, and a key lookup follows the right track across that.
  const [selectedKey, setSelectedKey] = useState(() => playlist[0]?.key ?? '');
  const [missingKeys, setMissingKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [gain, setGain] = useState(1);

  const foundIndex = playlist.findIndex((entry) => entry.key === selectedKey);
  const trackIndex = foundIndex >= 0 ? foundIndex : 0;
  const entry = playlist[trackIndex];

  // One player for the whole playlist. The initial source is fixed so the
  // player is created once; every later track goes in through `replace`.
  const player = useAudioPlayer(musicTracks[0].uri, { keepAudioSessionActive: true });
  const chime = useAudioPlayer(sessionEndChime);
  const status = useAudioPlayerStatus(player);
  // Which entry's source is currently loaded, so the effect does not replace a
  // source selectTrack or a skip has already replaced.
  const loadedKey = useRef<string | null>(playlist[0]?.key ?? null);
  const playingRef = useRef(false);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // The web preload effect reads these from the ref rather than its deps, so a
  // volume drag does not re-run it and rebuild the media element on every tick.
  const levelRef = useRef({ volume, gain, loop });

  useEffect(() => {
    playingRef.current = status.playing;
  }, [status.playing]);

  useEffect(() => {
    levelRef.current = { volume, gain, loop };
  }, [gain, loop, volume]);

  // Every replace goes through `replaceWithLevels` (below), so the new source
  // keeps the current volume, gain and loop.
  const replaceSource = useCallback((uri: number | string) => {
    replaceWithLevels(player, uri, levelRef.current);
  }, [player]);

  // A file can disappear outside the app (deleted, or a reclaimed copy). The
  // check is synchronous and native, so it is cached per URI and invalidated
  // whenever the list changes.
  const existenceCache = useRef(new Map<string, boolean>());
  useEffect(() => {
    existenceCache.current = new Map();
  }, [playlist]);

  const isPlayable = useCallback(
    (index: number) => {
      const item = playlist[index];
      if (!item) return false;
      if (!item.own) return true;
      if (missingKeys.has(item.key)) return false;
      const track = item.ownIndex != null ? ownTracks[item.ownIndex] : undefined;
      if (!track) return false;
      const cached = existenceCache.current.get(track.id);
      if (cached != null) return cached;
      const exists = ownTrackExists(track.id);
      existenceCache.current.set(track.id, exists);
      return exists;
    },
    [missingKeys, ownTracks, playlist],
  );

  // The next playable entry in a direction, wrapping once, or null when none
  // is playable, so a broken list leaves the cursor alone and cannot spin.
  const nextIndex = useCallback(
    (direction: number) => nextPlayableIndex(playlist.length, trackIndex + direction, isPlayable, direction < 0 ? -1 : 1),
    [isPlayable, playlist.length, trackIndex],
  );

  // A manual step only moves the cursor. `replace` keeps a playing player
  // playing and a paused one paused, so the step keeps whichever it was.
  const stepTo = useCallback(
    (direction: number) => {
      const index = nextIndex(direction);
      if (index != null) setSelectedKey(playlist[index].key);
    },
    [nextIndex, playlist],
  );

  // Set when a track finished on its own and the next one should start as
  // soon as it is loaded. A finished player is stopped, so `replace` alone
  // would leave the next track silent.
  const playOnLoad = useRef(false);

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

  // Load the selected entry when it differs from what the player holds. A key
  // comparison, not an index one, so a reindex after removal still reloads.
  useEffect(() => {
    // An own entry whose uri could not be rebuilt has '' here: never load it.
    if (!entry || !entry.uri || loadedKey.current === entry.key) return;
    loadedKey.current = entry.key;
    replaceSource(entry.uri);
    if (playOnLoad.current) {
      playOnLoad.current = false;
      player.play();
    }
  }, [entry, player, replaceSource]);

  // Runs after the replace effect above, so the flag survives a track change:
  // on web `replace` builds a fresh media element and drops `loop`. While it is
  // on, the player never reaches the end, so `didJustFinish` does not advance.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    player.loop = loop;
  }, [entry?.key, loop, player]);

  // The player fetches a source only when play() is called, so on web the first
  // press of Start used to open a cold connection to the track file and buffer
  // it: several MB, and the music landed well behind the timer. Preload while
  // idle and move the element onto the cached copy. The swap is silent because
  // it only happens on an untouched player, so a track already playing or
  // part-way through is left alone. Native players stream progressively on
  // their own, so this is web only.
  //
  // The deps are `entry` and `player` alone. A drag on the volume slider used
  // to re-run this effect on every tick and call `replace` again, which builds
  // a fresh media element and refetches the track on each step of the drag.
  //
  // Each preload is a fetched copy held in memory (a blob URL on web), so it is
  // released once the player has moved on to another entry, or the hook has
  // unmounted. The release waits a tick so the load effect has replaced the
  // source first: releasing the copy still playing would revoke it under the
  // player.
  const unmounted = useRef(false);
  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
    };
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web' || !entry || !entry.uri) return undefined;
    let cancelled = false;
    const { key, uri } = entry;
    // Drops this entry's cached copy, unless it is still the loaded source.
    const release = () => {
      if (!unmounted.current && loadedKey.current === key) return;
      try {
        void Promise.resolve(clearPreloadedSource(uri)).catch(() => undefined);
      } catch {
        // Nothing cached for this source.
      }
    };
    void preloadTrack(entry.uri).then(() => {
      // A preload that lands after cleanup made its cache entry too late for
      // that release, so it is released here.
      if (cancelled) {
        release();
        return;
      }
      if (player.playing || player.currentTime > 0) return;
      loadedKey.current = entry.key;
      replaceSource(entry.uri);
    }, () => {
      // A failed preload is only a missed head start: play() loads the source.
    });
    return () => {
      cancelled = true;
      setTimeout(release, 0);
    };
  }, [entry, player, replaceSource]);

  const nextTrack = useCallback(() => stepTo(1), [stepTo]);
  const prevTrack = useCallback(() => stepTo(-1), [stepTo]);

  // A track that ends on its own advances and keeps playing. When the next
  // playable entry is the same one (a list of one), it restarts from the top.
  const advanceAfterFinish = useCallback(() => {
    const index = nextIndex(1);
    if (index == null) return;
    const key = playlist[index].key;
    if (key === entry?.key) {
      player.seekTo(0).catch(() => undefined).then(() => player.play());
      return;
    }
    playOnLoad.current = true;
    setSelectedKey(key);
  }, [entry?.key, nextIndex, player, playlist]);

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (next) => {
      if (next.didJustFinish) advanceAfterFinish();
    });
    return () => subscription.remove();
  }, [advanceAfterFinish, player]);

  // A file can pass the existence check and still fail to decode. Mark it
  // missing and step past it rather than stalling on silence. The guard stops
  // a repeated error for the same entry from advancing twice.
  const handledErrorKey = useRef<string | null>(null);
  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (next) => {
      if (!next.error || !entry?.own) return;
      if (handledErrorKey.current === entry.key) return;
      handledErrorKey.current = entry.key;
      const brokenKey = entry.key;
      setMissingKeys((current) => {
        if (current.has(brokenKey)) return current;
        const updated = new Set(current);
        updated.add(brokenKey);
        return updated;
      });
      nextTrack();
    });
    return () => subscription.remove();
  }, [entry, nextTrack, player]);

  const pause = useCallback(() => {
    // Clear the flag immediately so a later play() in the same turn is not
    // skipped while the status event is still catching up.
    playingRef.current = false;
    player.pause();
  }, [player]);

  const toggleMusic = useCallback(() => {
    if (status.playing) pause();
    else player.play();
  }, [pause, player, status.playing]);

  const play = useCallback(() => {
    if (!playingRef.current) player.play();
  }, [player]);

  const selectTrack = useCallback((index: number) => {
    const target = playlist[index];
    if (!target || !target.uri) return;
    if (target.key === entry?.key) {
      player.play();
      return;
    }
    // Replace the source here and record it, so the effect skips this entry.
    playOnLoad.current = false;
    loadedKey.current = target.key;
    replaceSource(target.uri);
    setSelectedKey(target.key);
    player.play();
  }, [entry?.key, player, playlist, replaceSource]);

  // The progress bar's seek. A seek that fails (the source has not loaded yet)
  // leaves the position where it was.
  const seekTo = useCallback((seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    player.seekTo(Math.max(0, seconds)).catch(() => undefined);
  }, [player]);

  const restoreMusic = useCallback(() => {
    clearFade();
    setGain(1);
  }, [clearFade]);

  const onSessionEnd = useCallback((setting: MusicEnd) => {
    // Only this player. A streaming embed never enters it, so a session that
    // ends while the embed is up still completes and leaves the embed alone.
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
    // A seek that fails (the chime has not finished loading) must not become an
    // unhandled rejection, and the chime should still be heard, so play anyway.
    chime.seekTo(0).catch(() => undefined).then(() => {
      chime.play();
    });
  }, [chime]);

  return {
    playlist,
    musicPlaying: status.playing,
    trackIndex,
    trackTitle: entry?.title ?? '',
    trackArtist: entry?.artist ?? '',
    toggleMusic,
    pause,
    play,
    nextTrack,
    prevTrack,
    selectTrack,
    seekTo,
    restoreMusic,
    onSessionEnd,
    playChime,
    player,
  };
}
