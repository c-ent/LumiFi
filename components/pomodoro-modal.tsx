import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PomodoroModalProps {
  visible: boolean;
  onClose: () => void;
}

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const TIMER_DURATIONS = {
  work: 25 * 60, // 25 minutes in seconds
  shortBreak: 5 * 60, // 5 minutes in seconds
  longBreak: 60 * 60, // 60 minutes in seconds
};

export function PomodoroModal({ visible, onClose }: PomodoroModalProps) {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.work);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleModeChange = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(TIMER_DURATIONS[newMode]);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setTimeLeft(TIMER_DURATIONS[mode]);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    return ((TIMER_DURATIONS[mode] - timeLeft) / TIMER_DURATIONS[mode]) * 100;
  };

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
            <Text style={styles.tomato}>🍅</Text>
            <Text style={styles.title}>Pomodoro Timer</Text>
          </View>

          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'work' && styles.modeButtonActive]}
              onPress={() => handleModeChange('work')}
            >
              <Text style={[styles.modeText, mode === 'work' && styles.modeTextActive]}>
                Focus
              </Text>
              <Text style={[styles.modeDuration, mode === 'work' && styles.modeDurationActive]}>
                25m
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, mode === 'shortBreak' && styles.modeButtonActive]}
              onPress={() => handleModeChange('shortBreak')}
            >
              <Text style={[styles.modeText, mode === 'shortBreak' && styles.modeTextActive]}>
                Short Break
              </Text>
              <Text style={[styles.modeDuration, mode === 'shortBreak' && styles.modeDurationActive]}>
                5m
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, mode === 'longBreak' && styles.modeButtonActive]}
              onPress={() => handleModeChange('longBreak')}
            >
              <Text style={[styles.modeText, mode === 'longBreak' && styles.modeTextActive]}>
                Long Break
              </Text>
              <Text style={[styles.modeDuration, mode === 'longBreak' && styles.modeDurationActive]}>
                60m
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timerContainer}>
            <View style={styles.circleProgress}>
              <View style={[styles.progressBar, { width: `${getProgress()}%` }]} />
            </View>
            <Text style={styles.timeDisplay}>{formatTime(timeLeft)}</Text>
            <Text style={styles.modeLabel}>
              {mode === 'work' ? 'Focus Time' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </Text>
          </View>

          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.playButton]}
              onPress={toggleTimer}
            >
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={32}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.resetButton]}
              onPress={resetTimer}
            >
              <Ionicons name="reload" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

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
      width: '90%',
      maxWidth: 420,
      boxShadow: '0px 8px 10px rgba(0,0,0,0.44)',
      elevation: 16,
    },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  tomato: {
    fontSize: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  modeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    borderColor: '#E76F51',
    backgroundColor: 'rgba(231, 111, 81, 0.15)',
  },
  modeText: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeTextActive: {
    color: '#E76F51',
  },
  modeDuration: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '700',
  },
  modeDurationActive: {
    color: '#E76F51',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  circleProgress: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E76F51',
    borderRadius: 4,
  },
  timeDisplay: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '300',
    letterSpacing: 4,
    marginBottom: 8,
  },
  modeLabel: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '500',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: '#E76F51',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
