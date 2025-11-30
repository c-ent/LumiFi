import { useBackground } from '@/components/background-context';
import BackgroundSelector from '@/components/background-selector';
import { ClockWidget } from '@/components/clock-widget';
import { MusicPlayer } from '@/components/music-player';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ImageBackground, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';


export default function HomeScreen() {
  const [listeningTime, setListeningTime] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const { getBackground, selectedKey, setSelectedKey } = useBackground();

  const handlePlayingTimeUpdate = (minutes: number) => {
    setListeningTime(minutes);
  };

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const currentBg = getBackground(isDarkMode);

  return (
    <ImageBackground source={currentBg} style={styles.container} resizeMode="cover">
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {/* Floating background selector icon */}
      <TouchableOpacity
        style={styles.bgIcon}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="image" size={32} color="#fff" />
      </TouchableOpacity>
      <ClockWidget 
        listeningTime={listeningTime} 
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />
      <MusicPlayer onPlayingTimeUpdate={handlePlayingTimeUpdate} />
      {/* Modal for background selection */}
      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <BackgroundSelector
              onClose={() => setModalVisible(false)}
              isDarkMode={isDarkMode}
              selectedKey={selectedKey}
              setSelectedKey={setSelectedKey}
            />
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}


// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  bgIcon: {
    position: 'absolute',
    top: 200,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 20,
    minWidth: 300,
    minHeight: 200,
    alignItems: 'center',
  },
});

