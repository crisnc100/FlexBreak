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
  
  // Calculate performance bonuses
  const survivalBonus = heartsRemaining * 10;
  const waveBonus = wavesSurvived * 15;
  const perfectBonus = perfectDefense ? 50 : 0;
  const killBonus = gameStats.totalKills * 5;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          
          
          <Text style={[styles.resultTitle, { color: theme.text }]}>
            {isVictory ? "🏆 Posture Defended!" : "💪 Every Stretch Counts!"}
          </Text>
          
          <Text style={[styles.resultSubtitle, { color: theme.textSecondary }]}>
            {isVictory 
              ? "Your wellness strategy succeeded!"
              : "You made progress in your wellness journey!"
            }
          </Text>
        </View>

        {/* Performance Breakdown */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>
            📊 Performance Breakdown
          </Text>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.text }]}>Waves Survived</Text>
            <Text style={[styles.statValue, { color: theme.accent }]}>{wavesSurvived}/5</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.text }]}>Posture Monsters Defeated</Text>
            <Text style={[styles.statValue, { color: theme.success }]}>{gameStats.totalKills}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.text }]}>Stretch Pads Built</Text>
            <Text style={[styles.statValue, { color: theme.accent }]}>{gameStats.padsBuilt}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.text }]}>Equipment Upgrades</Text>
            <Text style={[styles.statValue, { color: theme.accent }]}>{gameStats.upgradesMade}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.text }]}>Hearts Remaining</Text>
            <Text style={[styles.statValue, { color: heartsRemaining > 1 ? theme.success : theme.error }]}>
              {heartsRemaining}/3 💖
            </Text>
          </View>
          
          {perfectDefense && (
            <View style={[styles.perfectDefenseBonus, { backgroundColor: theme.success + '20' }]}>
              <Text style={[styles.perfectDefenseText, { color: theme.success }]}>
                ✨ Perfect Defense Bonus!
              </Text>
            </View>
          )}
        </View>

        {/* XP Breakdown */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>
            ⭐ Experience Breakdown
          </Text>
          
          <View style={styles.xpRow}>
            <Text style={[styles.xpLabel, { color: theme.text }]}>Base Score</Text>
            <Text style={[styles.xpValue, { color: theme.text }]}>+{finalScore}</Text>
          </View>
          
          <View style={styles.xpRow}>
            <Text style={[styles.xpLabel, { color: theme.text }]}>Wave Bonus</Text>
            <Text style={[styles.xpValue, { color: theme.accent }]}>+{waveBonus}</Text>
          </View>
          
          <View style={styles.xpRow}>
            <Text style={[styles.xpLabel, { color: theme.text }]}>Survival Bonus</Text>
            <Text style={[styles.xpValue, { color: theme.success }]}>+{survivalBonus}</Text>
          </View>
          
          <View style={styles.xpRow}>
            <Text style={[styles.xpLabel, { color: theme.text }]}>Defeat Bonus</Text>
            <Text style={[styles.xpValue, { color: theme.success }]}>+{killBonus}</Text>
          </View>
          
          {perfectDefense && (
            <View style={styles.xpRow}>
              <Text style={[styles.xpLabel, { color: theme.success }]}>Perfect Defense</Text>
              <Text style={[styles.xpValue, { color: theme.success }]}>+{perfectBonus}</Text>
            </View>
          )}
          
          <View style={[styles.totalXpRow, { borderTopColor: theme.accent }]}>
            <Text style={[styles.totalXpLabel, { color: theme.accent }]}>Total Experience</Text>
            <Text style={[styles.totalXpValue, { color: theme.accent }]}>{xpEarned} XP</Text>
          </View>
        </View>

        {/* Encouraging Message */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>
            💡 Wellness Tips
          </Text>
          
          {isVictory ? (
            <View>
              <Text style={[styles.tipText, { color: theme.text }]}>
                Outstanding posture defense! Your strategic stretch pad placement and upgrade choices show excellent wellness planning.
              </Text>
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                Keep building these healthy habits in real life too!
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.tipText, { color: theme.text }]}>
                Great effort! Every attempt teaches us something new about maintaining good posture and wellness.
              </Text>
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                {gameStats.totalKills > 0 
                  ? "You defeated some posture monsters - that's progress!" 
                  : "Remember: even small stretches make a big difference!"
                }
              </Text>
              <Text style={[styles.improvementTip, { color: theme.accent }]}>
                💡 Tip: Try upgrading your stretch pads for better effectiveness!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <TouchableOpacity 
        style={[styles.continueButton, { backgroundColor: theme.accent }]}
        onPress={onContinue}
      >
        <Text style={styles.continueButtonText}>Continue Journey</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 80, // Extra space to prevent text cutoff
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  perfectDefenseBonus: {
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  perfectDefenseText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  xpLabel: {
    fontSize: 14,
  },
  xpValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalXpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalXpLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalXpValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  improvementTip: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 4,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});