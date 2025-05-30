import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface TimerDisplayProps {
  seconds: number;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  style?: any;
  paused?: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  seconds,
  size = 'medium',
  showIcon = false,
  style,
  paused = false,
}) => {
  const { theme, isDark, isSunset } = useTheme();
  
  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getSize = () => {
    switch (size) {
      case 'small':
        return { fontSize: 16, iconSize: 14 };
      case 'large':
        return { fontSize: 48, iconSize: 28 };
      case 'medium':
      default:
        return { fontSize: 24, iconSize: 18 };
    }
  };

  const { fontSize, iconSize } = getSize();
  const color = isDark || isSunset ? theme.text : '#333';

  return (
    <View style={[styles.container, style]}>
      {showIcon && (
        <Ionicons 
          name={paused ? "pause-circle-outline" : "timer-outline"} 
          size={iconSize} 
          color={isDark || isSunset ? theme.accent : '#4CAF50'} 
          style={styles.icon} 
        />
      )}
      <Text 
        style={[
          styles.timerText, 
          { fontSize, color }
        ]}
      >
        {formatTime(seconds)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontWeight: '600',
  },
  icon: {
    marginRight: 5,
  }
});

export default TimerDisplay; 