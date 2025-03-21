import { useState, useEffect, useCallback, useRef } from 'react';
import { ProgressEntry } from '../../types';
import { UserProgress } from '../../utils/progress/types';

// Import from the central storageService
import * as storageService from '../../services/storageService';

// Import from the new gamification system
import * as gamificationManager from '../../utils/progress/gamificationManager';
import * as xpManager from '../../utils/progress/xpManager';
import * as achievementManager from '../../utils/progress/achievementManager';
import * as challengeManager from '../../utils/progress/challengeManager';
import * as rewardManager from '../../utils/progress/rewardManager';

/**
 * Hook to access and update all progress functionality
 * This is a compatibility layer for components still using the old progress system
 * Long-term, components should migrate to useGamification
 */
const useProgressSystem = () => {
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  // Track the last time challenges were updated
  const lastChallengeUpdate = useRef<Date>(new Date());

  // Load user progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      setIsLoading(true);
      try {
        // Use storageService instead of direct import
        const progress = await storageService.getUserProgress();
        console.log('Loaded user progress:', progress);
        setUserProgress(progress);
      } catch (error) {
        console.error('Error loading user progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, []);

  // Force reloading user progress
  const refreshUserProgress = useCallback(async () => {
    // Don't refresh if we're already loading
    if (isLoading) {
      console.log('Already loading user progress, skipping refresh');
      return null;
    }
    
    // Don't refresh if less than 1 second has passed since the last update
    const now = new Date();
    const timeSinceLastUpdate = now.getTime() - lastUpdate.getTime();
    if (timeSinceLastUpdate < 1000) {
      console.log(`Skipping refresh, last update was only ${timeSinceLastUpdate}ms ago`);
      return userProgress;
    }
    
    setIsLoading(true);
    try {
      // Use storageService instead of direct import
      const progress = await storageService.getUserProgress();
      console.log('Refreshed user progress:', progress);
      setUserProgress(progress);
      setLastUpdate(new Date());
      return progress;
    } catch (error) {
      console.error('Error refreshing user progress:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, lastUpdate, userProgress]);

  // Reset user progress to initial state
  const resetProgress = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use new gamification system to initialize progress
      const initialProgress = await gamificationManager.initializeUserProgress();
      console.log('Reset user progress to initial state');
      setUserProgress(initialProgress);
      setLastUpdate(new Date());
      return initialProgress;
    } catch (error) {
      console.error('Error resetting user progress:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Process completed routine
  const processRoutine = useCallback(
    async (routine: ProgressEntry) => {
      if (!userProgress) {
        console.error('No user progress available');
        await refreshUserProgress();
        if (!userProgress) {
          console.error('Still no user progress after refresh, cannot process routine');
          return null;
        }
      }

      console.log('Processing routine:', routine);
      setIsLoading(true);

      try {
        // Use the new gamification system to process the routine
        const result = await gamificationManager.processCompletedRoutine(routine);
        
        // Refresh our local copy of the user progress
        const updatedProgress = await storageService.getUserProgress();
        setUserProgress(updatedProgress);
        setLastUpdate(new Date());
        
        // Return compatible result format
        return {
          xpEarned: result.xpEarned,
          xpBreakdown: {}, // No detailed breakdown in new system
          progress: updatedProgress,
          unlockedAchievements: result.unlockedAchievements,
          updatedChallenges: result.completedChallenges,
          levelUp: result.levelUp,
          newLevel: result.newLevel
        };
      } catch (error) {
        console.error('Error processing routine:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [userProgress, refreshUserProgress]
  );

  // Update achievements
  const updateUserAchievements = useCallback(async () => {
    if (!userProgress) {
      console.error('No user progress available');
      return null;
    }

    setIsLoading(true);
    try {
      // Use new achievementManager to update achievements
      const result = await achievementManager.updateAchievements(userProgress);
      // Need to handle the proper result type
      const updatedProgress = await storageService.getUserProgress();
      setUserProgress(updatedProgress);
      setLastUpdate(new Date());
      
      // Return compatibility format
      return {
        progress: updatedProgress,
        unlockedAchievements: [] // We'd need to check which ones were unlocked
      };
    } catch (error) {
      console.error('Error updating achievements:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userProgress]);

  // Generate new challenges
  const generateUserChallenges = useCallback(async () => {
    if (!userProgress) {
      console.error('No user progress available');
      return null;
    }

    setIsLoading(true);
    try {
      // Use new challengeManager to generate challenges
      const updatedProgress = await challengeManager.generateChallenges('all');
      setUserProgress(updatedProgress);
      setLastUpdate(new Date());
      return updatedProgress;
    } catch (error) {
      console.error('Error generating challenges:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userProgress]);

  // Refresh expired challenges
  const refreshUserChallenges = useCallback(async () => {
    if (!userProgress) {
      console.error('No user progress available');
      return null;
    }

    setIsLoading(true);
    try {
      // Use new challengeManager to handle expired challenges
      const updatedProgress = await challengeManager.handleExpiredChallenges();
      setUserProgress(updatedProgress);
      setLastUpdate(new Date());
      return updatedProgress;
    } catch (error) {
      console.error('Error refreshing challenges:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userProgress]);

  // Update challenges with routines
  const updateChallengesWithRoutines = useCallback(
    async (routines: ProgressEntry[]) => {
      // Don't update if already loading
      if (isLoading) {
        console.log('Skipping updateChallengesWithRoutines, already loading');
        return null;
      }

      // Don't update if less than 5 seconds have passed since last challenge update
      const now = new Date();
      const timeSinceLastUpdate = now.getTime() - lastChallengeUpdate.current.getTime();
      if (timeSinceLastUpdate < 5000) { // 5 seconds throttle for challenges
        console.log(`Skipping updateChallengesWithRoutines, last update was only ${timeSinceLastUpdate}ms ago`);
        return userProgress;
      }
      
      if (!userProgress) {
        console.log('Cannot update challenges: userProgress is null');
        // Try to get the latest user progress first
        const progress = await refreshUserProgress();
        if (!progress) {
          console.error('Failed to fetch user progress');
          return null;
        }
      }

      if (!routines || routines.length === 0) {
        console.warn('No routines provided to update challenges');
        return null;
      }

      console.log(`Updating challenges with ${routines.length} routines`);
      setIsLoading(true);

      try {
        // IMPORTANT: Check if these are NEW routines that need processing
        // Filter out routines that have already been processed
        // This is a simplified check - in a real implementation, we would need
        // to track which routines have been processed to avoid duplicate XP
        
        // For now, we'll just refresh the current progress instead of reprocessing routines
        // to avoid duplicate XP awards during refresh operations
        
        // Get the updated progress
        const updatedProgress = await storageService.getUserProgress();
        setUserProgress(updatedProgress);
        setLastUpdate(new Date());
        lastChallengeUpdate.current = new Date(); // Update the challenge timestamp
        
        // Return compatibility format
        return {
          progress: updatedProgress,
          updatedChallenges: [] // Cannot determine exactly which ones were updated
        };
      } catch (error) {
        console.error('Error updating challenges with routines:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [userProgress, refreshUserProgress, isLoading]
  );

  // Claim challenge reward
  const claimChallengeReward = useCallback(
    async (challengeId: string) => {
      if (!userProgress) {
        console.error('No user progress available');
        await refreshUserProgress();
        if (!userProgress) {
          console.error('Still no user progress after refresh, cannot claim challenge');
          return null;
        }
      }

      console.log(`Claiming challenge reward for: ${challengeId}`);
      setIsLoading(true);
      
      try {
        // Use new challengeManager to claim the challenge
        const result = await challengeManager.claimChallenge(challengeId);
        
        // Get the updated progress
        const updatedProgress = await storageService.getUserProgress();
        setUserProgress(updatedProgress);
        setLastUpdate(new Date());
        
        return {
          success: result.success,
          message: result.message,
          xpEarned: result.xpEarned,
          progress: updatedProgress
        };
      } catch (error) {
        console.error('Error claiming challenge:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [userProgress, refreshUserProgress]
  );

  // Get progress towards next level
  const getProgressToNextLevel = useCallback(() => {
    if (!userProgress) {
      console.warn('Cannot calculate progress to next level: userProgress is null');
      return { 
        progress: 0, 
        nextLevel: null,
        currentLevel: 1,
        totalXP: 0,
        levelData: xpManager.LEVELS[0]
      };
    }

    // Ensure we have valid totalXP and level values
    const totalXP = userProgress.totalXP || 0;
    const currentLevel = userProgress.level || 1;
    
    // Calculate level info using new xpManager
    const levelInfo = xpManager.calculateLevel(totalXP);
    const nextLevelXP = currentLevel < xpManager.LEVELS.length ? xpManager.LEVELS[currentLevel].xpRequired : null;
    
    return {
      progress: levelInfo.progress,
      nextLevel: nextLevelXP,
      currentLevel,
      totalXP,
      levelData: xpManager.LEVELS[currentLevel - 1] // Levels are 1-indexed in the array
    };
  }, [userProgress]);

  // Functions to export from xpManager for compatibility
  const getNextLevelXP = useCallback((level: number) => {
    if (level < xpManager.LEVELS.length) {
      return xpManager.LEVELS[level].xpRequired;
    }
    return null;
  }, []);

  const getLevelProgress = useCallback((xp: number, level: number) => {
    const levelInfo = xpManager.calculateLevel(xp);
    return levelInfo.progress;
  }, []);

  const getLevelData = useCallback((level: number) => {
    if (level >= 1 && level <= xpManager.LEVELS.length) {
      return xpManager.LEVELS[level - 1]; // Levels are 1-indexed
    }
    return xpManager.LEVELS[0]; // Default to level 1
  }, []);

  // Return all the hooks functions and data
  return {
    userProgress,
    isLoading,
    lastUpdate,
    refreshUserProgress,
    resetProgress,
    processRoutine,
    updateUserAchievements,
    generateUserChallenges,
    refreshUserChallenges,
    updateChallengesWithRoutines,
    claimChallengeReward,
    getProgressToNextLevel,
    getNextLevelXP,
    getLevelProgress,
    getLevelData
  };
};

export default useProgressSystem; 