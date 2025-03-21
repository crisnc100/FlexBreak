import { useEffect } from 'react';
import { ProgressEntry } from '../../types';
import * as achievementManager from '../../utils/progress/achievementManager';
import * as challengeManager from '../../utils/progress/challengeManager';
import * as storageService from '../../services/storageService';

/**
 * Custom hook to check streak status and update related achievements
 */
export function useStreakChecker(
  currentStreak: number, 
  progressDataLength: number,
  refreshUserProgress: () => Promise<void>,
  refreshChallenges: () => Promise<void>
) {
  useEffect(() => {
    const checkStreakStatus = async () => {
      // If we have stats and progress data available
      if (currentStreak === 0 && progressDataLength > 0) {
        console.log('Detected broken streak, resetting streak achievements and challenges');
        
        try {
          // Use achievement manager to reset streak-related achievements
          const updatedProgress = await achievementManager.resetStreakAchievements();
          
          // Also handle streak-related challenges
          await challengeManager.handleStreakReset();
          
          // Refresh progress data after resetting
          if (updatedProgress) {
            console.log('Streak achievements and challenges updated, refreshing progress data');
            await refreshUserProgress();
            
            // Also refresh challenges
            await refreshChallenges();
          }
        } catch (error) {
          console.error('Error handling broken streak:', error);
        }
      }
      
      // Always check non-streak achievements to ensure they're progressing
      try {
        console.log('Updating non-streak achievements to ensure proper progress tracking');
        await achievementManager.updateAchievements(await storageService.getUserProgress());
        await refreshUserProgress();
      } catch (error) {
        console.error('Error updating non-streak achievements:', error);
      }
    };
    
    checkStreakStatus();
  }, [currentStreak, progressDataLength, refreshUserProgress, refreshChallenges]);

  // Return nothing - this hook is purely for side effects
  return null;
} 