import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BodyArea, Duration, RoutineParams } from '../../types';
import { AppNavigationProp } from '../../types';
import { generateRoutine } from '../../utils/routineGenerator';
import { saveFavoriteRoutine } from '../../services/storageService';
import XpNotificationManager from '../notifications/XpNotificationManager';
import { useTheme } from '../../context/ThemeContext';
import { createThemedStyles } from '../../utils/themeUtils';
import { useRefresh } from '../../context/RefreshContext';

// Import subcomponents from tabs
import LevelUpDisplay from './tabs/LevelUpDisplay';
import XpBreakdown from './tabs/XpBreakdown';
import SimpleXpDisplay from './tabs/SimpleXpDisplay';
import RoutineStats from './tabs/RoutineStats';
import ActionButtons from './tabs/ActionButtons';

// Import types - use type alias to avoid naming conflicts
import { CompletedRoutineProps as CompletedRoutinePropsType, RewardItem } from './types/completedRoutine.types';

// Import hooks and utilities
import { useAchievements } from './hooks/useAchievements';
import { 
  detectXpBoost, 
  calculateOriginalXp, 
  simulateLevelUpWithBoost,
  shouldShowLevelUp,
  calculateLevelDisplay
} from './utils/xpUtils';
import { useStreakChecker } from '../../hooks/progress/useStreakChecker';

// Redefine the props interface as a type that extends the imported type
type CompletedRoutineProps = CompletedRoutinePropsType;

