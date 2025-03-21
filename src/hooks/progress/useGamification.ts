import { useState, useEffect, useCallback } from 'react';
import { ProgressEntry, Challenge, Achievement, Reward } from '../../utils/progress/types';
import * as gamificationManager from '../../utils/progress/gamificationManager';
import * as storageService from '../../services/storageService';

/**
 * Hook for interacting with the gamification system
 */
export function useGamification() {
  const [isLoading, setIsLoading] = useState(true);
  const [level, setLevel] = useState(1);
  const [totalXP, setTotalXP] = useState(0);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [percentToNextLevel, setPercentToNextLevel] = useState(0);
  const [recentlyUnlockedAchievements, setRecentlyUnlockedAchievements] = useState<Achievement[]>([]);
  const [recentlyCompletedChallenges, setRecentlyCompletedChallenges] = useState<Challenge[]>([]);
  const [recentlyUnlockedRewards, setRecentlyUnlockedRewards] = useState<Reward[]>([]);
  const [claimableChallenges, setClaimableChallenges] = useState<Challenge[]>([]);
  const [gamificationSummary, setGamificationSummary] = useState<any>(null);
  
  // Load initial gamification data
  useEffect(() => {
    loadGamificationData();
  }, []);
  
  // Load all gamification data
  const loadGamificationData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get level info from storage directly to avoid reprocessing routines
      const userProgress = await storageService.getUserProgress();
      const levelInfo = await gamificationManager.getUserLevelInfo();
      setLevel(levelInfo.level);
      setTotalXP(levelInfo.totalXP);
      setXpToNextLevel(levelInfo.xpToNextLevel);
      setPercentToNextLevel(levelInfo.percentToNextLevel);
      
      // Get full summary
      const summary = await gamificationManager.getGamificationSummary();
      setGamificationSummary(summary);
      
      // Get claimable challenges
      const claimable = summary.challenges.claimable;
      setClaimableChallenges(claimable);
      
      // Clear any previously displayed notifications
      setRecentlyUnlockedAchievements([]);
      setRecentlyCompletedChallenges([]);
      setRecentlyUnlockedRewards([]);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Public function for refreshing data only (no processing)
  const refreshData = useCallback(async () => {
    await loadGamificationData();
  }, [loadGamificationData]);
  
  // Process a completed routine
  const processRoutine = useCallback(async (routine: ProgressEntry) => {
    setIsLoading(true);
    try {
      // Process through the gamification system
      const result = await gamificationManager.processCompletedRoutine(routine);
      console.log('Raw result from gamificationManager.processCompletedRoutine:', JSON.stringify(result, null, 2));
      
      // Update state with results
      if (result.xpEarned > 0) {
        setTotalXP(prev => prev + result.xpEarned);
      }
      
      if (result.levelUp) {
        console.log('Level up detected in useGamification.processRoutine!');
        setLevel(result.newLevel);
      }
      
      // Set notifications for UI
      setRecentlyUnlockedAchievements(result.unlockedAchievements);
      setRecentlyCompletedChallenges(result.completedChallenges);
      setRecentlyUnlockedRewards(result.newlyUnlockedRewards);
      
      // Refresh all data
      await loadGamificationData();
      
      // Log what's being returned to the component
      const returnValue = {
        success: true,
        xpEarned: result.xpEarned,
        levelUp: result.levelUp,
        newLevel: result.newLevel,
        unlockedAchievements: result.unlockedAchievements,
        completedChallenges: result.completedChallenges,
        unlockedRewards: result.newlyUnlockedRewards
      };
      console.log('Returning from useGamification.processRoutine:', JSON.stringify(returnValue, null, 2));
      
      return returnValue;
    } catch (error) {
      console.error('Error processing routine:', error);
      return {
        success: false,
        xpEarned: 0,
        levelUp: false,
        newLevel: level,
        unlockedAchievements: [],
        completedChallenges: [],
        unlockedRewards: []
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData, level]);
  
  // Claim a completed challenge
  const claimChallenge = useCallback(async (challengeId: string) => {
    setIsLoading(true);
    try {
      // Claim the challenge
      const result = await gamificationManager.claimChallenge(challengeId);
      
      if (result.success) {
        // Update XP
        if (result.xpEarned > 0) {
          setTotalXP(prev => prev + result.xpEarned);
        }
        
        // Update level if needed
        if (result.levelUp) {
          setLevel(result.newLevel);
        }
        
        // Refresh data
        await loadGamificationData();
      }
      
      return result;
    } catch (error) {
      console.error('Error claiming challenge:', error);
      return {
        success: false,
        message: 'Error claiming challenge',
        xpEarned: 0,
        levelUp: false,
        newLevel: level
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData, level]);
  
  // Check if a feature is unlocked
  const isFeatureUnlocked = useCallback(async (featureId: string): Promise<boolean> => {
    try {
      // For level-gated features without a specific reward
      const levelInfo = await gamificationManager.getUserLevelInfo();
      
      // Check level requirements first
      if (featureId === 'custom_routines' && levelInfo.level >= 4) {
        return true;
      }
      if (featureId === 'dark_mode' && levelInfo.level >= 2) {
        return true;
      }
      if (featureId === 'detailed_stats' && levelInfo.level >= 3) {
        return true;
      }
      
      // Otherwise check for specific reward
      const userProgress = await storageService.getUserProgress();
      const reward = userProgress.rewards[featureId];
      return reward ? reward.unlocked : false;
    } catch (error) {
      console.error('Error checking if feature is unlocked:', error);
      return false;
    }
  }, []);
  
  // Dismiss notifications
  const dismissNotifications = useCallback(() => {
    setRecentlyUnlockedAchievements([]);
    setRecentlyCompletedChallenges([]);
    setRecentlyUnlockedRewards([]);
  }, []);
  
  // Reset all gamification data for testing
  const resetAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Initialize new user progress
      await gamificationManager.initializeUserProgress();
      
      // Reload data
      await loadGamificationData();
      
      return true;
    } catch (error) {
      console.error('Error resetting gamification data:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData]);
  
  // Add XP directly
  const addXp = useCallback(async (amount: number, source: string, details?: string) => {
    setIsLoading(true);
    try {
      // Correct function name to match what's available in gamificationManager
      // First, get the latest user progress
      const userProgress = await storageService.getUserProgress();
      
      // Then add XP manually
      userProgress.totalXP += amount;
      await storageService.saveUserProgress(userProgress);
      
      // Update state with results
      if (amount > 0) {
        setTotalXP(prev => prev + amount);
      }
      
      // Check if level up occurred
      const newLevelInfo = await gamificationManager.getUserLevelInfo();
      const levelUp = newLevelInfo.level > level;
      
      if (levelUp) {
        setLevel(newLevelInfo.level);
      }
      
      // Refresh all data
      await loadGamificationData();
      
      return {
        success: true,
        xpEarned: amount,
        levelUp,
        newLevel: newLevelInfo.level
      };
    } catch (error) {
      console.error('Error adding XP:', error);
      return {
        success: false,
        xpEarned: 0,
        levelUp: false,
        newLevel: level
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData, level]);
  
  return {
    // State
    isLoading,
    level,
    totalXP,
    xpToNextLevel,
    percentToNextLevel,
    recentlyUnlockedAchievements,
    recentlyCompletedChallenges,
    recentlyUnlockedRewards,
    claimableChallenges,
    gamificationSummary,
    
    // Actions
    processRoutine,
    claimChallenge,
    isFeatureUnlocked,
    dismissNotifications,
    refreshData,
    resetAllData,
    addXp
  };
} 