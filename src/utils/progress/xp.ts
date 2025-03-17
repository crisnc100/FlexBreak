import { ProgressEntry, UserProgress } from './types';
import * as storageService from '../../services/storageService';

/**
 * Calculate XP for a completed routine
 * @param routine The completed routine
 * @param userProgress Current user progress
 * @returns Object with XP earned and breakdown
 */
export const calculateRoutineXP = (
  routine: ProgressEntry,
  userProgress: UserProgress
): { xp: number; breakdown: Record<string, number> } => {
  const breakdown: Record<string, number> = {};
  let totalXP = 0;
  
  // Base XP based on duration
  const duration = typeof routine.duration === 'string' 
    ? parseInt(routine.duration, 10) 
    : routine.duration;
  
  // Default XP values based on duration
  if (duration <= 5) {
    breakdown.base = 30;
  } else if (duration <= 10) {
    breakdown.base = 60;
  } else {
    breakdown.base = 90;
  }
  
  totalXP += breakdown.base;
  
  // First routine ever bonus
  const isFirstRoutine = userProgress.statistics?.totalRoutines === 0;
  if (isFirstRoutine) {
    breakdown.firstRoutine = 50;
    totalXP += breakdown.firstRoutine;
  }
  
  return {
    xp: totalXP,
    breakdown
  };
};

/**
 * Add XP to user progress
 * @param amount XP amount to add
 * @param source Source of the XP (e.g., 'routine', 'achievement')
 * @param details Additional details about the XP source
 * @param userProgress Current user progress (optional)
 * @returns Updated user progress
 */
export const addXP = async (
  amount: number,
  source: string,
  details?: string,
  userProgress?: UserProgress
): Promise<UserProgress> => {
  // Get current progress if not provided
  if (!userProgress) {
    userProgress = await storageService.getUserProgress();
  }
  
  // Add XP
  userProgress.totalXP = (userProgress.totalXP || 0) + amount;
  
  // Add to XP history
  if (!userProgress.xpHistory) {
    userProgress.xpHistory = [];
  }
  
  userProgress.xpHistory.push({
    amount,
    source,
    details: details || '',
    timestamp: new Date().toISOString()
  });
  
  // Limit history size to prevent storage issues
  if (userProgress.xpHistory.length > 100) {
    userProgress.xpHistory = userProgress.xpHistory.slice(-100);
  }
  
  // Save updated progress
  await storageService.saveUserProgress(userProgress);
  
  return userProgress;
}; 