const CompletedRoutine: React.FC<CompletedRoutineProps> = ({
  area,
  duration,
  isPremium,
  xpEarned = 0,
  xpBreakdown = [],
  levelUp,
  isXpBoosted,
  onShowDashboard,
  onNavigateHome,
  onOpenSubscription
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { theme, isDark } = useTheme();
  const { triggerRefresh } = useRefresh();
  const styles = themedStyles(theme);
  
  // Get unlocked achievements using the custom hook
  const { unlockedAchievements } = useAchievements(levelUp);
  
  // Use streak checker to ensure streak achievements are properly updated
  useStreakChecker();
  
  // Trigger a refresh of progress data when component mounts
  useEffect(() => {
    console.log('CompletedRoutine mounted - triggering data refresh');
    triggerRefresh();
  }, []);
  
  // XP and Level Up calculations
  const hasXpBoost = detectXpBoost(xpBreakdown, isXpBoosted);
  const originalXpEarned = calculateOriginalXp(xpEarned, hasXpBoost, xpBreakdown);
  const showLevelUp = shouldShowLevelUp(levelUp);
  const routine = generateRoutine(area, duration, 'beginner');
  
  // Animation references
  const boostPulseAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(-100)).current;
  const levelUpAnim = useRef(new Animated.Value(0)).current;
  const levelUpScale = useRef(new Animated.Value(0.9)).current;
  
  // Get simulated level-up and level display values
  const simulatedLevelData = simulateLevelUpWithBoost(hasXpBoost, levelUp, xpEarned);
  const showAnyLevelUp = showLevelUp || (!showLevelUp && !!simulatedLevelData);
  const { oldLevel: displayOldLevel, newLevel: displayNewLevel } = 
    calculateLevelDisplay(levelUp, simulatedLevelData, xpEarned);

  // Animation effects
  useEffect(() => {
    if (showAnyLevelUp) {
      Animated.sequence([
        Animated.timing(levelUpAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(levelUpScale, {
          toValue: 1.05,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(levelUpScale, {
          toValue: 1.03,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(levelUpScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [showAnyLevelUp]);
  
  useEffect(() => {
    if (hasXpBoost) {
      // Start boost pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(boostPulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(boostPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
  
      // Start shine animation
      Animated.loop(
        Animated.timing(shineAnim, {
          toValue: 400,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [hasXpBoost]);
  
  // Action handlers
  const handleNewRoutine = () => {
      triggerRefresh();
      onShowDashboard();
      onNavigateHome();
  };
  
  const saveToFavorites = async () => {
    if (!isPremium) {
      onOpenSubscription();
      return;
    }
    
    try {
      triggerRefresh();
      const routineParams: RoutineParams = {
        area: area,
        duration: duration,
        level: 'beginner'
      };
      
      await saveFavoriteRoutine(routineParams);
      onShowDashboard();
      onNavigateHome();
    } catch (error) {
      console.error('Error saving to favorites:', error);
    }
  };
  
  const startSmartPick = () => {
    if (!isPremium) {
      onOpenSubscription();
      return;
    }
    
    triggerRefresh();
    onShowDashboard();
    onNavigateHome();
    
    setTimeout(() => {
      try {
        navigation.navigate('Routine', {
          area: 'Neck' as BodyArea,
          duration: '5' as Duration,
          level: 'beginner'
        });
      } catch (error) {
        console.error('Error navigating to smart pick routine:', error);
      }
    }, 100);
  };

  return (
    <View style={styles.container}>
      <XpNotificationManager />
      
      <TouchableOpacity 
        style={[
          styles.completedContainer,
          showAnyLevelUp && styles.completedContainerWithLevelUp
        ]} 
        activeOpacity={1}
        onPress={() => {
          triggerRefresh();
          onShowDashboard();
        }}
      >
        <Ionicons name="checkmark-circle" size={showAnyLevelUp ? 60 : 80} color={theme.success} />
        <Text style={styles.completedTitle}>Routine Complete!</Text>
        <Text style={[
          styles.completedSubtitle, 
          showAnyLevelUp && styles.reducedMargin
        ]}>Great job on your stretching routine</Text>
        
        {/* Level Up Section */}
        {showAnyLevelUp && (
          <LevelUpDisplay 
            oldLevel={displayOldLevel}
            newLevel={displayNewLevel}
            isDark={isDark}
            isSimulated={!!simulatedLevelData}
            rewards={(simulatedLevelData?.rewards as RewardItem[]) || levelUp?.rewards}
            animValues={{
              levelUpAnim,
              levelUpScale
            }}
          />
        )}
        
        {/* XP Display */}
        {xpBreakdown && xpBreakdown.length > 0 ? (
          <XpBreakdown 
            xpBreakdown={xpBreakdown}
            unlockedAchievements={unlockedAchievements}
            hasXpBoost={hasXpBoost}
            showAnyLevelUp={showAnyLevelUp}
            theme={theme}
            animValues={{
              shineAnim
            }}
          />
        ) : (
          <SimpleXpDisplay 
            xpEarned={xpEarned}
            originalXpEarned={originalXpEarned}
            hasXpBoost={hasXpBoost}
            showAnyLevelUp={showAnyLevelUp}
            theme={theme}
            animValues={{
              boostPulseAnim
            }}
          />
        )}
        
        {/* Routine Stats */}
        <RoutineStats 
          area={area}
          duration={duration}
          numStretches={routine.length}
          showAnyLevelUp={showAnyLevelUp}
          theme={theme}
        />
        
        <Text style={[
          styles.nextStepsText,
          showAnyLevelUp && styles.nextStepsTextCompact
        ]}>What would you like to do next?</Text>
        
        {/* Action Buttons */}
        <ActionButtons 
          isPremium={isPremium}
          showAnyLevelUp={showAnyLevelUp}
          theme={theme}
          onSaveToFavorites={saveToFavorites}
          onSmartPick={startSmartPick}
          onNewRoutine={handleNewRoutine}
          onOpenSubscription={onOpenSubscription}
        />
        
        {/* Tap anywhere to continue indicator */}
        <View style={styles.tapIndicatorContainer}>
          <Ionicons name="finger-print-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.tapIndicatorText}>Tap anywhere to continue</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Use the createThemedStyles function to create styles that adapt to the theme
const themedStyles = createThemedStyles(theme => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.cardBackground,
  },
  completedContainerWithLevelUp: {
    paddingTop: 15,
    paddingBottom: 15,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: theme.text,
  },
  completedSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: theme.textSecondary,
  },
  reducedMargin: {
    marginBottom: 12,
  },
  nextStepsText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: theme.text,
  },
  nextStepsTextCompact: {
    fontSize: 16,
    marginBottom: 12,
  },
  tapIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  tapIndicatorText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginLeft: 6,
  },
}));

export default CompletedRoutine;