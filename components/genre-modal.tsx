import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GenreModalProps {
  visible: boolean;
  selectedGenre: string;
  onClose: () => void;
  onSelectGenre: (genre: string) => void;
}

const genres = [
  { id: 'chill', name: 'Chill', icon: '☁️', color: '#7B9E8F' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', color: '#E76F51' },
  { id: 'study', name: 'Study', icon: '📚', color: '#2A9D8F' },
  { id: 'sleep', name: 'Sleep', icon: '😴', color: '#9B8FB8' },
  { id: 'focus', name: 'Focus', icon: '🎯', color: '#F4A261' },
  { id: 'relax', name: 'Relax', icon: '🧘', color: '#E9C46A' },
  { id: 'work', name: 'Work', icon: '💼', color: '#264653' },
  { id: 'rain', name: 'Rain', icon: '🌧️', color: '#5B7E8F' },
];

export function GenreModal({ visible, selectedGenre, onClose, onSelectGenre }: GenreModalProps) {
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
            <Ionicons name="musical-notes" size={24} color="#E9C46A" />
            <Text style={styles.title}>Choose Your Vibe</Text>
          </View>
          
          <ScrollView style={styles.genreList} showsVerticalScrollIndicator={false}>
            {genres.map((genre) => (
              <TouchableOpacity
                key={genre.id}
                style={[
                  styles.genreItem,
                  selectedGenre === genre.id && styles.genreItemSelected,
                ]}
                onPress={() => {
                  onSelectGenre(genre.id);
                  onClose();
                }}
              >
                <View style={styles.genreInfo}>
                  <Text style={styles.genreIcon}>{genre.icon}</Text>
                  <Text style={styles.genreName}>{genre.name}</Text>
                </View>
                {selectedGenre === genre.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#E9C46A" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
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
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    boxShadow: '0px 8px 10px rgba(0,0,0,0.44)',
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  genreList: {
    marginBottom: 20,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genreItemSelected: {
    borderColor: '#E9C46A',
    backgroundColor: 'rgba(233, 196, 106, 0.1)',
  },
  genreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  genreIcon: {
    fontSize: 28,
  },
  genreName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#444444',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
