import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AboutModal } from './about-modal';
import { GenreModal } from './genre-modal';
import { musicTracks } from './music-tracks';
import { PomodoroModal } from './pomodoro-modal';
import { VolumeModal } from './volume-modal';

interface Track {
  title: string;
  artist: string;
  uri: string | number;
}

const tracks: Track[] = musicTracks;

interface MusicPlayerProps {
  onPlayingTimeUpdate: (minutes: number) => void;
}

export function MusicPlayer({ onPlayingTimeUpdate }: MusicPlayerProps) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showVolumeMenu, setShowVolumeMenu] = useState(false);
  const [showGenreMenu, setShowGenreMenu] = useState(false);
  const [showPomodoroMenu, setShowPomodoroMenu] = useState(false);
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [selectedGenre, setSelectedGenre] = useState('chill');

  const currentTrack = tracks[currentTrackIndex];
  const player = useAudioPlayer(tracks[0].uri);
  const status = useAudioPlayerStatus(player);

  // Update track when index changes
  useEffect(() => {
    player.replace(currentTrack.uri);
  }, [currentTrackIndex, currentTrack.uri, player]);

  useEffect(() => {
    player.volume = volume;
  }, [volume, player]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let elapsedTime = 0;
    if (status.playing) {
      interval = setInterval(() => {
        elapsedTime += 1 / 60;
        onPlayingTimeUpdate(elapsedTime);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status.playing, onPlayingTimeUpdate]);

  const playPauseSound = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const skipToPrevious = useCallback(() => {
    const newIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(newIndex);
  }, [currentTrackIndex]);

  const skipToNext = useCallback(() => {
    const newIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(newIndex);
  }, [currentTrackIndex]);

  useEffect(() => {
    if (status.didJustFinish) {
      skipToNext();
    }
  }, [status.didJustFinish, skipToNext]);


  return (
    <>
      <View style={styles.container}>
        <View style={styles.playerCard}>
          <TouchableOpacity 
            style={styles.trackInfo}
            onPress={() => setShowGenreMenu(true)}
          >
            <View style={styles.musicIconCircle}>
              <Ionicons name="musical-notes" size={20} color="#fff" style={styles.musicIcon} />
            </View>
            <View style={styles.trackText}>
              <Text style={styles.title} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.controls}>
            <TouchableOpacity onPress={skipToPrevious} style={styles.controlButton}>
                <Ionicons name="play-skip-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity onPress={playPauseSound} style={styles.playButton}>
              <Ionicons name={status.playing ? 'pause' : 'play'} size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity onPress={skipToNext} style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.rightControls}>
            <TouchableOpacity 
              onPress={() => setShowVolumeMenu(true)} 
              style={styles.iconButton}
            >
              <Ionicons name="volume-medium" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <View>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => setShowMenuPopup(!showMenuPopup)}
              >
                <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              
              {showMenuPopup && (
                <View style={styles.menuPopup}>
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMenuPopup(false);
                      setShowPomodoroMenu(true);
                    }}
                  >
                    <Text style={styles.menuItemText}>Pomodoro</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMenuPopup(false);
                      setShowAboutModal(true);
                    }}
                  >
                    <Text style={styles.menuItemText}>About</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <VolumeModal
        visible={showVolumeMenu}
        volume={volume}
        onClose={() => setShowVolumeMenu(false)}
        onVolumeChange={setVolume}
      />

      <GenreModal
        visible={showGenreMenu}
        selectedGenre={selectedGenre}
        onClose={() => setShowGenreMenu(false)}
        onSelectGenre={setSelectedGenre}
      />

      <PomodoroModal
        visible={showPomodoroMenu}
        onClose={() => setShowPomodoroMenu(false)}
      />

      <AboutModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  playerCard: {
    backgroundColor: 'rgba(26, 26, 30, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 12, // reduced
    paddingVertical: 10, // reduced
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
    elevation: 4, // reduced
  },
  musicIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6, // reduced
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  musicIcon: {
  },
  trackText: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 32, // reduced
    height: 32, // reduced
    borderRadius: 16,
    backgroundColor: '#444',
    padding: 4, // reduced
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 4, // reduced
    width: 32, // reduced
    height: 32, // reduced
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // reduced
    marginLeft: 6, // reduced
  },
  iconButton: {
    padding: 4, // reduced
  },
  tomatoIcon: {
    fontSize: 14, // reduced
  },
  menuPopup: {
    position: 'absolute',
    bottom: 28, // reduced
    right: 0,
    backgroundColor: '#2A2A3E',
    borderRadius: 6, // reduced
    paddingVertical: 2, // reduced
    minWidth: 80, // reduced
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
    elevation: 4, // reduced
  },
  menuItem: {
    paddingVertical: 6, // reduced
    paddingHorizontal: 8, // reduced
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 12, // reduced
    fontWeight: '500',
  },
});
