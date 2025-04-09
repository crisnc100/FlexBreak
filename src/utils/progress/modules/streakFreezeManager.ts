import { UserProgress, Reward } from '../types';
import * as storageService from '../../../services/storageService';
import * as dateUtils from './utils/dateUtils';
import * as soundEffects from '../../../utils/soundEffects';

const STREAK_FREEZE_REWARD_ID = 'streak_freezes';

/**
 * Check if a streak freeze is available and can be used
 */
export const isStreakFreezeAvailable = async (): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if user is at least level 6 (requirement for streak freezes)
  if (userProgress.level < 6) {
    return false;
  }
  
  // Check if reward exists and is unlocked
  if (
    !userProgress.rewards || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID] || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID].unlocked
  ) {
    return false;
  }
  
  // Check if user has streak freezes available
  const freezes = (userProgress.rewards[STREAK_FREEZE_REWARD_ID] as any).uses || 0;
  return freezes > 0;
};

/**
 * Check if a streak freeze was used for the current day or yesterday
 */
export const wasStreakFreezeUsedForCurrentDay = async (): Promise<boolean> => {
  try {
    console.log('Checking if streak freeze was used recently...');
    
    const userProgress = await storageService.getUserProgress();
    
    // If the streak_freezes reward doesn't exist or isn't unlocked, return false
    if (
      !userProgress.rewards || 
      !userProgress.rewards[STREAK_FREEZE_REWARD_ID] || 
      !userProgress.rewards[STREAK_FREEZE_REWARD_ID].unlocked
    ) {
      console.log('Streak freeze not unlocked or available');
      return false;
    }
    
    const freezeReward = userProgress.rewards[STREAK_FREEZE_REWARD_ID] as any;
    
    // Check if lastUsed exists
    if (!freezeReward.lastUsed) {
      console.log('No streak freeze has been used yet');
      return false;
    }
    
    // Get precise timestamps for date comparison
    const lastUsedDate = new Date(freezeReward.lastUsed);
    
    // Set up date objects properly for comparison (strip time portion)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Convert all to midnight timestamps for proper comparison
    const lastUsedTimestamp = new Date(
      lastUsedDate.getFullYear(),
      lastUsedDate.getMonth(),
      lastUsedDate.getDate()
    ).getTime();
    
    const todayTimestamp = today.getTime();
    const yesterdayTimestamp = yesterday.getTime();
    
    // Check if lastUsed is today or yesterday
    const usedToday = lastUsedTimestamp === todayTimestamp;
    const usedYesterday = lastUsedTimestamp === yesterdayTimestamp;
    
    // Current streak freeze details for debugging
    const freezeCount = freezeReward.uses || 0;
    
    console.log('Streak freeze usage check:', {
      lastUsed: lastUsedDate.toISOString(),
      today: today.toISOString(),
      yesterday: yesterday.toISOString(),
      lastUsedTimestamp,
      todayTimestamp,
      yesterdayTimestamp,
      usedToday,
      usedYesterday,
      currentStreak: userProgress.statistics.currentStreak,
      freezeCount
    });
    
    const wasUsedRecently = usedToday || usedYesterday;
    console.log('Streak freeze was used recently:', wasUsedRecently);
    
    return wasUsedRecently;
  } catch (error) {
    console.error('Error checking if streak freeze was used for current day:', error);
    return false;
  }
};

/**
 * Use a streak freeze to prevent losing a streak
 * This function is a direct implementation and should not be used
 * in favor of streakManager.saveStreakWithFreeze which handles everything in one atomic update
 * @returns True if successful, false otherwise
 * @deprecated Use streakManager.saveStreakWithFreeze instead
 */
export const useStreakFreeze = async (): Promise<boolean> => {
  // This is now a STUB function that simply forwards to streakManager
  console.warn('[DEPRECATED] useStreakFreeze called directly - this should not happen. Use streakManager.saveStreakWithFreeze instead.');
  
  // It's safer to return false to prevent any potential race conditions
  return false;
};

/**
 * Gets the number of streak freezes available to the user
 * @param forceRefresh Whether to force a refresh from storage instead of using cached data
 * @returns The number of streak freezes available
 */
export const getStreakFreezeCount = async (forceRefresh: boolean = false): Promise<number> => {
  try {
    // ALWAYS get a fresh copy from storage to avoid caching issues
    const userProgress = await storageService.getUserProgress();
    
    if (!userProgress) {
      console.log('[StreakFreezeManager] No user progress found');
      return 0;
    }

    // Check if streakFreezeReward exists and is unlocked
    const streakFreezeReward = userProgress.rewards[STREAK_FREEZE_REWARD_ID] as Reward | undefined;

    if (!streakFreezeReward || !streakFreezeReward.unlocked) {
      console.log('[StreakFreezeManager] Streak freeze reward not found or not unlocked');
      return 0;
    }

    // Return uses if it exists, otherwise 0
    const uses = streakFreezeReward.uses !== undefined ? streakFreezeReward.uses : 0;
    console.log(`[StreakFreezeManager] Current streak freeze count: ${uses}`);
    return uses;
  } catch (error) {
    console.error('[StreakFreezeManager] Error getting streak freeze count:', error);
    return 0;
  }
};

