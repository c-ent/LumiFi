import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ClockWidgetProps {
  username?: string;
  listeningTime: number; // in minutes
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function ClockWidget({ 
  username = 'binsinttt', 
  listeningTime, 
  isDarkMode,
  onToggleTheme 
}: ClockWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate level based on listening time
  const calculateLevel = (minutes: number) => {
    return Math.floor(minutes / 30) + 1; // Level up every 30 minutes
  };

  const level = calculateLevel(listeningTime);

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const formatDate = (date: Date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    return `${months[date.getMonth()]} ${date.getDate()} ${days[date.getDay()]}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🍊</Text>
          </View>
          <View>
            <View style={styles.userNameRow}>
              <Text style={styles.username}>{username}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Lv {level}</Text>
              </View>
            </View>
            <Text style={styles.listeningTime}>
              {Math.floor(listeningTime)} min listening
            </Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={onToggleTheme} style={styles.themeButton}>
          <Ionicons 
            name={isDarkMode ? 'sunny' : 'moon'} 
            size={20} 
            color={isDarkMode ? '#FFD700' : '#9B8FB8'} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.timeCard}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <Text style={styles.date}>{formatDate(currentTime)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  card: {
    backgroundColor: 'rgba(74, 78, 124, 0.9)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  levelBadge: {
    backgroundColor: 'rgba(233, 196, 106, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E9C46A',
  },
  levelText: {
    color: '#E9C46A',
    fontSize: 10,
    fontWeight: '700',
  },
  listeningTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  themeButton: {
    padding: 8,
  },
  timeCard: {
    alignItems: 'center',
  },
  time: {
    color: '#FFFFFF',
    fontSize: 58,
    fontWeight: '700',
    letterSpacing: 2,
  },
  date: {
    color: 'rgba(255, 255, 255, 1)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
