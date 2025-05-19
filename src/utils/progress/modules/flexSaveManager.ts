import { UserProgress } from '../types';
import * as storageService from '../../../services/storageService';
import * as dateUtils from './utils/dateUtils';
import * as soundEffects from '../../../utils/soundEffects';
import * as featureAccessUtils from '../../featureAccessUtils';
import * as simpleStreakManager from './streakManager';
import { saveUserProgressWithVersionCheck } from './utils';

// Constants
const FLEX_SAVE_REWARD_ID = 'flex_saves';
const MAX_FLEX_SAVES = 2;

/**
 * Check if a streak flexSave is available for use
 * Validates user premium status, level, and available flexSaves
 */
export const isFlexSaveAvailable = async (): Promise<boolean> => {
  try {
    
    // First, check if user has access to streak flexSaves feature
    const hasAccess = await featureAccessUtils.canAccessFeature('flex_saves');
    if (!hasAccess) {
      return false;
    }
    
    // Get streak status which includes flexSaves available
    const streakStatus = await simpleStreakManager.getStreakStatus();
    const isAvailable = streakStatus.canFlexSave && streakStatus.flexSavesAvailable > 0;
    
    
    // Additional logging to debug today activity issue
    const today = dateUtils.todayStringLocal();
    const todayActivity = await simpleStreakManager.hasRoutineToday();
    
    // Get detailed streak status
    const legacyStatus = await simpleStreakManager.getLegacyStreakStatus();
    
    const isTrulyBroken = await simpleStreakManager.isStreakBroken();
    
    return isAvailable;
  } catch (error) {
    return false;
  }
};

/**
 * Check if a streak flexSave was applied for a specific date
 */
export const wasFlexSaveAppliedForDate = async (dateStr: string): Promise<boolean> => {
  
  // Make sure streak manager is initialized
  if (!simpleStreakManager.streakCache.initialized) {
    await simpleStreakManager.initializeStreak();
  }
  
  // Double check if the date is in the cache
  if (!simpleStreakManager.streakCache.flexSaveDates.includes(dateStr)) {
    // Check from storage as well to be sure
    const userProgress = await storageService.getUserProgress();
    const flexSaveDates = userProgress.rewards?.[FLEX_SAVE_REWARD_ID]?.appliedDates || [];
    
    console.log(`[FLEXSAVE DEBUG] FlexSave dates from storage: ${JSON.stringify(flexSaveDates)}`);
    
    if (flexSaveDates.includes(dateStr)) {
      // Sync the cache if there's a discrepancy
      console.log(`[FLEXSAVE DEBUG] Found flexSave date ${dateStr} in storage but not in cache, syncing...`);
      simpleStreakManager.streakCache.flexSaveDates = [...flexSaveDates];
      return true;
    }
    
    return false;
  }
  
  // Check the flexSave dates in the streak cache
  const result = simpleStreakManager.streakCache.flexSaveDates.includes(dateStr);
  console.log(`[FLEXSAVE DEBUG] FlexSave for date ${dateStr}: ${result ? 'FOUND' : 'NOT FOUND'}`);
  return result;
};

/**
 * Check if a streak flexSave was applied for today or yesterday
 */
export const wasFlexSaveAppliedRecently = async (): Promise<boolean> => {
  try {
    // Get today and yesterday dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = dateUtils.formatDateYYYYMMDD(today);
    const yesterdayStr = dateUtils.formatDateYYYYMMDD(yesterday);
    
    console.log(`[FLEXSAVE DEBUG] Checking if flexSave was applied recently (${todayStr} or ${yesterdayStr})`);
    
    // Check if a flexSave was applied for either day
    const appliedToday = await wasFlexSaveAppliedForDate(todayStr);
    const appliedYesterday = await wasFlexSaveAppliedForDate(yesterdayStr);
    
    const result = appliedToday || appliedYesterday;
    
    return result;
  } catch (error) {
    console.error('[FLEXSAVE ERROR] Error checking if streak flexSave was applied recently:', error);
    return false;
  }
};

/**
 * Gets the number of streak flexSaves available to the user
 */
