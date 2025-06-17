import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameState } from './types';

interface GameResultsScreenProps {
  gameState: GameState;
  gameStats: {
    totalKills: number;
    padsBuilt: number;
    upgradesMade: number;
    energyEarned: number;
  };
  finalScore: number;
  xpEarned: number;
  isVictory: boolean;
  theme: any;
  onContinue: () => void;
}

export const GameResultsScreen: React.FC<GameResultsScreenProps> = ({
  gameState,
  gameStats,
  finalScore,
  xpEarned,
  isVictory,
  theme,
  onContinue
}) => {
  const heartsRemaining = gameState.hearts;
  const wavesSurvived = gameState.currentWave + 1;
  const perfectDefense = heartsRemaining === 3;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.resultEmoji]}>
            {isVictory ? "🏆" : "💪"}
          </Text>
          
          <Text style={[styles.resultTitle, { color: theme.text }]}>
            {isVictory ? "Victory!" : "Good Effort!"}
          </Text>
        </View>

        {/* Main Stats - Visual */}
        <View style={[styles.mainStats, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.accent }]}>{wavesSurvived}/5</Text>
            <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>Waves</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.success }]}>{gameStats.totalKills}</Text>
            <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>Defeated</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: heartsRemaining > 1 ? theme.success : theme.error }]}>
              {"💖".repeat(heartsRemaining)}
            </Text>
            <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>Health</Text>
          </View>
        </View>

        {/* XP Result - Large and Clear */}
        <View style={[styles.xpResult, { backgroundColor: theme.accent + '20' }]}>
          <Text style={[styles.xpNumber, { color: theme.accent }]}>{xpEarned}</Text>
          <Text style={[styles.xpLabel, { color: theme.accent }]}>XP EARNED</Text>
          {perfectDefense && (
            <Text style={[styles.bonusText, { color: theme.success }]}>✨ Perfect Defense!</Text>
          )}
        </View>

        {/* Quick Tip - One Line */}
        <Text style={[styles.quickTip, { color: theme.textSecondary }]}>
          {isVictory 
            ? "Great strategy! Keep it up!" 
            : "Tip: Upgrade pads for better defense"
          }
        </Text>
      </View>

      {/* Continue Button */}
      <TouchableOpacity 
        style={[styles.continueButton, { backgroundColor: theme.accent }]}
        onPress={onContinue}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resultEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statItemLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 10,
  },
  xpResult: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  xpNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  xpLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  bonusText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  quickTip: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});