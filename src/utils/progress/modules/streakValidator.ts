/**
 * Streak Validator - Utility to check and fix streak values across the app
 * 
 * This module ensures streak consistency by comparing values from different sources
 * and correcting any discrepancies found.
 */

import * as storageService from '../../../services/storageService';
import * as streakManager from './streakManager';
import { calculateStreakWithFlexSaves } from './progressTracker';
import * as dateUtils from './utils/dateUtils';

/**
 * Validates and corrects streak calculations across all parts of the app
 * Use this to ensure consistency when values might be out of sync
 * 
 * @returns Object with validation results and corrections made
 */
export const validateAndCorrectStreak = async (): Promise<{
  success: boolean;
  originalValues: {
    storedStreak: number;
    managerStreak: number;
    calculatedStreak: number;
    flexSaveCount: number;
  };
  correctedStreak: number;
  correctedFlexSaveCount: number;
  corrections: string[];
}> => {
  try {
    console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - Current date/time: ${new Date().toISOString()}`);
    console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - Today string: ${dateUtils.todayStringLocal()}`);
    console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - Yesterday string: ${dateUtils.yesterdayStringLocal()}`);
    console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - Local timezone offset: ${new Date().getTimezoneOffset() / -60}h`);
    
    console.log('[VALIDATOR DEBUG] Starting streak validation and correction');
    const corrections: string[] = [];
    
    // 1. Get user progress from storage
    const userProgress = await storageService.getUserProgress();
    const storedStreak = userProgress.statistics.currentStreak || 0;
    
    // Get stored flexSave count
    const storedFlexSaveCount = userProgress.rewards?.flex_saves?.uses || 0;
    
    // 2. Get streak from streak manager
    if (!streakManager.streakCache.initialized) {
      await streakManager.initializeStreak();
    }
    const streakStatus = await streakManager.getStreakStatus();
    const managerStreak = streakStatus.currentStreak;
    const managerFlexSaveCount = streakStatus.flexSavesAvailable;
    
    // 3. Calculate streak directly from data
    const routines = await storageService.getAllRoutines();
    const flexSaveDates = userProgress.rewards?.flex_saves?.appliedDates || [];
    
    console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - Routine count: ${routines.length}`);
    if (routines.length > 0) {
      console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - First routine date: ${routines[0].date}`);
      console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - First routine parsed: ${new Date(routines[0].date).toISOString()}`);
    }
    
    // Extract routine dates
    const routineDates = routines
      .filter(r => r.date)
      .map(r => dateUtils.toDateString(r.date));
    
    console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - Found ${routineDates.length} routine dates and ${flexSaveDates.length} flexSave dates for calculation`);
    console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - First few routine dates: ${routineDates.slice(0, 3).join(', ')}`);
    console.log(`[VALIDATOR TIMEZONE DEBUG] validateAndCorrectStreak - FlexSave dates: ${flexSaveDates.join(', ')}`);
    
    // Calculate with flexSaves
    const calculatedStreak = calculateStreakWithFlexSaves(routineDates, flexSaveDates);
    
    // 4. Compare and log discrepancies
    console.log('[VALIDATOR DEBUG] Streak validation values:', {
      storedStreak,
      managerStreak,
      calculatedStreak,
      storedFlexSaveCount,
      managerFlexSaveCount
    });
    
    // 5. Determine correct streak (prefer calculated streak with flexSaves)
    const correctedStreak = calculatedStreak;
    
    // 6. Determine correct flexSave count
    // IMPORTANT: Always respect the stored flexSave count unless there's a significant issue
    const MAX_FLEX_SAVES = 2;
    let correctedFlexSaveCount = storedFlexSaveCount;
    
    // Only cap if it exceeds the maximum
    if (correctedFlexSaveCount > MAX_FLEX_SAVES) {
      correctedFlexSaveCount = MAX_FLEX_SAVES;
      corrections.push(`Capped flexSave count to maximum ${MAX_FLEX_SAVES}`);
      console.log(`[VALIDATOR DEBUG] Capping flexSave count from ${storedFlexSaveCount} to max ${MAX_FLEX_SAVES}`);
    }
    
    // 7. Fix any streak discrepancies
    if (storedStreak !== correctedStreak) {
      console.log(`[VALIDATOR DEBUG] Correcting stored streak: ${storedStreak} → ${correctedStreak}`);
      userProgress.statistics.currentStreak = correctedStreak;
      corrections.push(`Stored streak corrected: ${storedStreak} → ${correctedStreak}`);
    }
    
    if (managerStreak !== correctedStreak) {
      console.log(`[VALIDATOR DEBUG] Correcting streak manager cache: ${managerStreak} → ${correctedStreak}`);
      await streakManager.updateStoredStreak(correctedStreak);
      corrections.push(`Manager streak corrected: ${managerStreak} → ${correctedStreak}`);
    }
    
    // 8. Fix flexSave count only if it exceeds the maximum
    if (storedFlexSaveCount > MAX_FLEX_SAVES) {
      console.log(`[VALIDATOR DEBUG] Correcting excessive stored flexSave count: ${storedFlexSaveCount} → ${correctedFlexSaveCount}`);
      
      if (userProgress.rewards?.flex_saves) {
        userProgress.rewards.flex_saves.uses = correctedFlexSaveCount;
        corrections.push(`Stored flexSave count capped: ${storedFlexSaveCount} → ${correctedFlexSaveCount}`);
      }
    } else if (storedFlexSaveCount !== managerFlexSaveCount) {
      // If manager cache doesn't match storage, update the cache to match storage
      // This specifically prevents the manager from overriding the storage
      console.log(`[VALIDATOR DEBUG] Syncing manager flexSave count with storage: ${managerFlexSaveCount} → ${storedFlexSaveCount}`);
      
      streakManager.streakCache.flexSavesAvailable = storedFlexSaveCount;
      corrections.push(`Manager flexSave count synced with storage: ${managerFlexSaveCount} → ${storedFlexSaveCount}`);
    }
    
    // 9. Save any changes
    if (corrections.length > 0) {
      console.log(`[VALIDATOR DEBUG] Saving corrections to storage: ${corrections.length} fixes applied`);
      await storageService.saveUserProgress(userProgress);
      
      // Ensure streak manager cache is updated
      streakManager.streakCache.currentStreak = correctedStreak;
      streakManager.streakCache.flexSavesAvailable = correctedFlexSaveCount;
    } else {
      console.log('[VALIDATOR DEBUG] No corrections needed, streak data is consistent');
    }
    
    // 10. Return results
    return {
      success: true,
      originalValues: {
        storedStreak,
        managerStreak,
        calculatedStreak,
        flexSaveCount: storedFlexSaveCount
      },
      correctedStreak,
      correctedFlexSaveCount,
      corrections
    };
  } catch (error) {
    console.error('[VALIDATOR ERROR] Error validating streak:', error);
    return {
      success: false,
      originalValues: {
        storedStreak: 0,
        managerStreak: 0,
        calculatedStreak: 0,
        flexSaveCount: 0
      },
      correctedStreak: 0,
      correctedFlexSaveCount: 0,
      corrections: ['Validation failed due to error']
    };
  }
};

/**
 * Call this function after app startup to ensure streak values are consistent
 */
export const runStartupStreakValidation = async (): Promise<void> => {
  try {
    console.log('[VALIDATOR DEBUG] Running startup streak validation...');
    
    // First validate and correct streak
    const streakResult = await validateAndCorrectStreak();
    
    if (streakResult.corrections.length > 0) {
      console.log('[VALIDATOR DEBUG] Streak validation made corrections:', streakResult.corrections);
    } else {
      console.log('[VALIDATOR DEBUG] Streak validation completed: No streak corrections needed');
    }
    
    // Then fix flexSave count based on actual usage
    const flexSaveResult = await fixFlexSaveCountBasedOnUsage();
    
    if (flexSaveResult.originalCount !== flexSaveResult.correctedCount) {
      console.log(`[VALIDATOR DEBUG] Corrected flexSave count: ${flexSaveResult.originalCount} → ${flexSaveResult.correctedCount}`);
    } else {
      console.log(`[VALIDATOR DEBUG] FlexSave count validation completed: Count is correct (${flexSaveResult.correctedCount})`);
    }
    
    // Check if streak is actually broken (missed multiple days)
    const isStreakBroken = await streakManager.isStreakBroken();
    
    if (isStreakBroken) {
      console.log('[VALIDATOR DEBUG] Streak is completely broken (multiple days missed). UI will show as 0.');
      // Note: We don't actually reset the stored streak here
      // This is handled by the UI layer showing 0 instead of the stored value
      // When the user completes their next routine, the streak will restart from 1
    }

    // Force refresh of the streak cache to ensure UI components have latest data
    await forceStreakRefresh();
    
    console.log('[VALIDATOR DEBUG] Startup streak validation completed successfully');
  } catch (error) {
    console.error('[VALIDATOR ERROR] Error in startup streak validation:', error);
  }
};

/**
 * Forces a complete refresh of the streak cache by clearing and re-initializing it
 * Used to ensure all UI components have the most up-to-date streak data
 */
export const forceStreakRefresh = async (): Promise<void> => {
  try {
    console.log('[VALIDATOR DEBUG] Forcing streak cache refresh...');
    
    // Clear initialized flag to force a complete refresh
    streakManager.streakCache.initialized = false;
    
    // Re-initialize from scratch
    await streakManager.initializeStreak();
    
    // Emit streak_updated event to trigger UI updates
    streakManager.streakEvents.emit('streak_updated');
    
    console.log('[VALIDATOR DEBUG] Streak cache refresh complete');
  } catch (error) {
    console.error('[VALIDATOR ERROR] Error forcing streak refresh:', error);
  }
};

/**
 * Manually set the streak flexSave count
 * This is useful for recovery situations where the count is wrong
 * 
 * @param count The count to set
 * @returns Whether the operation was successful
 */
export const setFlexSaveCount = async (count: number): Promise<boolean> => {
  try {
    console.log(`[VALIDATOR DEBUG] Manually setting flexSave count to ${count}`);
    
    // Validate the count
    const MAX_FLEX_SAVES = 2;
    const validCount = Math.max(0, Math.min(count, MAX_FLEX_SAVES));
    
    // Get user progress
    const userProgress = await storageService.getUserProgress();
    
    // Update in UserProgress
    if (userProgress.rewards?.flex_saves) {
      userProgress.rewards.flex_saves.uses = validCount;
    } else {
      // Initialize reward if it doesn't exist
      console.log('[VALIDATOR DEBUG] Creating flex_saves reward in UserProgress');
      userProgress.rewards['flex_saves'] = {
        id: 'flex_saves',
        title: "Flex Saves",
        description: "FlexSave your streak to protect it when you miss a day",
        icon: "snow",
        unlocked: true,
        levelRequired: 6,
        type: "consumable",
        uses: validCount,
        appliedDates: [],
        lastRefill: new Date().toISOString()
      };
    }
    
    // Save changes
    await storageService.saveUserProgress(userProgress);
    
    // Update streak manager cache
    streakManager.streakCache.flexSavesAvailable = validCount;
    
    console.log(`[VALIDATOR DEBUG] Successfully set flexSave count to ${validCount}`);
    return true;
  } catch (error) {
    console.error('[VALIDATOR ERROR] Error setting flexSave count:', error);
    return false;
  }
};

/**
 * Fix the streak flexSave count based on the number of applied dates
 * This is useful in cases where the flexSave count is inconsistent with applied dates
 */
export const fixFlexSaveCountBasedOnUsage = async (): Promise<{
  success: boolean;
  originalCount: number;
  correctedCount: number;
}> => {
  try {
    console.log('[VALIDATOR DEBUG] Checking flexSave count based on usage');
    
    // Get user progress
    const userProgress = await storageService.getUserProgress();
    
    // Get current data
    const MAX_FLEX_SAVES = 2;
    const currentCount = userProgress.rewards?.flex_saves?.uses || 0;
    const appliedDates = userProgress.rewards?.flex_saves?.appliedDates || [];
    
    // IMPORTANT: Always respect the current usage count in storage
    // This prevents overriding user-applied flexSaves that haven't been accounted for yet
    // Only refill flexSaves if we've changed months or if there's a major discrepancy
    
    // Check if we need to do a month refill
    const today = new Date();
    const lastRefillDate = userProgress.rewards?.flex_saves?.lastRefill 
      ? new Date(userProgress.rewards?.flex_saves?.lastRefill)
      : new Date(0);
    
    const isNewMonth = 
      lastRefillDate.getMonth() !== today.getMonth() || 
      lastRefillDate.getFullYear() !== today.getFullYear();
    
    console.log(`[VALIDATOR DEBUG] FlexSave count: current=${currentCount}, applied dates=${appliedDates.length}, is new month=${isNewMonth}`);
    
    // If it's a new month, reset to max flexSaves
    if (isNewMonth) {
      console.log(`[VALIDATOR DEBUG] New month detected - resetting flexSaves to ${MAX_FLEX_SAVES}`);
      await setFlexSaveCount(MAX_FLEX_SAVES);
      
      // Update the lastRefill date
      if (userProgress.rewards?.flex_saves) {
        userProgress.rewards.flex_saves.lastRefill = today.toISOString();
        await storageService.saveUserProgress(userProgress);
      }
      
      return {
        success: true,
        originalCount: currentCount,
        correctedCount: MAX_FLEX_SAVES
      };
    }
    
    // Not a new month - only correct if there's a major discrepancy
    // specifically if currentCount > MAX_FLEX_SAVES
    if (currentCount > MAX_FLEX_SAVES) {
      console.log(`[VALIDATOR DEBUG] FlexSave count exceeds maximum (${currentCount} > ${MAX_FLEX_SAVES}), capping to ${MAX_FLEX_SAVES}`);
      await setFlexSaveCount(MAX_FLEX_SAVES);
      return {
        success: true,
        originalCount: currentCount,
        correctedCount: MAX_FLEX_SAVES
      };
    }
    
    // Otherwise, respect the current count
    console.log(`[VALIDATOR DEBUG] Current flexSave count (${currentCount}) is valid, no correction needed`);
    return {
      success: true,
      originalCount: currentCount,
      correctedCount: currentCount
    };
  } catch (error) {
    console.error('[VALIDATOR ERROR] Error fixing flexSave count:', error);
    return {
      success: false,
      originalCount: 0,
      correctedCount: 0
    };
  }
}; 