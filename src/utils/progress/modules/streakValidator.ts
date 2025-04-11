/**
 * Streak Validator - Utility to check and fix streak values across the app
 * 
 * This module ensures streak consistency by comparing values from different sources
 * and correcting any discrepancies found.
 */

import * as storageService from '../../../services/storageService';
import * as streakManager from './streakManager';
import { calculateStreakWithFreezes } from './progressTracker';

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
    freezeCount: number;
  };
  correctedStreak: number;
  correctedFreezeCount: number;
  corrections: string[];
}> => {
  try {
    const corrections: string[] = [];
    
    // 1. Get user progress from storage
    const userProgress = await storageService.getUserProgress();
    const storedStreak = userProgress.statistics.currentStreak || 0;
    
    // Get stored freeze count
    const storedFreezeCount = userProgress.rewards?.streak_freezes?.uses || 0;
    
    // 2. Get streak from streak manager
    if (!streakManager.streakCache.initialized) {
      await streakManager.initializeStreak();
    }
    const streakStatus = await streakManager.getStreakStatus();
    const managerStreak = streakStatus.currentStreak;
    const managerFreezeCount = streakStatus.freezesAvailable;
    
    // 3. Calculate streak directly from data
    const routines = await storageService.getAllRoutines();
    const freezeDates = userProgress.rewards?.streak_freezes?.appliedDates || [];
    
    // Extract routine dates
    const routineDates = routines
      .filter(r => r.date)
      .map(r => r.date.split('T')[0]);
    
    // Calculate with freezes
    const calculatedStreak = calculateStreakWithFreezes(routineDates, freezeDates);
    
    // 4. Compare and log discrepancies
    console.log('Streak validation:', {
      storedStreak,
      managerStreak,
      calculatedStreak,
      storedFreezeCount,
      managerFreezeCount
    });
    
    // 5. Determine correct streak (prefer calculated streak with freezes)
    const correctedStreak = calculatedStreak;
    
    // 6. Determine correct freeze count - if there's a discrepancy, prefer the stored value
    // unless it's over the maximum of 2
    const MAX_FREEZES = 2;
    let correctedFreezeCount = storedFreezeCount;
    
    if (correctedFreezeCount > MAX_FREEZES) {
      correctedFreezeCount = MAX_FREEZES;
      corrections.push(`Capped freeze count to maximum ${MAX_FREEZES}`);
    }
    
    if (storedFreezeCount !== managerFreezeCount) {
      corrections.push(`Freeze count mismatch: stored=${storedFreezeCount}, manager=${managerFreezeCount}, using ${correctedFreezeCount}`);
    }
    
    // 7. Fix any discrepancies
    if (storedStreak !== correctedStreak) {
      console.log(`Correcting stored streak: ${storedStreak} → ${correctedStreak}`);
      userProgress.statistics.currentStreak = correctedStreak;
      corrections.push(`Stored streak corrected: ${storedStreak} → ${correctedStreak}`);
    }
    
    if (managerStreak !== correctedStreak) {
      console.log(`Correcting streak manager: ${managerStreak} → ${correctedStreak}`);
      await streakManager.updateStoredStreak(correctedStreak);
      corrections.push(`Manager streak corrected: ${managerStreak} → ${correctedStreak}`);
    }
    
    // 8. Fix freeze count if needed
    if (storedFreezeCount !== correctedFreezeCount) {
      console.log(`Correcting stored freeze count: ${storedFreezeCount} → ${correctedFreezeCount}`);
      
      if (userProgress.rewards?.streak_freezes) {
        userProgress.rewards.streak_freezes.uses = correctedFreezeCount;
        corrections.push(`Stored freeze count corrected: ${storedFreezeCount} → ${correctedFreezeCount}`);
      }
    }
    
    if (managerFreezeCount !== correctedFreezeCount) {
      console.log(`Correcting manager freeze count: ${managerFreezeCount} → ${correctedFreezeCount}`);
      
      // Update storage with corrected count to fix manager cache
      await streakManager.updateStorage(correctedStreak, routineDates, freezeDates, correctedFreezeCount);
      corrections.push(`Manager freeze count corrected: ${managerFreezeCount} → ${correctedFreezeCount}`);
    }
    
    // 9. Save any changes
    if (corrections.length > 0) {
      await storageService.saveUserProgress(userProgress);
    }
    
    // 10. Return results
    return {
      success: true,
      originalValues: {
        storedStreak,
        managerStreak,
        calculatedStreak,
        freezeCount: storedFreezeCount
      },
      correctedStreak,
      correctedFreezeCount,
      corrections
    };
  } catch (error) {
    console.error('Error validating streak:', error);
    return {
      success: false,
      originalValues: {
        storedStreak: 0,
        managerStreak: 0,
        calculatedStreak: 0,
        freezeCount: 0
      },
      correctedStreak: 0,
      correctedFreezeCount: 0,
      corrections: ['Validation failed due to error']
    };
  }
};

