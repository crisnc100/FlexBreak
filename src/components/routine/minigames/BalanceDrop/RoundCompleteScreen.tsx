import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { GameStats } from './types';
import { styles } from './styles';
import { playRoundCompleteSound } from '../../../../utils/soundEffects';

interface RoundCompleteScreenProps {
  currentRound: number;
  stats: GameStats;
  onNextRound: () => void;
  balance?: number;
  energyLeft?: number;
}

export const RoundCompleteScreen: React.FC<RoundCompleteScreenProps> = ({
  currentRound,
  stats,
  onNextRound,
  balance = 0,
  energyLeft = 100,
}) => {
  const { theme } = useTheme();

  useEffect(() => {
    playRoundCompleteSound();
  }, []);

  const getPerformanceMessage = () => {
    // Check for specific failure conditions first
    if (energyLeft <= 0) {
      return '🔋 Energy Depleted';
    }
    if (Math.abs(balance) >= 70) {
      return '⚖️ Lost Balance';
    }
    
    // Otherwise base on score performance
    const accuracy = stats.itemsPlaced > 0 ? (stats.roundScore / (stats.itemsPlaced * 10)) : 0;
    if (accuracy >= 0.8) return '🎉 Excellent!';
    if (accuracy >= 0.6) return '⭐ Great Job!';
    if (accuracy >= 0.4) return '👍 Good Work!';
    return '✅ Round Complete!';
  };

  const getSubtleHint = () => {
    // Provide a subtle hint based on what went wrong
    if (energyLeft <= 0) {
      return '💡 Rest items restore energy';
    }
    if (Math.abs(balance) >= 70) {
      if (balance > 0) {
        return '💡 Too much work focus';
      } else {
        return '💡 Too much life focus';
      }
    }
    if (stats.roundScore < 50) {
      return '💡 Place items on correct sides';
    }
    if (stats.energyRestored < 20 && energyLeft < 50) {
      return '💡 Grab green rest items';
    }
    return null; // No hint needed for good performance
  };

  const hint = getSubtleHint();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.completeContainer}>
        
        <Text style={[styles.completeTitle, { color: theme.text, fontSize: 36, fontWeight: '800', marginBottom: 20 }]}>
          {getPerformanceMessage()}
        </Text>
        
        {hint && (
          <Text style={{ 
            color: theme.textSecondary, 
            fontSize: 16, 
            marginBottom: 30,
            fontStyle: 'italic'
          }}>
            {hint}
          </Text>
        )}
        
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