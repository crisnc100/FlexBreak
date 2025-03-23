import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SubscriptionModal from '../components/SubscriptionModal';
import SmartPickModal from '../components/SmartPickModal';
import { usePremium } from '../context/PremiumContext';
import { useRefresh } from '../context/RefreshContext';
import { BodyArea, Duration, ProgressEntry, StretchLevel } from '../types';

// Import our components
import ActiveRoutine from '../components/routine/ActiveRoutine';
import CompletedRoutine from '../components/routine/CompletedRoutine';
import RoutineDashboard from '../components/routine/RoutineDashboard';
import XpNotificationManager from '../components/notifications/XpNotificationManager';

// Import our custom hooks
import { useRoutineParams } from '../hooks/routines/useRoutineParams';
import { useRoutineStorage } from '../hooks/routines/useRoutineStorage';
import { useRoutineSuggestions } from '../hooks/routines/useRoutineSuggestions';
import { useGamification } from '../hooks/progress/useGamification';
import { useTheme } from '../context/ThemeContext';
import { useChallengeSystem } from '../hooks/progress/useChallengeSystem';

// Import XP boost manager
import * as xpBoostManager from '../utils/progress/xpBoostManager';
import * as storageService from '../services/storageService';

// Define the possible screens in the routine flow
type RoutineScreenState = 'DASHBOARD' | 'ACTIVE' | 'COMPLETED' | 'LOADING';

// Add type for the levelUp prop to match CompletedRoutineProps
type LevelUpData = {
  oldLevel: number;
  newLevel: number;
  rewards?: Array<{
    id: string;
    name: string;
    description: string;
    type: 'feature' | 'item' | 'cosmetic';
  }>;
};

