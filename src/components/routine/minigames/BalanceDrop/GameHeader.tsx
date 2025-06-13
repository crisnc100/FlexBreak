import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { ComboInfo } from './types';
import { styles } from './styles';
import { MAX_HOURS } from './constants';

interface GameHeaderProps {
  currentRound: number;
  score: number;
  roundScore: number;
  timeLeft: number;
  balance: number;
  hoursLeft: number;
  hoursAnimation: Animated.Value;
  hoursFlashAnimation?: Animated.Value;
  currentCombo: ComboInfo | null;
  itemsRemaining?: number;
  letGoCount?: number;
  maxLetGo?: number;
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
  hoursLeft,
  hoursAnimation,
  hoursFlashAnimation,
  currentCombo,
  itemsRemaining = 0,
  letGoCount = 0,
  maxLetGo,
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
    if (absBalance < 35) return { 
      text: '👍 Good Balance', 
      subtext: balance < 0 ? 'Slightly work-heavy' : 'Slightly life-heavy' 
    };
    if (absBalance < 50) return { 
      text: balance < 0 ? '💼 Too Much Work!' : '🎮 Too Much Play!', 
      subtext: balance < 0 ? 'Add life items to balance' : 'Add work items to balance' 
    };
    if (absBalance < 65) return { 
      text: '🚨 Critical Imbalance!', 
      subtext: 'Fix the scale or lose!' 
    };
    return { text: '💥 DANGER ZONE!', subtext: 'Game over imminent!' };
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
              <Text style={[
                styles.timerText, 
                { 
                  color: timeLeft <= 5 ? '#FF6B6B' : theme.text,
                  fontSize: timeLeft <= 5 ? 28 : 24,
                }
              ]}>
                {timeLeft}s
              </Text>
              {timeLeft <= 5 && (
                <Text style={[styles.warningText, { color: '#FF6B6B' }]}>⚠️ Hurry!</Text>
              )}
              {itemsRemaining > 0 && itemsRemaining <= 5 && (
                <Text style={[styles.warningText, { color: '#FFA500' }]}>
                  {itemsRemaining} items left!
                </Text>
              )}
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
            ⚖️ Keep the scale balanced! • 🤲 Let go on the sides • 🎯 Wrong side = more imbalance!
          </Text>
        </View>
      )}

      {!isTutorial && (
        <View style={[styles.energyContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.energyLabel, { color: theme.textSecondary }]}>Hours Left</Text>
          <View style={styles.energyBarBg}>
            <Animated.View 
              style={[
                styles.energyBar, 
                { 
                  backgroundColor: hoursFlashAnimation ? 
                    hoursFlashAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [hoursLeft > 8 ? '#4CAF50' : '#FF6B6B', '#FF0000']
                    }) : 
                    (hoursLeft > 8 ? '#4CAF50' : '#FF6B6B'),
                  width: `${(hoursLeft / MAX_HOURS) * 100}%`,
                  transform: [{ scaleY: hoursAnimation }],
                }
              ]} 
            />
          </View>
          <Text style={[styles.energyText, { color: theme.text }]}>{hoursLeft.toFixed(1)}h</Text>
        </View>
      )}
      
      {!isTutorial && maxLetGo && maxLetGo < 999 && (
        <View style={[styles.letGoContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.letGoLabel, { color: theme.textSecondary }]}>Let Go Uses:</Text>
          <Text style={[
            styles.letGoCount, 
            { color: letGoCount >= maxLetGo ? '#FF6B6B' : theme.text }
          ]}>
            {maxLetGo - letGoCount} / {maxLetGo}
          </Text>
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