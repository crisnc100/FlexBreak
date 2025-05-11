import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface LevelProgressBarProps {
  currentLevel: number;
  levelTitle?: string;
  totalXP: number;
  xpProgress: number; // 0-1 percentage of progress to next level
  xpToNextLevel?: number;
  nextLevelTitle?: string;
  compact?: boolean; // For a more compact version that can fit in headers
  showXpCounter?: boolean; // Whether to show the XP counter
}

const LevelProgressBar: React.FC<LevelProgressBarProps> = ({
  currentLevel,
  levelTitle,
  totalXP,
  xpProgress,
  xpToNextLevel,
  nextLevelTitle,
  compact = false,
  showXpCounter = true
}) => {
  const { theme, isDark } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Ensure xpProgress is between 0 and 1
  const progress = Math.min(Math.max(xpProgress, 0), 1);
  
  // Animate the progress bar when xpProgress changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);
  
  // Width as animated value
  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  
  // If compact mode and no XP counter, return just the progress bar
  if (compact && !showXpCounter) {
    return (
      <View style={styles.justProgressBarWrapper}>
        <View style={[
          styles.progressContainer, 
          styles.enhancedProgressContainer,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }
        ]}>
          <Animated.View style={{ width: animatedWidth, overflow: 'hidden' }}>
            <LinearGradient
              colors={isDark ? ['#388E3C', '#7CB342'] : ['#4CAF50', '#8BC34A']}
              style={[
                styles.progressBar,
                styles.enhancedProgressBar
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
          
          {/* Progress indicator */}
          <Animated.View 
            style={[
              styles.progressIndicator,
              { 
                left: animatedWidth,
                backgroundColor: isDark ? '#7CB342' : '#4CAF50',
              }
            ]}
          />
        </View>
        
        {/* Minimal XP counter below the bar */}
        <View style={styles.minimalXpInfoContainer}>
          <Text style={[
            styles.minimalXpText, 
            { color: isDark ? theme.textSecondary : '#757575' }
          ]}>
            {xpToNextLevel ? `${xpToNextLevel} XP to next level` : ''}
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[
      styles.container,
      compact && styles.compactContainer,
      { backgroundColor: isDark ? theme.cardBackground : '#FFF' }
    ]}>
      <View style={styles.levelHeader}>
        <View>
          <Text style={[
            compact ? styles.compactLevelTitle : styles.levelTitle, 
            { color: isDark ? theme.text : '#333' }
          ]}>
            Level {currentLevel}
            {levelTitle && <Text style={styles.levelSubtitle}> • {levelTitle}</Text>}
          </Text>
        </View>
        
        {showXpCounter && (
          <View style={[styles.xpContainer, { 
            backgroundColor: isDark ? 'rgba(255,249,196,0.2)' : '#FFF9C4',
            borderColor: isDark ? 'rgba(255,224,130,0.5)' : '#FFE082'
          }]}>
            <Ionicons name="flash" size={compact ? 14 : 18} color={isDark ? "#FFD700" : "#FFD700"} />
            <Text style={[
              compact ? styles.compactXpTotal : styles.xpTotal, 
              { color: isDark ? '#FFD700' : '#FF8F00' }
            ]}>
              {totalXP} XP
            </Text>
          </View>
        )}
      </View>
      
      <View style={[
        styles.progressContainer, 
        compact && styles.compactProgressContainer,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }
      ]}>
        <Animated.View style={{ width: animatedWidth, overflow: 'hidden' }}>
          <LinearGradient
            colors={isDark ? ['#388E3C', '#7CB342'] : ['#4CAF50', '#8BC34A']}
            style={[
              styles.progressBar, 
              compact && styles.compactProgressBar,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>
      
      {!compact && xpToNextLevel && nextLevelTitle && (
        <Text style={[styles.nextLevelText, { color: isDark ? theme.textSecondary : '#666' }]}>
          {xpToNextLevel} XP to Level {currentLevel + 1}: {nextLevelTitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  compactContainer: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  compactLevelTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  levelSubtitle: {
    fontWeight: '400',
    fontSize: 14,
    opacity: 0.8,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  xpTotal: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '700',
  },
  compactXpTotal: {
    marginLeft: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  compactProgressContainer: {
    height: 6,
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    width: '100%',
  },
  compactProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  nextLevelText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  justProgressBarWrapper: {
    width: '100%',
    paddingVertical: 4,
  },
  enhancedProgressContainer: {
    height: 10,
    borderRadius: 5,
    position: 'relative',
  },
  enhancedProgressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressIndicator: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 18,
    borderRadius: 4,
    transform: [{ translateX: -4 }],
  },
  minimalXpInfoContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  minimalXpText: {
    fontSize: 10,
    fontWeight: '500',
  },
});

export default LevelProgressBar; 