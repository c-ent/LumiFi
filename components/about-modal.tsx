import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: AboutModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.madeByText}>Made by</Text>
          <Text style={styles.nameText}>Cent</Text>
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
      padding: 40,
      alignItems: 'center',
      minWidth: 280,
      boxShadow: '0px 8px 10px rgba(0,0,0,0.44)',
      elevation: 16,
    },
  madeByText: {
    color: '#AAAAAA',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 8,
  },
  nameText: {
    color: '#E9C46A',
    fontSize: 42,
    fontWeight: '700',
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: '#444444',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
