import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { styles } from './styles';

interface GameOverScreenProps {
  balance: number;
  energy: number;
  finalScore: number;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  balance,
  energy,
  finalScore,
}) => {
  const { theme } = useTheme();

  const failureReason = Math.abs(balance) >= 80 
    ? (balance < -80 ? 'Too much work!' : 'Too much relaxation!')
    : 'Out of energy!';
    
  const strategyTip = Math.abs(balance) >= 80 
    ? '💡 Strategy: Sometimes it\'s better to let items fall than to worsen the imbalance. Focus on items that will help restore balance!'
    : '💡 Strategy: Prioritize wellness items that restore energy, and let low-value items fall if needed!';

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