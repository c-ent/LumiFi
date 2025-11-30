
import React, { createContext, ReactNode, useContext, useState } from 'react';
import { ImageSourcePropType } from 'react-native';

export type BackgroundKey = 'study-room' | 'living-room' | 'kitchen';

type BackgroundVariants = {
  key: BackgroundKey;
  label: string;
  light: ImageSourcePropType;
  dark: ImageSourcePropType;
};

export const BACKGROUNDS: BackgroundVariants[] = [
  {
    key: 'study-room',
    label: 'Study Room',
    light: require('../assets/images/bg/study-room.png'),
    dark: require('../assets/images/bg/study-room-dark.png'),
  },
  {
    key: 'living-room',
    label: 'Living Room',
    light: require('../assets/images/bg/living-room.png'),
    dark: require('../assets/images/bg/living-room-dark.png'),
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    light: require('../assets/images/bg/kitchen.png'),
    dark: require('../assets/images/bg/kitchen-dark.png'),
  },
];

interface BackgroundContextProps {
  selectedKey: BackgroundKey;
  setSelectedKey: (key: BackgroundKey) => void;
  getBackground: (isDarkMode: boolean) => ImageSourcePropType;
}

const defaultKey: BackgroundKey = 'study-room';

const BackgroundContext = createContext<BackgroundContextProps | undefined>(undefined);

export const BackgroundProvider = ({ children }: { children: ReactNode }) => {
  const [selectedKey, setSelectedKey] = useState<BackgroundKey>(defaultKey);
  const getBackground = (isDarkMode: boolean) => {
    const bg = BACKGROUNDS.find(b => b.key === selectedKey);
    if (bg) return isDarkMode ? bg.dark : bg.light;
    // fallback to study-room
    const fallback = BACKGROUNDS[0];
    return isDarkMode ? fallback.dark : fallback.light;
  };
  return (
    <BackgroundContext.Provider value={{ selectedKey, setSelectedKey, getBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (!context) throw new Error('useBackground must be used within BackgroundProvider');
  return context;
};