export const getFlexSavesAvailable = async (): Promise<number> => {
  try {
    
    // Always get the count directly from UserProgress for accuracy
    const userProgress = await storageService.getUserProgress();
    
    // If streak flexSaves have been initialized, use the count from UserProgress
    if (userProgress.rewards?.[FLEX_SAVE_REWARD_ID]?.uses !== undefined) {
      const storedCount = userProgress.rewards[FLEX_SAVE_REWARD_ID].uses;
      
      // Update the streak manager cache to match
      if (simpleStreakManager.streakCache.flexSavesAvailable !== storedCount) {
        simpleStreakManager.streakCache.flexSavesAvailable = storedCount;
      }
      
      console.log(`[FLEXSAVE DEBUG] Direct flexSave count from storage: ${storedCount}`);
      return storedCount;
    }
    
    // Fallback to streak manager status
    const streakStatus = await simpleStreakManager.getStreakStatus();
    console.log(`[FLEXSAVE DEBUG] Fallback flexSave count from streak manager: ${streakStatus.flexSavesAvailable}`);
    return streakStatus.flexSavesAvailable;
  } catch (error) {
    console.error('[FLEXSAVE ERROR] Error getting flexSaves available:', error);
    return 0;
  }
};

/**
 * Apply a streak flexSave for yesterday
 * Uses simpleStreakManager's implementation with version checking
 */
export const applyFlexSave = async (): Promise<{
  success: boolean;
  appliedDate: string;
  remainingFlexSaves: number;
}> => {
  try {
    console.log('[FLEXSAVE DEBUG] Attempting to apply streak flexSave');
    
    // Log detailed streak info before applying
    const beforeStatus = await simpleStreakManager.getLegacyStreakStatus();
    console.log(`[FLEXSAVE DEBUG] Status before applying: streakBroken=${beforeStatus.streakBroken}, currentStreak=${beforeStatus.currentStreak}, canSaveYesterdayStreak=${beforeStatus.canSaveYesterdayStreak}, flexSavesAvailable=${beforeStatus.flexSavesAvailable}, hasTodayActivity=${beforeStatus.hasTodayActivity}`);
    
    // Check today's activity explicitly
    const todayActivity = await simpleStreakManager.hasRoutineToday();
    const yestActivity = await simpleStreakManager.hasRoutineYesterday(); 
    console.log(`[FLEXSAVE DEBUG] Activity checks - Today: ${todayActivity}, Yesterday: ${yestActivity}`);
    
    // Apply flexSave through the simpleStreakManager with retry for version conflicts
    const result = await simpleStreakManager.applyFlexSave();
    
    if (result.success) {
      // Play flexSave sound on success
      await soundEffects.playSound('flexSave');
      
      // Get yesterday's date for the result
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = dateUtils.formatDateYYYYMMDD(yesterday);
      
      
      // Log detailed streak info after applying
      const afterStatus = await simpleStreakManager.getLegacyStreakStatus();
      console.log(`[FLEXSAVE DEBUG] Status after applying: streakBroken=${afterStatus.streakBroken}, currentStreak=${afterStatus.currentStreak}, flexSavesAvailable=${afterStatus.flexSavesAvailable}`);
      
      return {
        success: true,
        appliedDate: yesterdayStr,
        remainingFlexSaves: result.remainingFlexSaves
      };
    } else {
      console.log(`[FLEXSAVE DEBUG] Failed to apply flexSave, remaining flexSaves: ${result.remainingFlexSaves}`);
      
      // Log reason for failure if possible
      if (beforeStatus.flexSavesAvailable <= 0) {
        console.log(`[FLEXSAVE DEBUG] Failure reason: No flexSaves available`);
      } else if (!beforeStatus.canSaveYesterdayStreak) {
        console.log(`[FLEXSAVE DEBUG] Failure reason: Cannot save yesterday's streak`);
      } else if (await simpleStreakManager.isStreakBroken()) {
        console.log(`[FLEXSAVE DEBUG] Failure reason: Streak truly broken (missed more than 2 days)`);
      } else {
        console.log(`[FLEXSAVE DEBUG] Failure reason: Unknown`);
      }
      
      return {
        success: false,
        appliedDate: '',
        remainingFlexSaves: result.remainingFlexSaves
      };
    }
  } catch (error) {
    console.error('[FLEXSAVE ERROR] Error applying streak flexSave:', error);
    return {
      success: false,
      appliedDate: '',
      remainingFlexSaves: await getFlexSavesAvailable()
    };
  }
};

/**
 * Refill streak flexSaves on a monthly basis or when premium status changes
 */
