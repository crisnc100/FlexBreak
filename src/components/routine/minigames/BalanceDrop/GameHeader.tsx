import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { ComboInfo, LifeStats } from './types';
import { styles } from './styles';
import { MAX_ENERGY } from './constants';

interface GameHeaderProps {
  currentRound: number;
  score: number;
  timeLeft: number;
  balance: number;
  energyLeft: number;
  currentCombo: ComboInfo | null;
  lifeStats?: LifeStats;
  onSkip: () => void;
  isTutorial?: boolean;
  onSkipTutorial?: () => void;
  energyAnimation?: Animated.Value;
  energyFlashAnimation?: Animated.Value;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  currentRound,
  score,
  timeLeft,
  balance,
  energyLeft,
  currentCombo,
  lifeStats,
  onSkip,
  isTutorial = false,
  onSkipTutorial,
  energyAnimation,
  energyFlashAnimation,
}) => {
  const { theme } = useTheme();

  const getBalanceColor = (): string => {
    const absBalance = Math.abs(balance);
    if (absBalance < 30) return '#4CAF50';
    if (absBalance < 50) return '#FFA500';
    return '#FF6B6B';
  };

  const getEnergyColor = (): string => {
    if (energyLeft > 60) return '#4CAF50';
    if (energyLeft > 30) return '#FFA500';
    return '#FF6B6B';
  };

  const getEnergyIcon = (): string => {
    if (energyLeft > 75) return 'battery-full';
    if (energyLeft > 50) return 'battery-half';
    if (energyLeft > 25) return 'battery-half';
    if (energyLeft > 10) return 'battery-dead';
    return 'battery-outline';
  };

  const energyPercentage = (energyLeft / MAX_ENERGY) * 100;

  return (
    <>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        {isTutorial ? (
          <>
            <Text style={[styles.roundText, { color: theme.textSecondary }]}>Tutorial</Text>
            <Text style={[styles.timerText, { color: theme.text }]}>{timeLeft}s</Text>
            <TouchableOpacity onPress={onSkipTutorial}>
              <Text style={[styles.skipTutorialText, { color: theme.accent }]}>Skip →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View>
              <Text style={[styles.roundText, { color: theme.textSecondary }]}>Round {currentRound}</Text>
              <Text style={[styles.scoreText, { color: theme.text }]}>{score}</Text>
            </View>
            
            <View style={styles.centerHeader}>
              <Text style={[styles.timerText, { color: timeLeft <= 10 ? '#FF6B6B' : theme.text }]}>
                {timeLeft}s
              </Text>
              {timeLeft <= 10 && (
                <Text style={[styles.timerWarning, { color: '#FF6B6B' }]}>Hurry!</Text>
              )}
            </View>
            
            <TouchableOpacity onPress={onSkip} style={styles.exitButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Enhanced Energy Bar */}
      <View style={[styles.energyContainer, { backgroundColor: theme.cardBackground }]}>
        <Ionicons name={getEnergyIcon()} size={26} color={getEnergyColor()} />
        <View style={styles.energyBarBg}>
          <Animated.View 
            style={[
              styles.energyBar, 
              { 
                width: `${energyPercentage}%`,
                backgroundColor: getEnergyColor(),
                transform: energyAnimation ? [{ scaleX: energyAnimation }] : [],
              }
            ]}
          />
          {/* Flash overlay for wrong placement */}
          {energyFlashAnimation && (
            <Animated.View 
              style={[
                styles.energyFlash,
                { 
                  opacity: energyFlashAnimation,
                }
              ]}
            />
          )}
        </View>
        <View style={styles.energyTextContainer}>
          <Text style={[styles.energyText, { color: getEnergyColor(), fontSize: 18, fontWeight: '700' }]}>
            {Math.round(energyLeft)}%
          </Text>
          {energyLeft <= 30 && (
            <Text style={[styles.energyWarning, { color: '#FF6B6B' }]}>Low!</Text>
          )}
        </View>
      </View>

      {/* Balance Indicator with Visual Cues */}
      {!isTutorial && (
        <View style={[styles.balanceContainer, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.balanceBar}>
            <View style={[styles.balanceSection, styles.workSection]}>
              <Ionicons name="briefcase" size={20} color="#FF6B6B" />
              <Text style={[styles.balanceLabel, { color: '#FF6B6B' }]}>WORK</Text>
            </View>
            <View style={styles.balanceCenter}>
              <View style={[
                styles.balanceIndicator,
                {
                  backgroundColor: getBalanceColor(),
                  left: `${50 + (balance / 2)}%`,
                }
              ]} />
            </View>
            <View style={[styles.balanceSection, styles.lifeSection]}>
              <Text style={[styles.balanceLabel, { color: '#4CAF50' }]}>LIFE</Text>
              <Ionicons name="heart" size={20} color="#4CAF50" />
            </View>
          </View>
          {Math.abs(balance) >= 50 && (
            <Text style={[styles.balanceWarning, { color: '#FF6B6B' }]}>
              ⚠️ Balance at risk!
            </Text>
          )}
        </View>
      )}

      {/* Combo Display */}
      {currentCombo && (
        <Animated.View style={[styles.comboDisplay, { backgroundColor: theme.accent }]}>
          <Text style={styles.comboText}>
            🔥 {currentCombo.type}! x{currentCombo.count}
          </Text>
        </Animated.View>
      )}

      {/* Life Stats with Progress Bars */}
      {!isTutorial && lifeStats && (
        <View style={[styles.lifeStatsContainer, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.lifeStatsGrid}>
            {/* Career */}
            <View style={styles.statItemWithBar}>
              <View style={styles.statHeader}>
                <Ionicons name="trending-up" size={18} color="#FF6B6B" />
                <Text style={[styles.statMiniLabel, { color: theme.textSecondary }]}>Career</Text>
              </View>
              <View style={styles.statBarBg}>
                <View style={[styles.statBar, { width: `${lifeStats.career}%`, backgroundColor: '#FF6B6B' }]} />
              </View>
            </View>

            {/* Family */}
            <View style={styles.statItemWithBar}>
              <View style={styles.statHeader}>
                <Ionicons name="home" size={18} color="#4ECDC4" />
                <Text style={[styles.statMiniLabel, { color: theme.textSecondary }]}>Family</Text>
              </View>
              <View style={styles.statBarBg}>
                <View style={[styles.statBar, { width: `${lifeStats.family}%`, backgroundColor: '#4ECDC4' }]} />
              </View>
            </View>

            {/* Health */}
            <View style={styles.statItemWithBar}>
              <View style={styles.statHeader}>
                <Ionicons name="heart" size={18} color="#4CAF50" />
                <Text style={[styles.statMiniLabel, { color: theme.textSecondary }]}>Health</Text>
              </View>
              <View style={styles.statBarBg}>
                <View style={[styles.statBar, { width: `${lifeStats.health}%`, backgroundColor: '#4CAF50' }]} />
              </View>
            </View>

            {/* Social */}
            <View style={styles.statItemWithBar}>
              <View style={styles.statHeader}>
                <Ionicons name="people" size={18} color="#3498DB" />
                <Text style={[styles.statMiniLabel, { color: theme.textSecondary }]}>Social</Text>
              </View>
              <View style={styles.statBarBg}>
                <View style={[styles.statBar, { width: `${lifeStats.social}%`, backgroundColor: '#3498DB' }]} />
              </View>
            </View>

            {/* Stress */}
            <View style={styles.statItemWithBar}>
              <View style={styles.statHeader}>
                <Ionicons 
                  name={lifeStats.stress > 70 ? "alert-circle" : "sunny"} 
                  size={18} 
                  color={lifeStats.stress > 70 ? '#FF0000' : '#FFB347'} 
                />
                <Text style={[styles.statMiniLabel, { color: theme.textSecondary }]}>Stress</Text>
              </View>
              <View style={styles.statBarBg}>
                <View style={[
                  styles.statBar, 
                  { 
                    width: `${lifeStats.stress}%`, 
                    backgroundColor: lifeStats.stress > 70 ? '#FF0000' : '#FFB347' 
                  }
                ]} />
              </View>
            </View>
          </View>
        </View>
      )}
    </>
  );
};