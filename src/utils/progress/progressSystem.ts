import * as storageService from '../../services/storageService';
import { UserProgress } from './types';
import { LEVELS } from './xpManager';

/**
 * Get the current user progress
 * @returns User progress object
 */
export const getUserProgress = async (): Promise<UserProgress> => {
  return await storageService.getUserProgress();
};

/**
 * Save user progress
 * @param progress Updated user progress
 */
export const saveUserProgress = async (progress: UserProgress): Promise<void> => {
  await storageService.saveUserProgress(progress);
};

/**
 * Reset user progress to initial state
 */
export const resetUserProgress = async (): Promise<void> => {
  await storageService.resetUserProgress();
};

/**
 * Calculate user level based on XP
 * @param xp Total XP
 * @param currentLevel Current level (for optimization)
 * @returns Object with level and progress info
 */
export const calculateLevel = (xp: number, currentLevel: number = 1): { level: number; xpForCurrentLevel: number; xpForNextLevel: number; progress: number } => {
  // Find the highest level where XP is greater than or equal to the threshold
  let level = 1;
  
  // Start checking from the current level for optimization
  for (let i = currentLevel; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xpRequired) {
      level = i + 1; // Level is 1-indexed
    } else {
      break;
    }
  }
  
  // Calculate XP for current level
  const xpForCurrentLevel = level > 1 ? LEVELS[level - 1].xpRequired : 0;
  
  // Calculate XP for next level
  const xpForNextLevel = level < LEVELS.length ? LEVELS[level].xpRequired : Infinity;
  
  // Calculate progress to next level (0-1)
  const progress = (xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel);
  
  return {
    level,
    xpForCurrentLevel,
    xpForNextLevel,
    progress
  };
};

/**
 * Get XP required for the next level
 * @param currentLevel Current user level
 * @returns XP required for next level, or null if at max level
 */
export const getNextLevelXP = (currentLevel: number): number | null => {
  if (currentLevel < LEVELS.length) {
    return LEVELS[currentLevel].xpRequired;
  }
  return null;
};

/**
 * Process multiple routines for the progress system
 * @param routines Array of routine entries
 */
export const processRoutines = async (routines: any[]): Promise<void> => {
  // This is a simplified version for testing
  console.log(`Processing ${routines.length} routines`);
  
  // In a real implementation, this would update XP, achievements, etc.
  const userProgress = await getUserProgress();
  
  // Update total routines count
  if (!userProgress.statistics) {
    userProgress.statistics = { totalRoutines: 0, totalMinutes: 0 };
  }
  
  userProgress.statistics.totalRoutines += routines.length;
  
  // Save updated progress
  await saveUserProgress(userProgress);
}; 