export const refillFlexSaves = async (): Promise<boolean> => {
  try {
    
    // Check if user has access to streak flexSaves feature
    const hasAccess = await featureAccessUtils.canAccessFeature('flex_saves');
    if (!hasAccess) {
      console.log('[FLEXSAVE DEBUG] User does not have access to streak flexSaves feature');
      return false;
    }
    
    // Get the current date
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get the user progress to check last refill date and current flexSaves
    const userProgress = await storageService.getUserProgress();
    const flexSaveReward = userProgress.rewards?.[FLEX_SAVE_REWARD_ID];
    
    // Get current flexSave count
    const currentFlexSaves = flexSaveReward?.uses || 0;
    
    let lastRefill = new Date(0);
    if (flexSaveReward?.lastRefill) {
      lastRefill = new Date(flexSaveReward.lastRefill);
    }
    
    const lastRefillMonth = lastRefill.getMonth();
    const lastRefillYear = lastRefill.getFullYear();
    
    console.log(`[FLEXSAVE DEBUG] Refill check - Current: ${currentMonth+1}/${currentYear}, Last refill: ${lastRefillMonth+1}/${lastRefillYear}, Current flexSaves: ${currentFlexSaves}/${MAX_FLEX_SAVES}`);
    
    // If premium was just gained OR we're in a new month, refill flexSaves
    const isDifferentMonth = lastRefillMonth !== currentMonth || lastRefillYear !== currentYear;
    const needsRefill = isDifferentMonth && currentFlexSaves < MAX_FLEX_SAVES;
    
    if (needsRefill || currentFlexSaves === 0) {  // Added condition to refill if flexSaves are 0
      console.log(`[FLEXSAVE DEBUG] Refilling flexSaves: ${currentFlexSaves} → ${MAX_FLEX_SAVES} for month ${currentMonth + 1}/${currentYear}`);
      
      // Set value directly in UserProgress first
      if (userProgress.rewards[FLEX_SAVE_REWARD_ID]) {
        userProgress.rewards[FLEX_SAVE_REWARD_ID].uses = MAX_FLEX_SAVES;
        userProgress.rewards[FLEX_SAVE_REWARD_ID].lastRefill = today.toISOString();
      } else {
        // Create the reward if it doesn't exist
        userProgress.rewards[FLEX_SAVE_REWARD_ID] = {
          id: FLEX_SAVE_REWARD_ID,
          title: "Flex Saves",
          description: "FlexSave your streak to protect it when you miss a day",
          icon: "snow",
          unlocked: true,
          levelRequired: 6,
          type: "consumable",
          uses: MAX_FLEX_SAVES,
          appliedDates: [],
          lastRefill: today.toISOString()
        };
      }
      
      // Save to storage first
      await storageService.saveUserProgress(userProgress);
      
      // Then update the cache
      simpleStreakManager.streakCache.flexSavesAvailable = MAX_FLEX_SAVES;
      
      // Use simpleStreakManager to refill flexSaves as a backup
      await simpleStreakManager.refillFlexSaves();
      
      console.log(`[FLEXSAVE DEBUG] Successfully refilled streak flexSaves to ${MAX_FLEX_SAVES} for ${currentMonth + 1}/${currentYear}`);
      return true;
    } else {
      if (currentFlexSaves >= MAX_FLEX_SAVES) {
        console.log(`[FLEXSAVE DEBUG] Flex saves already at maximum: ${currentFlexSaves}/${MAX_FLEX_SAVES}`);
      } else if (!isDifferentMonth) {
        console.log(`[FLEXSAVE DEBUG] Flex saves already refilled this month (${currentMonth + 1}/${currentYear})`);
      }
    }
    
    return false;
  } catch (error) {
    console.error('[FLEXSAVE ERROR] Error refilling streak flexSaves:', error);
    return false;
  }
};

/**
 * Backward compatibility functions
 */

export const refillMonthlyFlexSaves = refillFlexSaves;
export const getFlexSaveCount = getFlexSavesAvailable;

export const wasFlexSaveUsedForCurrentDay = async (): Promise<boolean> => {
  console.warn('[FLEXSAVE WARN] wasFlexSaveUsedForCurrentDay is deprecated. Use wasFlexSaveAppliedRecently instead.');
  return wasFlexSaveAppliedRecently();
}; 