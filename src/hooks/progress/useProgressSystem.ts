import { useState, useEffect, useCallback, useRef } from 'react';
import { ProgressEntry } from '../../types';
import { UserProgress } from '../../utils/progress/types';

// Import from the central storageService
import * as storageService from '../../services/storageService';

// Import useGamification for centralized functionality
import { useGamification } from './useGamification';

/**
 * Hook to access and update all progress functionality
 * @deprecated This is a compatibility layer for components still using the old progress system
 * Components should migrate to useGamification for better performance and reliability
 */
const useProgressSystem = () => {
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Use the centralized useGamification hook internally
  const gamification = useGamification();

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
      // Use gamification to refresh data
      await gamification.refreshData();
      
      // Get updated progress
      const progress = await storageService.getUserProgress();
      setUserProgress(progress);
      setLastUpdate(new Date());
      return progress;
    } catch (error) {
      console.error('Error refreshing user progress:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, lastUpdate, userProgress, gamification]);

  // Reset user progress to initial state
  const resetProgress = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use gamification to reset data
      await gamification.resetAllData();
      
      // Get updated progress
      const progress = await storageService.getUserProgress();
      setUserProgress(progress);
      setLastUpdate(new Date());
      return progress;
    } catch (error) {
      console.error('Error resetting user progress:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [gamification]);

  // Process completed routine - now uses the centralized gamification hook
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
        // Use centralized gamification hook
        const result = await gamification.processRoutine(routine);
        
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
    [userProgress, refreshUserProgress, gamification]
  );

  // Claim a challenge - now uses centralized gamification hook
  const claimChallenge = useCallback(
    async (challengeId: string) => {
      setIsLoading(true);
      try {
        // Use gamification for claiming
        const result = await gamification.claimChallenge(challengeId);
        
        // Update our local userProgress
        await refreshUserProgress();
        
        return result;
      } catch (error) {
        console.error('Error claiming challenge:', error);
        return { success: false, message: 'Error claiming challenge', xpEarned: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    [gamification, refreshUserProgress]
  );

  // Get all functions from gamification but expose them with old naming
  return {
    // Expose raw state for backward compatibility
    userProgress,
    isLoading,
    lastUpdate,
    
    // Expose actions with old naming
    refreshUserProgress,
    resetProgress,
    processRoutine,
    claimChallenge,
    
    // Add a note about deprecation to console on each call
    getCurrentProgress: () => {
      console.warn('getCurrentProgress is deprecated. Use useGamification hook instead.');
      return userProgress;
    },
    
    // Redirect to useGamification for all operations
    getUserLevelInfo: () => {
      console.warn('getUserLevelInfo is deprecated. Use useGamification hook instead.');
      return {
        level: gamification.level,
        totalXP: gamification.totalXP,
        xpToNextLevel: gamification.xpToNextLevel,
        percentToNextLevel: gamification.percentToNextLevel
      };
    },
    
    // Add a warning message for other deprecated functions
    updateUserAchievements: async () => {
      console.warn('updateUserAchievements is deprecated. Use useGamification hook instead.');
      await gamification.refreshData();
      return { progress: await storageService.getUserProgress(), unlockedAchievements: [] };
    },
    generateUserChallenges: async () => {
      console.warn('generateUserChallenges is deprecated. Use useGamification hook instead.');
      await gamification.refreshData();
      return await storageService.getUserProgress();
    },
    refreshUserChallenges: async () => {
      console.warn('refreshUserChallenges is deprecated. Use useGamification hook instead.');
      await gamification.refreshData();
      return await storageService.getUserProgress();
    }
  };
};

export default useProgressSystem; 