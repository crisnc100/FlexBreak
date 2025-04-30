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
    console.log('[FREEZE DEBUG] Checking if streak freeze is available');
    
    // First, check if user has access to streak freezes feature
    const hasAccess = await featureAccessUtils.canAccessFeature('streak_freezes');
    if (!hasAccess) {
      console.log('[FREEZE DEBUG] User does not have access to streak freezes feature');
      return false;
    }
    
    // Get streak status which includes freezes available
    const streakStatus = await simpleStreakManager.getStreakStatus();
    const isAvailable = streakStatus.canFreeze && streakStatus.freezesAvailable > 0;
    
    console.log(`[FREEZE DEBUG] Freeze availability check: canFreeze=${streakStatus.canFreeze}, freezesAvailable=${streakStatus.freezesAvailable}, isAvailable=${isAvailable}`);
    
    // Additional logging to debug today activity issue
    const today = dateUtils.today();
    const todayActivity = await simpleStreakManager.hasRoutineToday();
    console.log(`[FREEZE DEBUG] Today (${today}) activity check: ${todayActivity}`);
    
    // Get detailed streak status
    const legacyStatus = await simpleStreakManager.getLegacyStreakStatus();
    console.log(`[FREEZE DEBUG] Legacy streak status: canSaveYesterdayStreak=${legacyStatus.canSaveYesterdayStreak}, streakBroken=${legacyStatus.streakBroken}, hasTodayActivity=${legacyStatus.hasTodayActivity}`);
    
    const isTrulyBroken = await simpleStreakManager.isStreakBroken();
    console.log(`[FREEZE DEBUG] Is streak truly broken (3+ days missed): ${isTrulyBroken}`);
    
    return isAvailable;
  } catch (error) {
    console.error('[FREEZE ERROR] Error checking streak freeze availability:', error);
    return false;
  }
};

/**
 * Check if a streak freeze was applied for a specific date
 */
export const wasStreakFreezeAppliedForDate = async (dateStr: string): Promise<boolean> => {
  console.log(`[FREEZE DEBUG] Checking if freeze was applied for date: ${dateStr}`);
  
  // Make sure streak manager is initialized
  if (!simpleStreakManager.streakCache.initialized) {
    await simpleStreakManager.initializeStreak();
  }
  
  // Double check if the date is in the cache
  if (!simpleStreakManager.streakCache.freezeDates.includes(dateStr)) {
    // Check from storage as well to be sure
    const userProgress = await storageService.getUserProgress();
    const freezeDates = userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.appliedDates || [];
    
    console.log(`[FREEZE DEBUG] Freeze dates from storage: ${JSON.stringify(freezeDates)}`);
    
    if (freezeDates.includes(dateStr)) {
      // Sync the cache if there's a discrepancy
      console.log(`[FREEZE DEBUG] Found freeze date ${dateStr} in storage but not in cache, syncing...`);
      simpleStreakManager.streakCache.freezeDates = [...freezeDates];
      return true;
    }
    
    console.log(`[FREEZE DEBUG] No freeze found for date ${dateStr}`);
    return false;
  }
  
  // Check the freeze dates in the streak cache
  const result = simpleStreakManager.streakCache.freezeDates.includes(dateStr);
  console.log(`[FREEZE DEBUG] Freeze for date ${dateStr}: ${result ? 'FOUND' : 'NOT FOUND'}`);
  return result;
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
    
    console.log(`[FREEZE DEBUG] Checking if freeze was applied recently (${todayStr} or ${yesterdayStr})`);
    
    // Check if a freeze was applied for either day
    const appliedToday = await wasStreakFreezeAppliedForDate(todayStr);
    const appliedYesterday = await wasStreakFreezeAppliedForDate(yesterdayStr);
    
    const result = appliedToday || appliedYesterday;
    console.log(`[FREEZE DEBUG] Recent freeze check: today=${appliedToday}, yesterday=${appliedYesterday}, result=${result}`);
    
    return result;
  } catch (error) {
    console.error('[FREEZE ERROR] Error checking if streak freeze was applied recently:', error);
    return false;
  }
};

/**
 * Gets the number of streak freezes available to the user
 */
