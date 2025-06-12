import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { ComboInfo } from './types';
import { styles } from './styles';
import { MAX_ENERGY } from './constants';

interface GameHeaderProps {
  currentRound: number;
  score: number;
  roundScore: number;
  timeLeft: number;
  balance: number;
  energy: number;
  energyAnimation: Animated.Value;
  currentCombo: ComboInfo | null;
  onSkip: () => void;
  isTutorial?: boolean;
  onSkipTutorial?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  currentRound,
  score,
  roundScore,
  timeLeft,
  balance,
  energy,
  energyAnimation,
  currentCombo,
  onSkip,
  isTutorial = false,
  onSkipTutorial,
}) => {
  const { theme } = useTheme();

  const getBalanceColor = (): string => {
    const absBalance = Math.abs(balance);
    if (absBalance < 20) return '#4CAF5040';
    if (absBalance < 40) return '#2196F340';
    if (absBalance < 60) return '#FFA50040';
    return '#FF6B6B40';
  };

  const getBalanceStatus = () => {
    const absBalance = Math.abs(balance);
    if (absBalance < 20) return { text: '⚖️ Perfect Balance!', subtext: 'Keep it up!' };
    if (absBalance < 40) return { text: '👍 Good Balance', subtext: balance < 0 ? 'Slightly work-heavy' : 'Slightly life-heavy' };
    if (absBalance < 60) return { text: '⚠️ Getting Unbalanced', subtext: 'Consider discarding items' };
    return { text: '🚨 Too Unbalanced!', subtext: 'Discard items to recover!' };
  };

  return (
    <>
      <View style={styles.header}>
        {isTutorial ? (
          <>
            <Text style={[styles.roundText, { color: theme.textSecondary }]}>Tutorial</Text>
            <Text style={[styles.timerText, { color: theme.text }]}>{timeLeft}s</Text>
            <TouchableOpacity onPress={onSkipTutorial}>
              <Text style={[styles.skipTutorialText, { color: theme.accent }]}>Skip</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View>
              <Text style={[styles.roundText, { color: theme.textSecondary }]}>Round {currentRound}</Text>
              <Text style={[styles.scoreText, { color: theme.text }]}>Score: {score + roundScore}</Text>
            </View>
            
            <View style={styles.centerHeader}>
              <Text style={[styles.timerText, { color: theme.text }]}>{timeLeft}s</Text>
              <View style={[styles.balanceIndicator, { backgroundColor: getBalanceColor() }]}>
                <Text style={styles.balanceText}>{getBalanceStatus().text}</Text>
              </View>
            </View>
            
            <TouchableOpacity onPress={onSkip} style={styles.exitButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {isTutorial && (
        <View style={styles.tutorialBanner}>
          <Text style={[styles.tutorialText, { color: theme.text }]}>
            ⚖️ Keep the scale balanced! • 🗑️ Discard items strategically • 🎯 Wrong side = more imbalance!
          </Text>
        </View>
      )}

      {!isTutorial && (
        <View style={[styles.energyContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.energyLabel, { color: theme.textSecondary }]}>Energy</Text>
          <View style={styles.energyBarBg}>
            <Animated.View 
              style={[
                styles.energyBar, 
                { 
                  backgroundColor: energy > 30 ? '#4CAF50' : '#FF6B6B',
                  width: `${energy}%`,
                  transform: [{ scaleY: energyAnimation }],
                }
              ]} 
            />
          </View>
          <Text style={[styles.energyText, { color: theme.text }]}>{Math.round(energy)}%</Text>
        </View>
      )}

      {currentCombo && (
        <Animated.View style={[styles.comboDisplay, { backgroundColor: theme.accent }]}>
          <Text style={styles.comboText}>{currentCombo.type}!</Text>
        </Animated.View>
      )}
    </>
  );
};