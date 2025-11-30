import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VolumeModalProps {
  visible: boolean;
  volume: number;
  onClose: () => void;
  onVolumeChange: (value: number) => void;
}

export function VolumeModal({ visible, volume, onClose, onVolumeChange }: VolumeModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Ionicons name="volume-high" size={24} color="#E9C46A" />
            <Text style={styles.title}>Volume Control</Text>
          </View>
          
          <View style={styles.volumeContainer}>
            <Ionicons name="volume-low" size={20} color="#AAAAAA" />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={onVolumeChange}
              minimumTrackTintColor="#E9C46A"
              maximumTrackTintColor="#444444"
              thumbTintColor="#E9C46A"
            />
            <Ionicons name="volume-high" size={20} color="#AAAAAA" />
          </View>
          
          <Text style={styles.volumeText}>{Math.round(volume * 100)}%</Text>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
    modalContent: {
      backgroundColor: '#1A1A2E',
      borderRadius: 20,
      padding: 24,
      width: '80%',
      maxWidth: 350,
      boxShadow: '0px 8px 10px rgba(0,0,0,0.44)',
      elevation: 16,
    },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  volumeText: {
    color: '#E9C46A',
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#E9C46A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '700',
  },
});
