import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { GameStats } from './types';
import { styles } from './styles';

interface RoundCompleteScreenProps {
  currentRound: number;
  stats: GameStats;
  onNextRound: () => void;
}

export const RoundCompleteScreen: React.FC<RoundCompleteScreenProps> = ({
  currentRound,
  stats,
  onNextRound,
}) => {
  const { theme } = useTheme();

  const getPerformanceMessage = () => {
    const accuracy = stats.itemsPlaced > 0 ? (stats.roundScore / (stats.itemsPlaced * 10)) : 0;
    if (accuracy >= 0.8) return '🎉 Excellent!';
    if (accuracy >= 0.6) return '⭐ Great Job!';
    if (accuracy >= 0.4) return '👍 Good Work!';
    return '✅ Round Complete!';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.completeContainer}>
        
        <Text style={[styles.completeTitle, { color: theme.text, fontSize: 36, fontWeight: '800', marginBottom: 30 }]}>
          {getPerformanceMessage()}
        </Text>
        
        <View style={[styles.statsCard, { backgroundColor: theme.cardBackground, padding: 30, marginBottom: 40 }]}>
          <View style={[styles.statRow, { marginBottom: 16 }]}>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: 20 }]}>Score</Text>
            <Text style={[styles.statValue, { color: theme.accent, fontSize: 32, fontWeight: '700' }]}>{Math.round(stats.roundScore)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: 20 }]}>Items Placed</Text>
            <Text style={[styles.statValue, { color: theme.text, fontSize: 24, fontWeight: '600' }]}>{stats.itemsPlaced}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.continueButton, { 
            backgroundColor: theme.accent,
            paddingVertical: 20,
            paddingHorizontal: 50,
            borderRadius: 25
          }]}
          onPress={onNextRound}
        >
          <Text style={[styles.continueButtonText, { fontSize: 22, fontWeight: '700' }]}>
            {currentRound >= 3 ? '🏆 FINISH GAME' : '▶️ NEXT ROUND'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};