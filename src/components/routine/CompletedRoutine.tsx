import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { BodyArea, Duration, RoutineParams } from '../../types';
import { AppNavigationProp } from '../../types';
import { generateRoutine } from '../../utils/routineGenerator';
import { saveFavoriteRoutine } from '../../services/storageService';
import XpNotificationManager from '../notifications/XpNotificationManager';
import { useTheme } from '../../context/ThemeContext';
import { createThemedStyles } from '../../utils/themeUtils';
import { useRefresh } from '../../context/RefreshContext';
import { Toast } from 'react-native-toast-notifications';

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
  
  // State to store resolved routine data
  const [routineLength, setRoutineLength] = useState(0);
  
  // Get unlocked achievements using the custom hook
  const { unlockedAchievements } = useAchievements(levelUp);
  
  // Use streak checker to ensure streak achievements are properly updated
  useStreakChecker();
  
  // Trigger a refresh of progress data when component mounts
  useEffect(() => {
    console.log('CompletedRoutine mounted - triggering data refresh');
    triggerRefresh();
    
    // Generate routine and get length
    const loadRoutine = async () => {
      try {
        const generatedRoutine = await generateRoutine(area, duration, 'beginner');
        setRoutineLength(generatedRoutine.length);
      } catch (error) {
        console.error('Error loading routine:', error);
        setRoutineLength(0);
      }
    };
    
    loadRoutine();
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
  const showAnyLevelUp = showLevelUp;
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
  
  // Reference to Toast component - might be undefined
  const toast = useRef(null);
  
  // Add animation refs for favorite saving animation with slower values
  const favoriteAnimScale = useRef(new Animated.Value(0)).current;
  const favoriteAnimOpacity = useRef(new Animated.Value(0)).current;
  const [isSaving, setIsSaving] = useState(false);
  
  // Function to navigate properly with params
  const navigateToScreen = (screenName: string, params?: any) => {
    // Reset navigation state and navigate to the specific screen with params
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          { 
            name: screenName,
            params: params || {} 
          }
        ],
      })
    );
  };
  
  // Action handlers
  const handleNewRoutine = () => {
    triggerRefresh();
    onShowDashboard();
    navigateToScreen('Home');
  };
  
  // Safely show toast message without Alert fallback
  const showMessage = (message: string, type: 'success' | 'warning' | 'danger' = 'success') => {
    try {
      if (Toast && Toast.show) {
        Toast.show(message, {
          type: type,
          placement: 'bottom',
          duration: type === 'warning' ? 4000 : 3000,
          animationType: 'slide-in',
        });
      } else {
        // Just log if Toast is not available, no alert
        console.log(`Message (${type}):`, message);
      }
    } catch (error) {
      // Log only
      console.log('Failed to show message:', message);
    }
  };
  
  const saveToFavorites = async () => {
    if (!isPremium) {
      onOpenSubscription();
      return;
    }
    
    try {
      // Set saving state to show animation
      setIsSaving(true);
      
      // Start animation - slower and smoother
      Animated.sequence([
        Animated.parallel([
          Animated.timing(favoriteAnimScale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(favoriteAnimOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        ]),
        Animated.delay(800),
        Animated.timing(favoriteAnimOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
      
      triggerRefresh();
      const routineParams: RoutineParams = {
        area: area,
        duration: duration,
        level: 'beginner'
      };
      
      const result = await saveFavoriteRoutine(routineParams);
      
      if (result.success) {
        // Use showMessage but don't rely on it for UX flow
        showMessage(result.message || 'Routine saved to favorites!', 'success');
        
        // Wait longer for animation to complete
        setTimeout(() => {
          setIsSaving(false);
          onShowDashboard();
          
          // Navigate to Favorites tab with params indicating a newly saved routine
          navigateToScreen('Favorites', { 
            newSave: true,
            savedRoutineId: Date.now().toString(), // Use timestamp as temporary ID
            area: area,
            duration: duration
          });
        }, 1200);
      } else if (result.limitReached) {
        // Show limit reached notification
        showMessage(
          result.message || 'You have reached the maximum number of favorites (15)', 
          'warning'
        );
        setIsSaving(false);
      } else {
        // Show error but don't use Alert
        showMessage(
          result.message || 'Failed to save to favorites', 
          'danger'
        );
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error saving to favorites:', error);
      // No Alert, just log and set state
      console.log('Failed to save routine to favorites');
      setIsSaving(false);
    }
  };
  
  const startSmartPick = () => {
    if (!isPremium) {
      onOpenSubscription();
      return;
    }
    
    triggerRefresh();
    onShowDashboard();
    
    // Use the proper navigation method
    setTimeout(() => {
      try {
        navigation.dispatch(
          CommonActions.navigate({
            name: 'Routine',
            params: {
              area: 'Neck' as BodyArea,
              duration: '5' as Duration,
              level: 'beginner'
            }
          })
        );
      } catch (error) {
        console.error('Error navigating to smart pick routine:', error);
      }
    }, 100);
  };

  return (
    <View style={styles.container}>
      <XpNotificationManager />
      
      {/* Saving Animation Overlay - with improved styling */}
      {isSaving && (
        <Animated.View 
          style={[
            styles.savingOverlay,
            {
              opacity: favoriteAnimOpacity,
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.savingAnimationContainer,
              {
                transform: [{ scale: favoriteAnimScale }]
              }
            ]}
          >
            <Ionicons name="bookmark" size={70} color="#FF9800" />
            <Text style={styles.savingText}>Saving to Favorites...</Text>
          </Animated.View>
        </Animated.View>
      )}
      
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
            isSimulated={false}
            rewards={levelUp?.rewards || []}
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
          numStretches={routineLength}
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
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  savingAnimationContainer: {
    backgroundColor: theme.cardBackground,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 200,
  },
  savingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginTop: 20,
    textAlign: 'center',
  },
}));

export default CompletedRoutine;