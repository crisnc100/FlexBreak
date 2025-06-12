import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { EnergyBank } from './EnergyBank';
import { HeartDisplay } from './HeartDisplay';

interface TowerDefenseHUDProps {
  currentWave: number;
  timeLeft: number;
  energy: number;
  hearts: number;
  gamePhase: string;
}

export const TowerDefenseHUD: React.FC<TowerDefenseHUDProps> = ({
  currentWave,
  timeLeft,
  energy,
  hearts,
  gamePhase,
}) => {
  const { theme } = useTheme();

  const getPhaseDisplay = () => {
    switch (gamePhase) {
      case 'prepare': return 'PREPARE';
      case 'tutorial': return 'TUTORIAL';
      case 'wave': return `WAVE ${currentWave}`;
      case 'boss': return 'BOSS FIGHT';
      case 'results': return 'COMPLETE';
      default: return 'POSTURE DEFENSE';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top row - Phase and Timer */}
      <View style={styles.topRow}>
        <View style={[styles.phaseContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.phaseText, { color: theme.text }]}>
            {getPhaseDisplay()}
          </Text>
        </View>
        
        <View style={[styles.timerContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.timerText, { color: theme.text }]}>
            {Math.ceil(timeLeft)}s
          </Text>
        </View>
      </View>

      {/* Bottom row - Energy and Hearts */}
      <View style={styles.bottomRow}>
        <EnergyBank energy={energy} />
        <HeartDisplay hearts={hearts} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});