/**
 * Refill streak freezes on a monthly basis
 * Caps at exactly 2 per month (does not stack)
 */
export const refillMonthlyStreakFreezes = async (): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  console.log('Checking streak freeze refill eligibility for level:', userProgress.level);
  
  // Only allow streak freezes for users at level 6 or higher
  if (userProgress.level < 6) {
    console.log('User level not high enough for streak freezes (minimum level 6)');
    return false;
  }
  
  // Make sure rewards object exists
  if (!userProgress.rewards) {
    console.log('Creating rewards object for the first time');
    userProgress.rewards = {};
  }
  
  // Ensure the streak freeze reward exists AND is properly initialized
  if (!userProgress.rewards[STREAK_FREEZE_REWARD_ID]) {
    console.log('Creating streak freeze reward for the first time');
    userProgress.rewards[STREAK_FREEZE_REWARD_ID] = {
      id: STREAK_FREEZE_REWARD_ID,
      title: 'Streak Freezes',
      description: 'Save your streak when you miss a day',
      icon: 'snow-outline',
      unlocked: userProgress.level >= 6, // Automatically unlock for eligible users
      levelRequired: 6,
      type: 'power_up',
      uses: 0 // Initialize uses to 0
    };
  }
  
  const freezeReward = userProgress.rewards[STREAK_FREEZE_REWARD_ID] as any;
  
  // Ensure the reward is marked as unlocked if the user has reached level 6
  if (!freezeReward.unlocked && userProgress.level >= 6) {
    console.log('Unlocking streak freeze reward for level 6+ user');
    freezeReward.unlocked = true;
    
    // Save immediately to ensure unlock state persists
    await storageService.saveUserProgress(userProgress);
  }
  
  // Initialize uses field if it doesn't exist
  if (freezeReward.uses === undefined) {
    console.log('Initializing streak freeze uses count for the first time');
    freezeReward.uses = 0;
  }
  
  // Check if we need to refill based on current month
  const lastRefill = freezeReward.lastRefill ? new Date(freezeReward.lastRefill) : null;
  const now = new Date();
  
  // If a streak freeze was used, make sure the uses count accurately reflects that
  if (freezeReward.lastUsed) {
    const lastUsed = new Date(freezeReward.lastUsed);
    const lastRefillDate = lastRefill ? new Date(lastRefill) : null;
    
    // If the freeze was used after the last refill, make sure count is properly decremented
    if (lastRefillDate && lastUsed > lastRefillDate && freezeReward.uses > 1) {
      console.log('Detected inconsistent streak freeze count. Ensuring it reflects recent usage.');
      // If used this month but count still shows 2, fix it to 1
      freezeReward.uses = 1;
      await storageService.saveUserProgress(userProgress);
    }
  }
  
  // Check if a streak freeze was used recently (within the last 6 hours)
  const lastUsed = freezeReward.lastUsed ? new Date(freezeReward.lastUsed) : null;
  const recentlyUsed = lastUsed && ((now.getTime() - lastUsed.getTime()) < 21600000); // 6 hours in milliseconds
  
  // Log current state
  console.log('Streak freeze current state:', {
    unlocked: freezeReward.unlocked,
    uses: freezeReward.uses,
    lastRefill: lastRefill ? lastRefill.toISOString() : 'never',
    lastUsed: lastUsed ? lastUsed.toISOString() : 'never',
    recentlyUsed: recentlyUsed,
    currentMonth: now.getMonth(),
    currentYear: now.getFullYear(),
    lastRefillMonth: lastRefill ? lastRefill.getMonth() : 'N/A',
    lastRefillYear: lastRefill ? lastRefill.getFullYear() : 'N/A'
  });
  
  // If a freeze was recently used, don't reset the count to prevent overriding user actions
  if (recentlyUsed) {
    console.log('Skip refill: Streak freeze was recently used, preserving current count');
    return false;
  }
  
  // If no previous refill or it's a new month since last refill
  if (!lastRefill || 
      lastRefill.getMonth() !== now.getMonth() || 
      lastRefill.getFullYear() !== now.getFullYear()) {
    
    // Reset to exactly 2 streak freezes each month (don't accumulate)
    freezeReward.uses = 2;
    freezeReward.lastRefill = now.toISOString();
    
    await storageService.saveUserProgress(userProgress);
    console.log('Monthly streak freezes refilled: 2 streak freezes granted');
    return true;
  }
  
  console.log('No streak freeze refill needed, current count:', freezeReward.uses);
  return false;
}; 