/**
 * Call this function after app startup to ensure streak values are consistent
 */
export const runStartupStreakValidation = async (): Promise<void> => {
  try {
    console.log('Running startup streak validation...');
    
    // First validate and correct streak
    const streakResult = await validateAndCorrectStreak();
    
    if (streakResult.corrections.length > 0) {
      console.log('Streak validation made corrections:', streakResult.corrections);
    } else {
      console.log('Streak validation completed: No streak corrections needed');
    }
    
    // Then fix freeze count based on actual usage
    const freezeResult = await fixFreezeCountBasedOnUsage();
    
    if (freezeResult.originalCount !== freezeResult.correctedCount) {
      console.log(`Corrected freeze count: ${freezeResult.originalCount} → ${freezeResult.correctedCount}`);
    } else {
      console.log(`Freeze count validation completed: Count is correct (${freezeResult.correctedCount})`);
    }
  } catch (error) {
    console.error('Error in startup streak validation:', error);
  }
};

/**
 * Manually set the streak freeze count
 * This is useful for recovery situations where the count is wrong
 * 
 * @param count The count to set
 * @returns Whether the operation was successful
 */
export const setFreezeCount = async (count: number): Promise<boolean> => {
  try {
    console.log(`Manually setting freeze count to ${count}`);
    
    // Validate the count
    const MAX_FREEZES = 2;
    const validCount = Math.max(0, Math.min(count, MAX_FREEZES));
    
    // Get user progress
    const userProgress = await storageService.getUserProgress();
    
    // Update in UserProgress
    if (userProgress.rewards?.streak_freezes) {
      userProgress.rewards.streak_freezes.uses = validCount;
    } else {
      // Initialize reward if it doesn't exist
      userProgress.rewards['streak_freezes'] = {
        id: 'streak_freezes',
        title: "Streak Freezes",
        description: "Freeze your streak to protect it when you miss a day",
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
    streakManager.streakCache.freezesAvailable = validCount;
    
    console.log(`Successfully set freeze count to ${validCount}`);
    return true;
  } catch (error) {
    console.error('Error setting freeze count:', error);
    return false;
  }
};

/**
 * Fix the streak freeze count based on the number of applied dates
 * This is useful in cases where the freeze count is inconsistent with applied dates
 */
export const fixFreezeCountBasedOnUsage = async (): Promise<{
  success: boolean;
  originalCount: number;
  correctedCount: number;
}> => {
  try {
    // Get user progress
    const userProgress = await storageService.getUserProgress();
    
    // Get current data
    const MAX_FREEZES = 2;
    const currentCount = userProgress.rewards?.streak_freezes?.uses || 0;
    const appliedDates = userProgress.rewards?.streak_freezes?.appliedDates || [];
    
    // Count freezes used this month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const freezesUsedThisMonth = appliedDates.filter(dateStr => {
      const freezeDate = new Date(dateStr);
      return freezeDate >= firstDayOfMonth;
    }).length;
    
    // Calculate what the count should be based on monthly freezes used
    const correctedCount = Math.max(0, MAX_FREEZES - freezesUsedThisMonth);
    
    console.log(`Freeze count check: current=${currentCount}, applied=${freezesUsedThisMonth}, corrected=${correctedCount}`);
    
    // Update if different
    if (correctedCount !== currentCount) {
      // Update using the setter function
      await setFreezeCount(correctedCount);
      
      return {
        success: true,
        originalCount: currentCount,
        correctedCount
      };
    }
    
    return {
      success: true,
      originalCount: currentCount,
      correctedCount: currentCount // No change needed
    };
  } catch (error) {
    console.error('Error fixing freeze count:', error);
    return {
      success: false,
      originalCount: 0,
      correctedCount: 0
    };
  }
}; 