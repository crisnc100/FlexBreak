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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.completeContainer}>
        <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
        <Text style={[styles.completeTitle, { color: theme.text }]}>
          Round {currentRound} Complete!
        </Text>
        
        <View style={[styles.statsCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Round Score:</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.roundScore}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Correct Placements:</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.correctPlacements}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Urgent Items Handled:</Text>
            <Text style={[styles.statValue, { color: '#FFA500' }]}>{stats.urgentItemsHandled}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Perfect Balance Combos:</Text>
            <Text style={[styles.statValue, { color: theme.accent }]}>{stats.perfectBalanceCount}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: theme.accent }]}
          onPress={onNextRound}
        >
          <Text style={styles.continueButtonText}>
            {currentRound >= 3 ? 'Finish' : 'Next Round'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};