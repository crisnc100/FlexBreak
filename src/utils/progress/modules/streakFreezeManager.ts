import { UserProgress } from '../types';
import * as storageService from '../../../services/storageService';
import * as dateUtils from './utils/dateUtils';
import * as soundEffects from '../../../utils/soundEffects';
import * as featureAccessUtils from '../../featureAccessUtils';
import * as simpleStreakManager from './streakManager';
import { saveUserProgressWithVersionCheck } from './utils';

// Constants
const STREAK_FREEZE_REWARD_ID = 'streak_freezes';
const MAX_FREEZES = 2;

/**
 * Check if a streak freeze is available for use
 * Validates user premium status, level, and available freezes
 */
export const isFreezeAvailable = async (): Promise<boolean> => {
  try {
    // First, check if user has access to streak freezes feature
    const hasAccess = await featureAccessUtils.canAccessFeature('streak_freezes');
    if (!hasAccess) {
      console.log('User does not have access to streak freezes feature');
      return false;
    }
    
    // Get streak status which includes freezes available
    const streakStatus = await simpleStreakManager.getStreakStatus();
    return streakStatus.canFreeze && streakStatus.freezesAvailable > 0;
  } catch (error) {
    console.error('Error checking streak freeze availability:', error);
    return false;
  }
};

/**
 * Check if a streak freeze was applied for a specific date
 */
export const wasStreakFreezeAppliedForDate = async (dateStr: string): Promise<boolean> => {
  // Make sure streak manager is initialized
  if (!simpleStreakManager.streakCache.initialized) {
    await simpleStreakManager.initializeStreak();
  }
  
  // Double check if the date is in the cache
  if (!simpleStreakManager.streakCache.freezeDates.includes(dateStr)) {
    // Check from storage as well to be sure
    const userProgress = await storageService.getUserProgress();
    const freezeDates = userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.appliedDates || [];
    
    if (freezeDates.includes(dateStr)) {
      // Sync the cache if there's a discrepancy
      console.log(`Found freeze date ${dateStr} in storage but not in cache, syncing...`);
      simpleStreakManager.streakCache.freezeDates = [...freezeDates];
      return true;
    }
    
    return false;
  }
  
  // Check the freeze dates in the streak cache
  return simpleStreakManager.streakCache.freezeDates.includes(dateStr);
};

/**
 * Check if a streak freeze was applied for today or yesterday
 */
export const wasStreakFreezeAppliedRecently = async (): Promise<boolean> => {
  try {
    // Get today and yesterday dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = dateUtils.formatDateYYYYMMDD(today);
    const yesterdayStr = dateUtils.formatDateYYYYMMDD(yesterday);
    
    // Check if a freeze was applied for either day
    const appliedToday = await wasStreakFreezeAppliedForDate(todayStr);
    const appliedYesterday = await wasStreakFreezeAppliedForDate(yesterdayStr);
    
    return appliedToday || appliedYesterday;
  } catch (error) {
    console.error('Error checking if streak freeze was applied recently:', error);
    return false;
  }
};

/**
 * Gets the number of streak freezes available to the user
 */
export const getFreezesAvailable = async (): Promise<number> => {
  try {
    // Always get the count directly from UserProgress for accuracy
    const userProgress = await storageService.getUserProgress();
    
    // If streak freezes have been initialized, use the count from UserProgress
    if (userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.uses !== undefined) {
      const storedCount = userProgress.rewards[STREAK_FREEZE_REWARD_ID].uses;
      
      // Update the streak manager cache to match
      if (simpleStreakManager.streakCache.freezesAvailable !== storedCount) {
        console.log(`Updating streak manager cache freeze count from ${simpleStreakManager.streakCache.freezesAvailable} to ${storedCount}`);
        simpleStreakManager.streakCache.freezesAvailable = storedCount;
      }
      
      console.log(`Direct freeze count from storage: ${storedCount}`);
      return storedCount;
    }
    
    // Fallback to streak manager status
    const streakStatus = await simpleStreakManager.getStreakStatus();
    return streakStatus.freezesAvailable;
  } catch (error) {
    console.error('Error getting freezes available:', error);
    return 0;
  }
};