export const getFreezesAvailable = async (): Promise<number> => {
  try {
    console.log('[FREEZE DEBUG] Getting available freezes count');
    
    // Always get the count directly from UserProgress for accuracy
    const userProgress = await storageService.getUserProgress();
    
    // If streak freezes have been initialized, use the count from UserProgress
    if (userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.uses !== undefined) {
      const storedCount = userProgress.rewards[STREAK_FREEZE_REWARD_ID].uses;
      
      // Update the streak manager cache to match
      if (simpleStreakManager.streakCache.freezesAvailable !== storedCount) {
        console.log(`[FREEZE DEBUG] Updating streak manager cache freeze count from ${simpleStreakManager.streakCache.freezesAvailable} to ${storedCount}`);
        simpleStreakManager.streakCache.freezesAvailable = storedCount;
      }
      
      console.log(`[FREEZE DEBUG] Direct freeze count from storage: ${storedCount}`);
      return storedCount;
    }
    
    // Fallback to streak manager status
    const streakStatus = await simpleStreakManager.getStreakStatus();
    console.log(`[FREEZE DEBUG] Fallback freeze count from streak manager: ${streakStatus.freezesAvailable}`);
    return streakStatus.freezesAvailable;
  } catch (error) {
    console.error('[FREEZE ERROR] Error getting freezes available:', error);
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
    console.log('[FREEZE DEBUG] Attempting to apply streak freeze');
    
    // Log detailed streak info before applying
    const beforeStatus = await simpleStreakManager.getLegacyStreakStatus();
    console.log(`[FREEZE DEBUG] Status before applying: streakBroken=${beforeStatus.streakBroken}, currentStreak=${beforeStatus.currentStreak}, canSaveYesterdayStreak=${beforeStatus.canSaveYesterdayStreak}, freezesAvailable=${beforeStatus.freezesAvailable}, hasTodayActivity=${beforeStatus.hasTodayActivity}`);
    
    // Check today's activity explicitly
    const todayActivity = await simpleStreakManager.hasRoutineToday();
    const yestActivity = await simpleStreakManager.hasRoutineYesterday(); 
    console.log(`[FREEZE DEBUG] Activity checks - Today: ${todayActivity}, Yesterday: ${yestActivity}`);
    
    // Apply freeze through the simpleStreakManager with retry for version conflicts
    const result = await simpleStreakManager.applyFreeze();
    
    if (result.success) {
      // Play freeze sound on success
      await soundEffects.playSound('streakFreeze');
      
      // Get yesterday's date for the result
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = dateUtils.formatDateYYYYMMDD(yesterday);
      
      console.log(`[FREEZE DEBUG] Successfully applied freeze for ${yesterdayStr}, remaining freezes: ${result.remainingFreezes}`);
      
      // Log detailed streak info after applying
      const afterStatus = await simpleStreakManager.getLegacyStreakStatus();
      console.log(`[FREEZE DEBUG] Status after applying: streakBroken=${afterStatus.streakBroken}, currentStreak=${afterStatus.currentStreak}, freezesAvailable=${afterStatus.freezesAvailable}`);
      
      return {
        success: true,
        appliedDate: yesterdayStr,
        remainingFreezes: result.remainingFreezes
      };
    } else {
      console.log(`[FREEZE DEBUG] Failed to apply freeze, remaining freezes: ${result.remainingFreezes}`);
      
      // Log reason for failure if possible
      if (beforeStatus.freezesAvailable <= 0) {
        console.log(`[FREEZE DEBUG] Failure reason: No freezes available`);
      } else if (!beforeStatus.canSaveYesterdayStreak) {
        console.log(`[FREEZE DEBUG] Failure reason: Cannot save yesterday's streak`);
      } else if (await simpleStreakManager.isStreakBroken()) {
        console.log(`[FREEZE DEBUG] Failure reason: Streak truly broken (missed more than 2 days)`);
      } else {
        console.log(`[FREEZE DEBUG] Failure reason: Unknown`);
      }
      
      return {
        success: false,
        appliedDate: '',
        remainingFreezes: result.remainingFreezes
      };
    }
  } catch (error) {
    console.error('[FREEZE ERROR] Error applying streak freeze:', error);
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
    console.log('[FREEZE DEBUG] Checking if freezes need to be refilled');
    
    // Check if user has access to streak freezes feature
    const hasAccess = await featureAccessUtils.canAccessFeature('streak_freezes');
    if (!hasAccess) {
      console.log('[FREEZE DEBUG] User does not have access to streak freezes feature');
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
    
    console.log(`[FREEZE DEBUG] Refill check - Current: ${currentMonth+1}/${currentYear}, Last refill: ${lastRefillMonth+1}/${lastRefillYear}, Current freezes: ${currentFreezes}/${MAX_FREEZES}`);
    
    // If premium was just gained OR we're in a new month, refill freezes
    const isDifferentMonth = lastRefillMonth !== currentMonth || lastRefillYear !== currentYear;
    const needsRefill = isDifferentMonth && currentFreezes < MAX_FREEZES;
    
    if (needsRefill) {
      console.log(`[FREEZE DEBUG] Refilling freezes: ${currentFreezes} → ${MAX_FREEZES} for month ${currentMonth + 1}/${currentYear}`);
      
      // Use simpleStreakManager to refill freezes with version checking
      const result = await simpleStreakManager.refillFreezes();
      
      if (result) {
        // Update the lastRefill date in UserProgress
        const updatedUserProgress = await storageService.getUserProgress();
        
        if (updatedUserProgress.rewards[STREAK_FREEZE_REWARD_ID]) {
          updatedUserProgress.rewards[STREAK_FREEZE_REWARD_ID].lastRefill = today.toISOString();
          
          // Save with version check
          await saveUserProgressWithVersionCheck(updatedUserProgress, 'streak_freeze_refill');
          console.log(`[FREEZE DEBUG] Updated lastRefill date to ${today.toISOString()}`);
        }
        
        console.log(`[FREEZE DEBUG] Successfully refilled streak freezes to ${MAX_FREEZES} for ${currentMonth + 1}/${currentYear}`);
        return true;
      }
    } else {
      if (currentFreezes >= MAX_FREEZES) {
        console.log(`[FREEZE DEBUG] Streak freezes already at maximum: ${currentFreezes}/${MAX_FREEZES}`);
      } else if (!isDifferentMonth) {
        console.log(`[FREEZE DEBUG] Streak freezes already refilled this month (${currentMonth + 1}/${currentYear})`);
      }
    }
    
    return false;
  } catch (error) {
    console.error('[FREEZE ERROR] Error refilling streak freezes:', error);
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
  console.warn('[FREEZE WARN] wasStreakFreezeUsedForCurrentDay is deprecated. Use wasStreakFreezeAppliedRecently instead.');
  return wasStreakFreezeAppliedRecently();
}; 