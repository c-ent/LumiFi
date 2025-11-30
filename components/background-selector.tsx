import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { BackgroundKey } from './background-context';
import { BACKGROUNDS } from './background-context';

type Props = {
  onClose?: () => void;
  isDarkMode: boolean;
  selectedKey: BackgroundKey;
  setSelectedKey: (key: BackgroundKey) => void;
};

export default function BackgroundSelector({ onClose, isDarkMode, selectedKey, setSelectedKey }: Props) {
  return (
    <View style={styles.modalContainer}>
      <Text style={styles.title}>Pick a background</Text>
      <ScrollView horizontal style={styles.container}>
        {BACKGROUNDS.map((bg) => (
          <TouchableOpacity
            key={bg.key}
            onPress={() => {
              setSelectedKey(bg.key);
              if (onClose) onClose();
            }}
          >
            <Image
              source={isDarkMode ? bg.dark : bg.light}
              style={[styles.image, bg.key === selectedKey && styles.selected]}
            />
            <Text style={{ color: '#fff', textAlign: 'center', marginTop: 4 }}>{bg.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  modalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  container: {
    padding: 10,
    flexDirection: 'row',
  },
  image: {
    width: 60,
    height: 60,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: '#007AFF',
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: '#444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