/**
 * Apply a streak freeze for yesterday
 * Uses simpleStreakManager's implementation with version checking
 */
export const applyFreeze = async (): Promise<{
  success: boolean;
  appliedDate: string;
  remainingFreezes: number;
}> => {
  try {
    // Apply freeze through the simpleStreakManager with retry for version conflicts
    const result = await simpleStreakManager.applyFreeze();
    
    if (result.success) {
      // Play freeze sound on success
      await soundEffects.playSound('streakFreeze');
      
      // Get yesterday's date for the result
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = dateUtils.formatDateYYYYMMDD(yesterday);
      
      return {
        success: true,
        appliedDate: yesterdayStr,
        remainingFreezes: result.remainingFreezes
      };
    } else {
      return {
        success: false,
        appliedDate: '',
        remainingFreezes: result.remainingFreezes
      };
    }
  } catch (error) {
    console.error('Error applying streak freeze:', error);
    return {
      success: false,
      appliedDate: '',
      remainingFreezes: await getFreezesAvailable()
    };
  }
};

/**
 * Refill streak freezes on a monthly basis or when premium status changes
 */
export const refillFreezes = async (): Promise<boolean> => {
  try {
    // Check if user has access to streak freezes feature
    const hasAccess = await featureAccessUtils.canAccessFeature('streak_freezes');
    if (!hasAccess) {
      console.log('User does not have access to streak freezes feature');
      return false;
    }
    
    // Get the current date
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get the user progress to check last refill date and current freezes
    const userProgress = await storageService.getUserProgress();
    const freezeReward = userProgress.rewards?.[STREAK_FREEZE_REWARD_ID];
    
    // Get current freeze count
    const currentFreezes = freezeReward?.uses || 0;
    
    let lastRefill = new Date(0);
    if (freezeReward?.lastRefill) {
      lastRefill = new Date(freezeReward.lastRefill);
    }
    
    const lastRefillMonth = lastRefill.getMonth();
    const lastRefillYear = lastRefill.getFullYear();
    
    // If premium was just gained OR we're in a new month, refill freezes
    const isDifferentMonth = lastRefillMonth !== currentMonth || lastRefillYear !== currentYear;
    const needsRefill = isDifferentMonth && currentFreezes < MAX_FREEZES;
    
    if (needsRefill) {
      console.log(`Refilling freezes: ${currentFreezes} → ${MAX_FREEZES} for month ${currentMonth + 1}/${currentYear}`);
      
      // Use simpleStreakManager to refill freezes with version checking
      const result = await simpleStreakManager.refillFreezes();
      
      if (result) {
        // Update the lastRefill date in UserProgress
        const updatedUserProgress = await storageService.getUserProgress();
        
        if (updatedUserProgress.rewards[STREAK_FREEZE_REWARD_ID]) {
          updatedUserProgress.rewards[STREAK_FREEZE_REWARD_ID].lastRefill = today.toISOString();
          
          // Save with version check
          await saveUserProgressWithVersionCheck(updatedUserProgress, 'streak_freeze_refill');
        }
        
        console.log(`Refilled streak freezes to ${MAX_FREEZES} for ${currentMonth + 1}/${currentYear}`);
        return true;
      }
    } else {
      if (currentFreezes >= MAX_FREEZES) {
        console.log(`Streak freezes already at maximum: ${currentFreezes}/${MAX_FREEZES}`);
      } else if (!isDifferentMonth) {
        console.log(`Streak freezes already refilled this month (${currentMonth + 1}/${currentYear})`);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error refilling streak freezes:', error);
    return false;
  }
};

/**
 * Backward compatibility functions
 */

export const isStreakFreezeAvailable = isFreezeAvailable;
export const refillMonthlyStreakFreezes = refillFreezes;
export const getStreakFreezeCount = getFreezesAvailable;

export const wasStreakFreezeUsedForCurrentDay = async (): Promise<boolean> => {
  console.warn('[DEPRECATED] wasStreakFreezeUsedForCurrentDay is deprecated. Use wasStreakFreezeAppliedRecently instead.');
  return wasStreakFreezeAppliedRecently();
}; 