import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SubscriptionModal from '../components/SubscriptionModal';
import SmartPickModal from '../components/SmartPickModal';
import { usePremium } from '../context/PremiumContext';
import { useRefresh } from '../context/RefreshContext';
import { BodyArea, Duration, ProgressEntry, StretchLevel } from '../types';
import { UserProgress } from '../utils/progress/types';

// Import our components
import ActiveRoutine from '../components/routine/ActiveRoutine';
import CompletedRoutine from '../components/routine/CompletedRoutine';
import RoutineDashboard from '../components/routine/RoutineDashboard';
import XpNotificationManager from '../components/XpNotificationManager';

// Import our custom hooks
import { useRoutineParams } from '../hooks/useRoutineParams';
import { useRoutineStorage } from '../hooks/useRoutineStorage';
import { useRoutineSuggestions } from '../hooks/useRoutineSuggestions';
import { useGamification } from '../hooks/useGamification';
import { useTheme } from '../context/ThemeContext';

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
  
  // Get premium status from context
  const { isPremium } = usePremium();
  
  // Get refresh functionality from context
  const { isRefreshing, refreshRoutine } = useRefresh();
  
  // Get theme context for refreshing access to dark theme
  const { refreshThemeAccess } = useTheme();
  
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
      
      // Refresh theme access to check if user unlocked dark theme
      await refreshThemeAccess();
      console.log('Theme access refreshed after routine completion');
      
      // Use the new gamification system to process the routine
      try {
        // Process the routine through the gamification system
        const result = await processRoutine(entry);
        
        if (result && result.success) {
          // Create an XP breakdown array based on the actual XP earned
          const breakdownItems: Array<{ source: string; amount: number; description: string }> = [];
          let totalXpEarned = 0;
          
          // Check if this was the first routine of day (base XP > 0)
          const isFirstOfDay = result.xpEarned > 0;
          
          if (isFirstOfDay) {
            // Determine base routine XP (only if this is first routine of day)
            let routineBaseXP = 0;
            if (Number(routineDuration) <= 5) routineBaseXP = 30;
            else if (Number(routineDuration) <= 10) routineBaseXP = 60;
            else routineBaseXP = 90;
            
            // Add routine base XP
            breakdownItems.push({
              source: 'routine',
              amount: routineBaseXP,
              description: `${routineDuration}-Minute Routine`
            });
            totalXpEarned += routineBaseXP;
            
            // If there's exactly 50 XP more than base, it's likely the first ever routine
            if (result.xpEarned === routineBaseXP + 50) {
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
              breakdownItems.push({
                source: 'achievement',
                amount: achievement.xp,
                description: `Achievement: ${achievement.title}`
              });
              totalXpEarned += achievement.xp;
            });
          }
          
          // Set the total XP earned - this should be the actual total from all sources
          setRoutineXpEarned(totalXpEarned);
          
          // Set the breakdown
          setXpBreakdown(breakdownItems);
          
          // Log results
          console.log(`Total XP earned: ${totalXpEarned}`);
          console.log('XP Breakdown:', breakdownItems);
          
          // Extract level-up information if available
          let levelUpInfo: LevelUpData | null = null;
          
          // Check if we have a level-up condition - only if result.levelUp is strictly true
          if (result.levelUp === true && result.newLevel > ((result as any).previousLevel || 0)) {
            // Calculate oldLevel from the result's previousLevel property
            const oldLevel = (result as any).previousLevel || (result.newLevel > 1 ? result.newLevel - 1 : 1);
            console.log(`🎉 Level Up! ${oldLevel} → ${result.newLevel}`);
            console.log('Level up data detected, result content:', JSON.stringify(result, null, 2));
            
            // Create the levelUp object to pass to CompletedRoutine
            levelUpInfo = {
              oldLevel: oldLevel,
              newLevel: result.newLevel,
              rewards: []
            };
            
            // Handle different property names for rewards in the result
            const rewards = result.unlockedRewards || 
                           (result as any).newlyUnlockedRewards || 
                           [];
            
            // Add unlocked rewards if any
            if (rewards && rewards.length > 0) {
              // Create properly typed rewards array
              levelUpInfo.rewards = rewards.map(reward => {
                // Extract reward details, providing defaults if properties don't exist
                const rewardName = reward.title || reward.name || 'New Reward';
                console.log(`Reward unlocked: ${rewardName} (Level ${result.newLevel})`);
                
                // Ensure the type is one of the allowed values
                let rewardType: 'feature' | 'item' | 'cosmetic' = 'feature';
                if (reward.type === 'item' || reward.type === 'cosmetic') {
                  rewardType = reward.type;
                } else if (reward.type === 'app_feature') {
                  rewardType = 'feature';
                }
                
                return {
                  id: reward.id || `reward-${Date.now()}`,
                  name: rewardName,
                  description: reward.description || `Unlocked at level ${result.newLevel}`,
                  type: rewardType
                };
              });
            }
            
            // If we have a level up but no rewards, create a fake reward for dark mode
            // This is a fallback for testing
            if (levelUpInfo.rewards.length === 0 && result.newLevel === 2) {
              console.log('Adding fallback reward for Dark Theme at level 2');
              levelUpInfo.rewards.push({
                id: 'dark_theme',
                name: 'Dark Theme',
                description: 'Enable a sleek dark mode for comfortable evening stretching',
                type: 'feature'
              });
            }
          } else {
            console.log('No level up detected in result. levelUp:', result.levelUp);
            
            // Check if user is already at level 2 and has unlocked dark theme
            // This ensures we show the level-up UI for level 2 users who have dark theme
            if (result.newLevel === 2 || (result as any).level === 2) {
              console.log('User is at level 2, checking if dark theme is unlocked');
              
              // Check if dark theme is in the unlocked rewards
              const hasUnlockedDarkTheme = result.unlockedRewards && 
                result.unlockedRewards.some((r: any) => r.id === 'dark_theme' || r.title === 'Dark Theme');
              
              if (hasUnlockedDarkTheme || isPremium) {
                console.log('Creating level-up data for already unlocked dark theme');
                levelUpInfo = {
                  oldLevel: 1,
                  newLevel: 2,
                  rewards: [{
                    id: 'dark_theme',
                    name: 'Dark Theme',
                    description: 'Enable a sleek dark mode for comfortable evening stretching',
                    type: 'feature'
                  }]
                };
              }
            }
          }
          
          // Store level-up data in component state
          setLevelUpData(levelUpInfo);
          console.log('Level-up data being passed to CompletedRoutine:', JSON.stringify(levelUpInfo, null, 2));
          
          // For testing: Force a level-up UI if none is detected but XP is earned
          // Remove this in production
          if (!levelUpInfo && result.xpEarned > 0) {
            console.log('XP earned but no level-up data, checking user progress for rewards...');
            
            try {
              // Import storageService to get user progress
              const { getUserProgress } = require('../services/storageService');
              const userProgress = await getUserProgress();
              
              console.log('Current user level:', userProgress.level);
              
              // If user is level 2 or higher, show the dark theme reward
              if (userProgress.level >= 2) {
                console.log('User is level 2+, creating level-up info with dark theme');
                const mockLevelUpData: LevelUpData = {
                  oldLevel: 1,
                  newLevel: 2,
                  rewards: [{
                    id: 'dark_theme',
                    name: 'Dark Theme',
                    description: 'Enable a sleek dark mode for comfortable evening stretching',
                    type: 'feature'
                  }]
                };
                setLevelUpData(mockLevelUpData);
                console.log('Created level-up data for dark theme:', JSON.stringify(mockLevelUpData, null, 2));
              }
            } catch (error) {
              console.error('Error checking user progress:', error);
            }
          }
          
          // Check for completed challenges
          if (result.completedChallenges.length > 0) {
            console.log(`Completed ${result.completedChallenges.length} challenges!`);
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
  
  // Handle showing the dashboard
  const showDashboard = () => {
    console.log('Showing dashboard');
    setScreenState('DASHBOARD');
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

  // Handle creating a new routine
  const handleCreateNewRoutine = () => {
    console.log('Creating new routine, resetting state and navigating home');
    
    // Reset all routine parameters
    resetParams();
    
    // Reset screen state to dashboard for when we return
    setScreenState('DASHBOARD');
    
    // Navigate to home screen to create a new routine
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
    return (
      <SafeAreaView style={styles.container}>
        <CompletedRoutine 
          area={area as BodyArea}
          duration={duration as Duration}
          isPremium={isPremium}
          xpEarned={routineXpEarned}
          xpBreakdown={xpBreakdown}
          levelUp={levelUpData}
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