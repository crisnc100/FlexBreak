import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';

interface GameHUDProps {
  currentWave: number;
  timeLeft: number;
  score: number;
  tensionLevel: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentWave,
  timeLeft,
  score,
  tensionLevel,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.hud, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.hudLeft}>
        <Text style={[styles.hudText, { color: theme.text }]}>
          Wave {currentWave}/3
        </Text>
        <Text style={[styles.hudText, { color: theme.text }]}>
          {timeLeft}s
        </Text>
      </View>
      
      <View style={styles.hudCenter}>
        <Text style={[styles.scoreText, { color: theme.accent }]}>
          {score}
        </Text>
      </View>
      
      <View style={styles.hudRight}>
        <View style={styles.tensionMeter}>
          <View 
            style={[
              styles.tensionFill, 
              { 
                width: `${tensionLevel}%`,
                backgroundColor: tensionLevel > 70 ? '#FF4444' : theme.accent 
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: 40,
  },
  hudLeft: {
    flex: 1,
  },
  hudCenter: {
    flex: 1,
    alignItems: 'center',
  },
  hudRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  hudText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
  },
  tensionMeter: {
    width: 80,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tensionFill: {
    height: '100%',
    borderRadius: 4,
  },
});