export default function RoutineScreen() {
  // Use our custom hooks
  const { area, duration, level, hasParams, navigateToHome, resetParams, navigateToRoutine } = useRoutineParams();
  const { 
    recentRoutines, 
    isLoading: isStorageLoading, 
    saveRoutineProgress, 
    hideRoutine,
    getAllRoutines 
  } = useRoutineStorage();
  const { suggestions, isLoading: isSuggestionsLoading } = useRoutineSuggestions();
  
  // Replace progressSystem with useGamification
  const { 
    processRoutine, 
    isLoading: isGamificationLoading,
    recentlyUnlockedAchievements,
    recentlyCompletedChallenges,
    recentlyUnlockedRewards
  } = useGamification();
  
  // Add useChallengeSystem hook to update challenge progress
  const { updateChallengeProgress } = useChallengeSystem();
  
  // Get premium status from context
  const { isPremium } = usePremium();
  
  // Get refresh functionality from context
  const { isRefreshing, refreshRoutine } = useRefresh();
  
  // Get theme context for refreshing access to dark theme
  const { refreshThemeAccess, themeType, setThemeType } = useTheme();
  
  // Single screen state to track what we're showing
  const [screenState, setScreenState] = useState<RoutineScreenState>('LOADING');
  
  // Modal visibility state
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [smartPickModalVisible, setSmartPickModalVisible] = useState(false);
  
  // Add state for XP earned
  const [routineXpEarned, setRoutineXpEarned] = useState(0);
  
  // Add state for storing XP breakdown
  const [xpBreakdown, setXpBreakdown] = useState<Array<{ source: string; amount: number; description: string }>>([]);
  
  // Add state for level-up data
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);
  
  // Add state for XP boost
  const [isXpBoosted, setIsXpBoosted] = useState<boolean>(false);
  
  // Effect for initial load and param changes
  useEffect(() => {
    // If we have params, we should show the active routine
    if (hasParams && screenState !== 'COMPLETED') {
      console.log('We have params, showing active routine:', area, duration, level);
      setScreenState('ACTIVE');
    } 
    // If we don't have params and we're not on the completion screen, show dashboard
    else if (!hasParams && screenState !== 'COMPLETED') {
      console.log('No params, showing dashboard');
      setScreenState('DASHBOARD');
    }
  }, [hasParams, area, duration, level]);
  
  // Handle focus changes from tab navigation
  useFocusEffect(
    React.useCallback(() => {
      console.log('Routine screen focused with state:', screenState, 'hasParams:', hasParams);
      
      // The important thing is that when returning to this tab,
      // we should show the dashboard unless we're in the middle of a routine
      if (screenState === 'LOADING') {
        setScreenState('DASHBOARD');
      }
      
      return () => {
        // This runs when the screen loses focus
        console.log('Routine screen lost focus');
      };
    }, [screenState, hasParams])
  );
  
  // Handle routine completion
  const handleRoutineComplete = async (routineArea: BodyArea, routineDuration: Duration, stretchCount: number = 5, hasAdvancedStretch: boolean = false) => {
    console.log('Routine completed');
    
    try {
      // Save to recent routines
      const entry = {
        area: routineArea,
        duration: routineDuration,
        date: new Date().toISOString(),
        stretchCount: stretchCount
      };
      
      await saveRoutineProgress(entry);
      console.log('Routine saved successfully');
      
      // Check if XP boost is active
      const { isActive: isXpBoostActive, data: xpBoostData } = await xpBoostManager.checkXpBoostStatus();
      const xpMultiplier = isXpBoostActive ? xpBoostData.multiplier : 1;
      setIsXpBoosted(isXpBoostActive);
      console.log('XP Boost active:', isXpBoostActive);
      
      // Refresh theme access to check if user unlocked dark theme
      await refreshThemeAccess();
      console.log('Theme access refreshed after routine completion');
      
      // Use the new gamification system to process the routine
      try {
        // Process the routine through the gamification system
        const result = await processRoutine(entry);
        
        // CRITICAL FIX: Explicitly update challenge progress after routine completion
        console.log('Explicitly updating challenge progress after routine completion');
        updateChallengeProgress();
        
        if (result && result.success) {
          // Create an XP breakdown array based on the actual XP earned
          const breakdownItems: Array<{ source: string; amount: number; description: string }> = [];
          let totalXpEarned = 0;
          
          // Check if XP boost is active
          const { isActive: isXpBoostActive, data: xpBoostData } = await xpBoostManager.checkXpBoostStatus();
          const xpMultiplier = isXpBoostActive ? xpBoostData.multiplier : 1;
          setIsXpBoosted(isXpBoostActive);
          
          // Check if this was the first routine of day (base XP > 0)
          const isFirstOfDay = result.xpEarned > 0;
          
          if (isFirstOfDay) {
            // Determine base routine XP (only if this is first routine of day)
            let routineBaseXP = 0;
            if (Number(routineDuration) <= 5) routineBaseXP = 30;
            else if (Number(routineDuration) <= 10) routineBaseXP = 60;
            else routineBaseXP = 90;
            
            // Adjust for XP boost if active
            let boostedBaseXP = routineBaseXP;
            let routineDesc = `${routineDuration}-Minute Routine`;
            
            if (isXpBoostActive) {
              boostedBaseXP = Math.floor(routineBaseXP * xpMultiplier);
              routineDesc = `${routineDuration}-Minute Routine (2x XP Boost Applied)`;
            }
            
            // Add routine base XP
            breakdownItems.push({
              source: 'routine',
              amount: boostedBaseXP,
              description: routineDesc
            });
            totalXpEarned += boostedBaseXP;
            
            // If there's exactly 50 XP more than boosted base, it's likely the first ever routine
            if (result.xpEarned === boostedBaseXP + 50) {
              breakdownItems.push({
                source: 'first_ever',
                amount: 50,
                description: 'Welcome Bonus: First Ever Stretch!'
              });
              totalXpEarned += 50;
            }
          } else {
            // If no base XP earned, add a note explaining why
            breakdownItems.push({
              source: 'routine',
              amount: 0,
              description: 'Not the first routine today (XP already earned today)'
            });
          }
          
          // Add achievement bonuses if any were unlocked - these always count even if not first of day
          if (result.unlockedAchievements && result.unlockedAchievements.length > 0) {
            result.unlockedAchievements.forEach(achievement => {
              // Apply XP boost to achievement XP if active
              let achievementXP = achievement.xp;
              let achievementDesc = `Achievement: ${achievement.title}`;
              
              if (isXpBoostActive) {
                achievementXP = Math.floor(achievement.xp * xpMultiplier);
                achievementDesc = `Achievement: ${achievement.title} (2x XP Boost Applied)`;
              }
              
              breakdownItems.push({
                source: 'achievement',
                amount: achievementXP,
                description: achievementDesc
              });
              totalXpEarned += achievementXP;
            });
          }
          
          // Set the total XP earned - this should be the actual total from all sources
          setRoutineXpEarned(totalXpEarned);
          
          // Set the breakdown
          setXpBreakdown(breakdownItems);
          
          // Log results
          console.log(`Total XP earned: ${totalXpEarned}`);
          console.log('XP Breakdown:', breakdownItems);
          console.log('XP Boost active:', isXpBoostActive, 'Multiplier:', xpMultiplier);
          
          // ===== SIMPLIFIED LEVEL-UP DETECTION =====
          // Import needed functions to check XP thresholds
          const { getUserProgress } = require('../services/storageService');
          const { LEVELS } = require('../utils/progress/xpManager');
          const userProgress = await getUserProgress();
          
          // Get XP values - handle both regular and testing property names
          const previousXp = userProgress.xp !== undefined 
            ? userProgress.xp - totalXpEarned 
            : userProgress.totalXP !== undefined 
              ? userProgress.totalXP - totalXpEarned 
              : 0;
              
          const currentXp = userProgress.xp !== undefined 
            ? userProgress.xp 
            : userProgress.totalXP !== undefined 
              ? userProgress.totalXP 
              : 0;
          
          // Get level thresholds for detection
          const xpThresholds = LEVELS.map(level => level.xpRequired);
          const previousLevelThreshold = xpThresholds[userProgress.level - 1] || 0;
          
          // Log basic level detection info
          console.log('Level detection - Current level:', userProgress.level);
          console.log(`XP progress: ${previousXp} → ${currentXp}`);
                    
          // ===== LEVEL-UP DETECTION STRATEGIES =====
          // Strategy 1: Direct flag from gamification system
          const hasDirectLevelUpFlag = result.levelUp === true;
          
          // Strategy 2: Check if we crossed a level threshold with this routine's XP
          const crossedThreshold = previousXp < previousLevelThreshold && currentXp >= previousLevelThreshold;
          
          // Strategy 3: Check for dark theme unlock (reliable indicator for level 2)
          const justUnlockedDarkTheme = result.unlockedRewards && 
                                       result.unlockedRewards.some(r => 
                                         r.id === 'dark_theme' || 
                                         (r.title && r.title.includes('Dark Theme')));
          
          // Strategy 4: Check for explicit level up message in result
          const hasLevelUpMessage = JSON.stringify(result).includes('Level Up');
          
          // Strategy 5: Check for testing flag that might be set
          const hasTestLevelUp = (userProgress as any).testLevelUp === true;
          
          // Reset the test flag if it exists to avoid persistence
          if (hasTestLevelUp) {
            console.log('🧪 Detected testing level-up flag - will reset after use');
            try {
              (userProgress as any).testLevelUp = false;
              await storageService.saveUserProgress(userProgress);
            } catch (err) {
              console.log('Error resetting test level-up flag:', err);
            }
          }
          
          // Make the final decision based on all strategies
          const hasLeveledUp = hasDirectLevelUpFlag || 
                              crossedThreshold ||
                              justUnlockedDarkTheme ||
                              hasLevelUpMessage || 
                              hasTestLevelUp ||
                              // Special case for level 2
                              (userProgress.level === 2 && previousXp < 250 && currentXp >= 250);
          
          console.log(`Level-up detected: ${hasLeveledUp}`);
          
          // Set previous and new level based on our detection
          const previousLevel = hasLeveledUp ? userProgress.level - 1 : userProgress.level;
          const newLevel = userProgress.level;
          
          // Extract level-up information if available
          let levelUpInfo: LevelUpData | null = null;
          
          if (hasLeveledUp) {
            console.log(`🎉 Level Up detected! ${previousLevel} → ${newLevel}`);
            
            // Create the levelUp object to pass to CompletedRoutine with accurate levels
            levelUpInfo = {
              oldLevel: previousLevel,
              newLevel: newLevel,
              rewards: []
            };
            
            // Handle level-specific rewards
            if (newLevel === 2) {
              console.log('Adding Dark Theme reward for level 2');
              levelUpInfo.rewards.push({
                id: 'dark_theme',
                name: 'Dark Theme',
                description: 'Enable a sleek dark mode for comfortable evening stretching',
                type: 'feature'
              });
            } else if (newLevel === 3) {
              console.log('Adding Custom Reminders reward for level 3');
              levelUpInfo.rewards.push({
                id: 'custom_reminders',
                name: 'Custom Reminders',
                description: 'Set personalized reminders with custom messages',
                type: 'feature'
              });
            } else if (newLevel === 4) {
              console.log('Adding XP Boost reward for level 4');
              levelUpInfo.rewards.push({
                id: 'xp_boost',
                name: 'XP Boost',
                description: 'Get a 2x boost in XP for your daily streak',
                type: 'feature'
              });
            } else if (newLevel === 5) {
              console.log('Adding Custom Routines reward for level 5');
              levelUpInfo.rewards.push({
                id: 'custom_routines',
                name: 'Custom Routines',
                description: 'Create and save your own personalized stretching routines',
                type: 'feature'
              });
            } else if (newLevel >= 6) {
              console.log(`Adding reward for level ${newLevel}`);
              levelUpInfo.rewards.push({
                id: `level_${newLevel}_reward`,
                name: `Level ${newLevel} Reward`,
                description: `Special features unlocked at level ${newLevel}`,
                type: 'feature'
              });
            }
            
            // Look for additional rewards from the result
            const resultRewards = result.unlockedRewards || 
                           (result as any).newlyUnlockedRewards || 
                           [];
            
            // Add any missing rewards from the result
            if (resultRewards && resultRewards.length > 0) {
              for (const reward of resultRewards) {
                // Skip if we already have a reward with this ID
                if (levelUpInfo.rewards.some(r => r.id === reward.id)) {
                  continue;
                }
                
                // Extract reward details, providing defaults if properties don't exist
                const rewardName = reward.title || reward.name || 'New Reward';
                console.log(`Reward unlocked: ${rewardName} (Level ${newLevel})`);
                
                // Ensure the type is one of the allowed values
                let rewardType: 'feature' | 'item' | 'cosmetic' = 'feature';
                if (reward.type === 'item' || reward.type === 'cosmetic') {
                  rewardType = reward.type;
                } else if (reward.type === 'app_feature') {
                  rewardType = 'feature';
                }
                
                levelUpInfo.rewards.push({
                  id: reward.id || `reward-${Date.now()}`,
                  name: rewardName,
                  description: reward.description || `Unlocked at level ${newLevel}`,
                  type: rewardType
                });
              }
            }
          } else {
            console.log('No level up detected in this routine completion. Current level:', newLevel);
          }
          
          // Check if dark theme was unlocked and set it automatically
          const hasDarkThemeReward = levelUpInfo?.rewards?.some(r => r.id === 'dark_theme');
          if (hasDarkThemeReward && isPremium) {
            console.log('Dark theme unlocked! Setting theme to dark automatically');
            // Allow a moment for the context to update permissions
            setTimeout(() => {
              // Force refresh theme access before attempting to change the theme
              refreshThemeAccess().then(() => {
                // Only set to dark if not already dark
                if (themeType !== 'dark') {
                  console.log('Changing theme to dark mode');
                  setThemeType('dark');
                }
              });
            }, 500);
          }
          
          // Store level-up data in component state
          setLevelUpData(levelUpInfo);
          console.log('Level-up data being passed to CompletedRoutine:', JSON.stringify(levelUpInfo, null, 2));
          
          // Check for completed challenges
          if (result.completedChallenges.length > 0) {
            console.log(`Completed ${result.completedChallenges.length} challenges!`);
            // CRITICAL FIX: Log challenge details for debugging
            result.completedChallenges.forEach((challenge, index) => {
              console.log(`Challenge ${index + 1}: ${challenge.title} - ${challenge.description} (${challenge.progress}/${challenge.requirement})`);
            });
          }
          
          // Check for unlocked achievements
          if (result.unlockedAchievements.length > 0) {
            console.log(`Unlocked ${result.unlockedAchievements.length} achievements!`);
          }
          
          // Check for unlocked rewards
          if (result.unlockedRewards.length > 0) {
            console.log(`Unlocked ${result.unlockedRewards.length} rewards!`);
          }
        } else {
          // If processing failed, set a default XP
          console.error('Error processing routine in gamification system');
          setRoutineXpEarned(50); // Default fallback XP value
          setXpBreakdown([{ source: 'routine', amount: 50, description: 'Stretching Routine' }]);
        }
      } catch (error) {
        console.error('Error processing routine:', error);
        // Set a default XP amount in case of error
        setRoutineXpEarned(50); // Default fallback XP value
        setXpBreakdown([{ source: 'routine', amount: 50, description: 'Stretching Routine' }]);
      }
      
      // Update state to show completed screen
      setScreenState('COMPLETED');
    } catch (error) {
      console.error('Error saving routine:', error);
      // Even on error, still show the completed screen
      setScreenState('COMPLETED');
      // Set a default XP in case of error
      setRoutineXpEarned(50); // Default fallback XP value
      setXpBreakdown([{ source: 'routine', amount: 50, description: 'Stretching Routine' }]);
    }
  };
  
  // FIXED: Reset level-up data when returning to dashboard
  const showDashboard = () => {
    setScreenState('DASHBOARD');
    setLevelUpData(null); // Reset level-up data when changing screens
  };
  
  // Handle smart pick modal
  const handleSmartPickTap = () => {
    console.log('Smart Pick tapped, isPremium:', isPremium);
    if (!isPremium) {
      setSmartPickModalVisible(true);
    } else {
      // TODO: Implement smart pick for premium users
      console.log('Smart pick for premium users not implemented yet');
    }
  };

  // Handle starting a recent routine
  const handleStartRecentRoutine = (routine: ProgressEntry) => {
    console.log('Starting recent routine:', routine);
    
    // Clear current state first
    resetParams();
    
    // Navigate to home to ensure clean navigation stack
    navigateToHome();
    
    // Navigate to the routine screen with new params
    setTimeout(() => {
      console.log('Navigating to routine with params:', routine.area, routine.duration);
      // Navigate to routine with the parameters from the selected routine
      navigateToRoutine({
        area: routine.area,
        duration: routine.duration,
        level: 'beginner' // Default to beginner for recent routines
      });
    }, 100);
  };

  // Handle random suggestion
  const handleRandomSuggestion = () => {
    if (suggestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * suggestions.length);
      const suggestion = suggestions[randomIndex];
      console.log('Starting random suggestion:', suggestion);
      
      // Clear current state first
      resetParams();
      
      // Navigate to home to ensure clean navigation stack
      navigateToHome();
      
      // Navigate to the routine screen with random suggestion params
      setTimeout(() => {
        console.log('Navigating to routine with suggestion params:', suggestion.area, suggestion.duration);
        // Navigate to routine with the suggestion parameters
        navigateToRoutine({
          area: suggestion.area,
          duration: suggestion.duration,
          level: 'beginner' // Default to beginner for suggestions
        });
      }, 100);
    }
  };

  // FIXED: Reset level-up data when creating a new routine
  const handleCreateNewRoutine = () => {
    resetParams();
    setScreenState('DASHBOARD');
    setLevelUpData(null); // Reset level-up data when starting a new routine
    navigateToHome();
  };

  // Handle hiding a routine from view (but keep it for stats)
  const handleHideRoutine = async (routineDate: string) => {
    try {
      await hideRoutine(routineDate);
      console.log('Routine hidden successfully');
      } catch (error) {
      console.error('Error hiding routine:', error);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    console.log('Performing comprehensive routine screen refresh...');
    
    try {
      // First refresh the routine data
      await refreshRoutine();
      console.log('Routine data refreshed');
      
      // Then reload suggestions if needed
      if (suggestions.length === 0) {
        console.log('No suggestions found, attempting to reload...');
        // You might need to add a method to reload suggestions in the useRoutineSuggestions hook
      }
      
      // Add any other data refresh logic here
      
      console.log('Comprehensive routine screen refresh complete');
    } catch (error) {
      console.error('Error during routine screen refresh:', error);
    }
  };
  
  // Handle skipping an exercise
  const skipCurrentExercise = () => {
    setLevelUpData(null); // Reset level-up data when skipping exercises
    // ... existing code ...
  };

  // Handle discarding a routine
  const discardRoutine = () => {
    setScreenState('DASHBOARD');
    setLevelUpData(null); // Reset level-up data when discarding a routine
    navigateToHome();
  };
  
  // ============= RENDERING LOGIC =============
  
  // Render loading state
  if (screenState === 'LOADING' || isStorageLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Render dashboard
  if (screenState === 'DASHBOARD') {
    return (
      <SafeAreaView style={styles.container}>
        <XpNotificationManager />
        <RoutineDashboard 
          recentRoutines={recentRoutines}
          isPremium={isPremium}
          isLoading={isSuggestionsLoading}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onStartRecent={handleStartRecentRoutine}
          onRandomSuggestion={handleRandomSuggestion}
          onSmartPick={handleSmartPickTap}
          onCreateNew={handleCreateNewRoutine}
          onDeleteRoutine={handleHideRoutine}
        />
        
        <SubscriptionModal 
          visible={subscriptionModalVisible}
          onClose={() => setSubscriptionModalVisible(false)}
        />
        
        <SmartPickModal
          visible={smartPickModalVisible}
          onClose={() => setSmartPickModalVisible(false)}
          onUpgrade={() => {
            setSmartPickModalVisible(false);
            setSubscriptionModalVisible(true);
          }}
        />
      </SafeAreaView>
    );
  }
  
  // Render completed routine
  if (screenState === 'COMPLETED') {
    console.log('Rendering COMPLETED state with the following level-up data:', 
      levelUpData ? JSON.stringify(levelUpData, null, 2) : 'null');
    
    return (
      <SafeAreaView style={styles.container}>
        <CompletedRoutine 
          area={area as BodyArea}
          duration={duration as Duration}
          isPremium={isPremium}
          xpEarned={routineXpEarned}
          xpBreakdown={xpBreakdown}
          levelUp={levelUpData}
          isXpBoosted={isXpBoosted}
          onShowDashboard={showDashboard}
          onNavigateHome={handleCreateNewRoutine}
          onOpenSubscription={() => setSubscriptionModalVisible(true)}
        />
        
        <SubscriptionModal 
          visible={subscriptionModalVisible}
          onClose={() => setSubscriptionModalVisible(false)}
        />
        
        <SmartPickModal
          visible={smartPickModalVisible}
          onClose={() => setSmartPickModalVisible(false)}
          onUpgrade={() => {
            setSmartPickModalVisible(false);
            setSubscriptionModalVisible(true);
          }}
        />
      </SafeAreaView>
    );
  }
  
  // Render active routine
  if (screenState === 'ACTIVE') {
    return (
      <SafeAreaView style={styles.container}>
        <XpNotificationManager />
        <ActiveRoutine 
          area={area as BodyArea}
          duration={duration as Duration}
          level={level as StretchLevel}
          onComplete={handleRoutineComplete}
          onNavigateHome={handleCreateNewRoutine}
        />
        
        <SubscriptionModal 
          visible={subscriptionModalVisible}
          onClose={() => setSubscriptionModalVisible(false)}
        />
        
        <SmartPickModal
          visible={smartPickModalVisible}
          onClose={() => setSmartPickModalVisible(false)}
          onUpgrade={() => {
            setSmartPickModalVisible(false);
            setSubscriptionModalVisible(true);
          }}
        />
      </SafeAreaView>
    );
  }
  
  // Default return (should never happen, but needed for typechecking)
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    marginTop: 20,
  },
});