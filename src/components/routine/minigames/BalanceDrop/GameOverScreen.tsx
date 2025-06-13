import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { styles } from './styles';

interface GameOverScreenProps {
  balance: number;
  hoursLeft: number;
  finalScore: number;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  balance,
  hoursLeft,
  finalScore,
}) => {
  const { theme } = useTheme();

  const failureReason = Math.abs(balance) >= 70 
    ? (balance < -70 ? '⚖️ Too much work!' : '⚖️ Too much life!')
    : '⏰ Out of time!';
    
  const failureDetails = Math.abs(balance) >= 70 
    ? 'The scale tipped too far. Balance is lost!'
    : 'You ran out of hours in your day!';
    
  const strategyTip = Math.abs(balance) >= 70 
    ? '💡 Strategy: Sometimes it\'s better to let go of tasks than to worsen the imbalance. Focus on items that will help restore balance!'
    : '💡 Strategy: Each item costs time from your 24-hour day. Prioritize wisely and let go of less important tasks!';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.gameOverContainer}>
        <Ionicons name="warning" size={60} color="#FF6B6B" />
        <Text style={[styles.gameOverTitle, { color: theme.text }]}>
          Balance Lost!
        </Text>
        <Text style={[styles.gameOverText, { color: theme.textSecondary }]}>
          {failureReason}
        </Text>
        <Text style={[styles.gameOverSubtext, { color: theme.textSecondary }]}>
          {failureDetails}
        </Text>
        <Text style={[styles.finalScoreText, { color: theme.text }]}>
          Final Score: {finalScore}
        </Text>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          {strategyTip}
        </Text>
      </View>
    </View>
  );
};