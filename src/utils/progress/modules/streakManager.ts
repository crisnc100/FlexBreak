import * as storageService from '../../../services/storageService';
import * as dateUtils from './utils/dateUtils';
import * as soundEffects from '../../../utils/soundEffects';
import { UserProgress, StreakState } from '../types';
import { EventEmitter } from './utils/EventEmitter';
import * as progressTracker from './progressTracker';
import { saveUserProgressWithVersionCheck } from './utils';

// Constants
const STREAK_FREEZE_REWARD_ID = 'streak_freezes';
const MAX_FREEZES = 2;

// Event emitter for streak-related events
export const streakEvents = new EventEmitter();
export const STREAK_BROKEN_EVENT = 'streak_broken';
export const STREAK_SAVED_EVENT = 'streak_saved';
export const STREAK_MAINTAINED_EVENT = 'streak_maintained';
export const STREAK_UPDATED_EVENT = 'streak_updated';

// Simple cache with just the essential data
export let streakCache = {
  currentStreak: 0,
  routineDates: [] as string[],
  freezeDates: [] as string[],
  freezesAvailable: 0,
  initialized: false
};

/**
 * Initialize streak cache from storage
 */
export const initializeStreak = async (): Promise<void> => {
  try {
    
    // Get fresh routines from storage
    const routines = await storageService.getAllRoutines();
    const routineDates = routines
      .filter(r => r.date)
      .map(r => r.date.split('T')[0]);
      
    // Get streak freezes from storage
    const userProgress = await storageService.getUserProgress();
    const freezeDates = userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.appliedDates?.map((d: string) => 
      d.split('T')[0]
    ) || [];
    
    // Read freeze count from storage
    let freezesAvailable = userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.uses || 0;
    
    // Calculate freeze usage for this month to validate the count
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfMonthStr = dateUtils.formatDateYYYYMMDD(firstDayOfMonth);
    
    // Count freezes used in the current month
    const usedFreezesThisMonth = freezeDates.filter(date => 
      date >= firstDayOfMonthStr && date <= dateUtils.today()
    ).length;
    
    // The correct freeze count should be MAX_FREEZES - usedFreezesThisMonth
    const calculatedFreezeCount = Math.max(0, MAX_FREEZES - usedFreezesThisMonth);
    
    
    // If there's a discrepancy, update storage with the correct value
    if (freezesAvailable !== calculatedFreezeCount) {
      
      // Update in storage
      if (userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]) {
        userProgress.rewards[STREAK_FREEZE_REWARD_ID].uses = calculatedFreezeCount;
        await saveUserProgressWithVersionCheck(userProgress, 'streak_init_freezes');
      }
      
      // Use the corrected count
      freezesAvailable = calculatedFreezeCount;
    }
    
    // Force refill freezes for certain conditions
    const forceRefill = freezesAvailable === 0 && userProgress.level >= 6;
    if (forceRefill) {
      // Attempt direct refill
      if (userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]) {
        userProgress.rewards[STREAK_FREEZE_REWARD_ID].uses = 2; // Set to MAX_FREEZES
        await saveUserProgressWithVersionCheck(userProgress, 'streak_init_refill');
        freezesAvailable = 2;
      }
    }
    
    // Calculate streak with freezes included
    const calculatedStreak = progressTracker.calculateStreakWithFreezes(
      routineDates,
      freezeDates
    );
    
    // Update streak cache
    streakCache = {
      currentStreak: calculatedStreak,
      routineDates,
      freezeDates,
      freezesAvailable: forceRefill ? 2 : freezesAvailable,
      initialized: true
    };
    
    
    // Emit streak updated event
    streakEvents.emit(STREAK_UPDATED_EVENT, {
      value: calculatedStreak,
      freezesRemaining: streakCache.freezesAvailable
    });
    
  } catch (error) {
    streakCache.initialized = true; // Set initialized to prevent future failures
  }
};

/**
 * Calculate the current streak based on routine and freeze dates
 * This is used only for validation and recovery, not normal operations
 */
export const calculateStreakFromHistory = (): number => {
  const { routineDates, freezeDates } = streakCache;
  if (!routineDates.length && !freezeDates.length) return 0;
  
  // Combine and sort all dates when user was active (routine) or had a freeze
  const allDates = [...new Set([...routineDates, ...freezeDates])].sort();
  
  // Get today's date and yesterday's date
  const todayStr = dateUtils.today();
  
  // Find the most recent date
  let mostRecentDate = allDates[allDates.length - 1];
  
  // If the most recent date is in the future, use today instead
  if (mostRecentDate > todayStr) {
    mostRecentDate = todayStr;
  }
  
  // If the most recent date is not today or yesterday, streak is broken
  const yesterdayStr = dateUtils.yesterdayString();
  
  if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
    // Check if we have data from today that might not be in the cache yet
    if (allDates.includes(todayStr) || allDates.includes(yesterdayStr)) {
      // Today or yesterday is in dates
    } else {
      return 0; // Streak is broken
    }
  }
  
  // Count consecutive days backwards from the most recent date
  let streak = 1;
  let currentDate = new Date(mostRecentDate);
  
  while (true) {
    // Move to previous day
    currentDate.setDate(currentDate.getDate() - 1);
    const dateStr = dateUtils.toDateString(currentDate);
    
    // Check if the previous day has activity or freeze
    if (allDates.includes(dateStr)) {
      streak++;
    } else {
      // No activity or freeze on this day - streak ends
      break;
    }
  }
  
  return streak;
};

/**
 * Check if user completed a routine today
 */
export const hasRoutineToday = async (): Promise<boolean> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  const today = dateUtils.today();
  return streakCache.routineDates.includes(today);
};

/**
 * Check if user completed a routine yesterday
 */
export const hasRoutineYesterday = async (): Promise<boolean> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  const yesterdayStr = dateUtils.yesterdayString();
  
  return streakCache.routineDates.includes(yesterdayStr);
};

/**
 * Check if a freeze was applied for yesterday
 */
export const hasFreezeYesterday = async (): Promise<boolean> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  const yesterdayStr = dateUtils.yesterdayString();
  
  return streakCache.freezeDates.includes(yesterdayStr);
};

/**
 * Get the current streak status
 */
export const getStreakStatus = async (): Promise<{
  currentStreak: number;
  maintainedToday: boolean;
  canFreeze: boolean;
  freezesAvailable: number;
}> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  const today = dateUtils.today();
  const yesterdayStr = dateUtils.yesterdayString();
  
  const hasToday = streakCache.routineDates.includes(today);
  const hasYesterday = streakCache.routineDates.includes(yesterdayStr) || 
                      streakCache.freezeDates.includes(yesterdayStr);
  
  // Check if streak is maintained today
  const maintainedToday = hasToday || hasYesterday;
  
  // Check if we have any routines in the past 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = dateUtils.formatDateYYYYMMDD(twoWeeksAgo);
  
  // Find most recent routine date
  const mostRecentRoutineDate = [...streakCache.routineDates].sort().reverse()[0] || '';
  const hasRecentActivity = mostRecentRoutineDate >= twoWeeksAgoStr;
  
  
  // Check if we can apply a freeze for yesterday
  // Allow freezes even if streak is 0 as long as there's recent activity
  const canFreeze = !hasYesterday && 
                    streakCache.freezesAvailable > 0 && 
                    (streakCache.currentStreak > 0 || hasRecentActivity);
  
  return {
    currentStreak: streakCache.currentStreak,
    maintainedToday,
    canFreeze,
    freezesAvailable: streakCache.freezesAvailable
  };
};

/**
 * Record a completed routine and update streak
 * 
 * @param dateToUse The date to mark as completed, defaults to today
 * @returns 
 */
export const completeRoutine = async (dateToUse: string = dateUtils.today()): Promise<{
  currentStreak: number;
  streakIncremented: boolean;
}> => {
  try {
    if (!streakCache.initialized) {
      await initializeStreak();
    }
    
    // Check if this date is already marked as completed
    if (streakCache.routineDates.includes(dateToUse)) {
      return {
        currentStreak: streakCache.currentStreak,
        streakIncremented: false
      };
    }
    
    let streakIncremented = false;
    
    // Get yesterday
    const yesterdayStr = dateUtils.yesterdayString();
    
    // Check if yesterday had activity or a freeze
    const hasYesterdayActivity = streakCache.routineDates.includes(yesterdayStr);
    const hasYesterdayFreeze = streakCache.freezeDates.includes(yesterdayStr);
    const yesterdayCovered = hasYesterdayActivity || hasYesterdayFreeze;
    
    // Also check if we have a freeze for 2 days ago when today is being processed
    // This handles the case when user completes routine today after applying a freeze for yesterday
    const twoDaysAgoStr = dateUtils.getDaysAgoString(2);
    const hasTwoDaysAgoFreeze = streakCache.freezeDates.includes(twoDaysAgoStr);
    const hasTwoDaysAgoActivity = streakCache.routineDates.includes(twoDaysAgoStr);
    
    // Using dateToUse === dateUtils.today() checks if we're processing today's routine
    const processingToday = dateToUse === dateUtils.today();
    
    // Special case: Check if we're processing today and have a freeze for yesterday
    const hasActiveFreeze = processingToday && hasYesterdayFreeze;
    
    
    let newStreak = streakCache.currentStreak;
    
    // If yesterday is covered, increase streak (consecutive days)
    if (yesterdayCovered) {
      newStreak += 1;
      streakIncremented = true;
    } else if (hasActiveFreeze) {
      // Special case: Today's routine after yesterday's freeze
      // We should maintain streak + 1 since the freeze already "saved" the previous streak
      newStreak += 1;
      streakIncremented = true;
    } else if (streakCache.currentStreak > 0) {
      // Yesterday wasn't covered and streak was active - reset to 1
      newStreak = 1;
    } else {
      // Start a new streak at 1
      newStreak = 1;
      streakIncremented = true;
    }
    
    // Add this routine date to the list
    const updatedRoutineDates = [...streakCache.routineDates, dateToUse].sort();
    
    // Update streak cache with new values
    streakCache = {
      ...streakCache,
      currentStreak: newStreak,
      routineDates: updatedRoutineDates
    };
    
    // Update storage with all streak data
    await updateStorage(
      newStreak,
      updatedRoutineDates,
      streakCache.freezeDates,
      streakCache.freezesAvailable
    );
    
    // Emit streak updated event
    streakEvents.emit(STREAK_UPDATED_EVENT, {
      value: newStreak,
      freezesRemaining: streakCache.freezesAvailable
    });
    
    return {
      currentStreak: newStreak,
      streakIncremented
    };
  } catch (error) {
    return {
      currentStreak: streakCache.currentStreak,
      streakIncremented: false
    };
  }
};

/**
 * Apply a streak freeze to save the current streak
 */
export const applyFreeze = async (): Promise<{
  success: boolean;
  currentStreak: number;
  remainingFreezes: number;
}> => {
  try {
    if (!streakCache.initialized) {
      await initializeStreak();
    }
    
    // Get yesterday's date in local time
    const yesterdayStr = dateUtils.yesterdayString();
    
    // Check if yesterday already has activity or a freeze
    if (streakCache.routineDates.includes(yesterdayStr)) {
      return {
        success: false,
        currentStreak: streakCache.currentStreak,
        remainingFreezes: streakCache.freezesAvailable
      };
    }
    
    if (streakCache.freezeDates.includes(yesterdayStr)) {
      return {
        success: true,
        currentStreak: streakCache.currentStreak,
        remainingFreezes: streakCache.freezesAvailable
      };
    }
    
    // Get user progress to check freeze count directly from storage
    const userProgress = await storageService.getUserProgress();
    const storedFreezeCount = userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.uses || 0;
    const cachedFreezeCount = streakCache.freezesAvailable;
    
    // Use the higher value between storage and cache to avoid discrepancies
    const currentFreezes = Math.max(storedFreezeCount, cachedFreezeCount);
    
    // Check if we have freezes available
    if (currentFreezes <= 0) {
      return {
        success: false,
        currentStreak: streakCache.currentStreak,
        remainingFreezes: 0
      };
    }
    
    // Check if there's any recent activity (max 2 weeks back) to apply a freeze to
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = dateUtils.formatDateYYYYMMDD(twoWeeksAgo);
    
    // Find most recent routine date
    const routineDates = [...streakCache.routineDates].sort().reverse();
    const mostRecentRoutineDate = routineDates[0] || '';
    const hasRecentActivity = mostRecentRoutineDate >= twoWeeksAgoStr;
    
    // If streak is 0 and no recent activity, don't apply
    if (streakCache.currentStreak === 0 && !hasRecentActivity) {
      return {
        success: false,
        currentStreak: 0,
        remainingFreezes: currentFreezes
      };
    }
    
    
    // Get all freezes in the current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfMonthStr = dateUtils.formatDateYYYYMMDD(firstDayOfMonth);

    // Count freezes used this month for an accurate count
    const existingFreezeDates = userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.appliedDates || [];
    const freezesUsedThisMonth = existingFreezeDates.filter(date => 
      date >= firstDayOfMonthStr && date <= dateUtils.today()
    ).length;
    
    console.log(`[STREAK DEBUG] Current month freeze usage: ${freezesUsedThisMonth} used, about to use 1 more`);
    
    // Apply the freeze
    const updatedFreezeDates = [...streakCache.freezeDates, yesterdayStr].sort();
    
    // Calculate the updated freeze count (this month's usage + this freeze)
    const updatedFreezeCount = freezesUsedThisMonth + 1;
    const updatedFreezesAvailable = Math.max(0, MAX_FREEZES - updatedFreezeCount);
    
    console.log(`[STREAK DEBUG] Updated freeze availability: ${updatedFreezesAvailable} remaining after this use`);
    
    // Calculate what the streak should be with this freeze
    const updatedStreak = progressTracker.calculateStreakWithFreezes(
      streakCache.routineDates,
      updatedFreezeDates
    );
    
    // For streak recovery, if current streak is 0 but most recent activity is recent,
    // set the streak to at least 1 to restart the streak
    const finalStreak = updatedStreak > 0 ? updatedStreak : (hasRecentActivity ? 1 : 0);
    
    // Update cache
    streakCache = {
      ...streakCache,
      currentStreak: finalStreak,
      freezeDates: updatedFreezeDates,
      freezesAvailable: updatedFreezesAvailable
    };
    
    // Update storage with all streak data
    await updateStorage(
      finalStreak,
      streakCache.routineDates,
      updatedFreezeDates,
      updatedFreezesAvailable
    );
    
    // Double check UserProgress was updated correctly
    const updatedUserProgress = await storageService.getUserProgress();
    const updatedStoredFreezes = updatedUserProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.uses || 0;
    
    // If storage has a different value than what we calculated, update it directly
    if (updatedStoredFreezes !== updatedFreezesAvailable) {
      console.log(`[STREAK DEBUG] Storage freeze count (${updatedStoredFreezes}) doesn't match calculated (${updatedFreezesAvailable}), fixing...`);
      
      if (updatedUserProgress.rewards?.[STREAK_FREEZE_REWARD_ID]) {
        updatedUserProgress.rewards[STREAK_FREEZE_REWARD_ID].uses = updatedFreezesAvailable;
        await saveUserProgressWithVersionCheck(updatedUserProgress, 'streak_freeze_apply');
        
        // Re-validate to make sure it was applied correctly
        const finalCheck = await storageService.getUserProgress();
        console.log(`[STREAK DEBUG] Final freeze count validation: ${finalCheck.rewards?.[STREAK_FREEZE_REWARD_ID]?.uses}`);
      }
    }
    
    // Play freeze sound
    await soundEffects.playSound('streakFreeze');
    
    // Emit event
    streakEvents.emit(STREAK_SAVED_EVENT, {
      currentStreak: finalStreak,
      freezesRemaining: updatedFreezesAvailable
    });
    
    
    return {
      success: true,
      currentStreak: finalStreak,
      remainingFreezes: updatedFreezesAvailable
    };
  } catch (error) {
    return {
      success: false,
      currentStreak: streakCache.currentStreak,
      remainingFreezes: streakCache.freezesAvailable
    };
  }
};

/**
 * Refill streak freezes (e.g., at the start of a month)
 */
export const refillFreezes = async (): Promise<boolean> => {
  try {
    if (!streakCache.initialized) {
      await initializeStreak();
    }
    
    // Get the current value directly from UserProgress
    const userProgress = await storageService.getUserProgress();
    const currentFreezes = userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.uses || 0;
    
    // Determine if we need to refill
    const needsRefill = currentFreezes < MAX_FREEZES;
    
    // Already at max or we already refilled this month
    if (!needsRefill) {
      return false;
    }
    
    // Update cache
    streakCache = {
      ...streakCache,
      freezesAvailable: MAX_FREEZES
    };
    
    // Update storage
    await updateStorage(
      streakCache.currentStreak,
      streakCache.routineDates,
      streakCache.freezeDates,
      MAX_FREEZES
    );
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Update the stored streak in UserProgress
 */
export const updateStoredStreak = async (streak: number): Promise<boolean> => {
  try {
    const userProgress = await storageService.getUserProgress();
  
    // First update UserProgress object
    userProgress.statistics.currentStreak = streak;
    
    // Update best streak if needed
    if (streak > (userProgress.statistics.bestStreak || 0)) {
      userProgress.statistics.bestStreak = streak;
    }
    
    // Save to storage
    await saveUserProgressWithVersionCheck(userProgress);
  
    // Then update local cache
    streakCache.currentStreak = streak;
  
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Update the UserProgress object with all streak data
 */
export const updateStorage = async (
  streak: number,
  routineDates: string[],
  freezeDates: string[],
  freezesAvailable: number
): Promise<boolean> => {
  try {
    const userProgress = await storageService.getUserProgress();
  
    // Update streak count
    userProgress.statistics.currentStreak = streak;
    
    // Update best streak if needed
    if (streak > (userProgress.statistics.bestStreak || 0)) {
      userProgress.statistics.bestStreak = streak;
    }
    
    // Update freeze data
    if (!userProgress.rewards[STREAK_FREEZE_REWARD_ID]) {
      // Create the reward if it doesn't exist
      userProgress.rewards[STREAK_FREEZE_REWARD_ID] = {
        id: STREAK_FREEZE_REWARD_ID,
        title: "Streak Freezes",
        description: "Freeze your streak to protect it when you miss a day",
        icon: "snow",
        unlocked: true,
        levelRequired: 6,
        type: "consumable",
        uses: freezesAvailable,
        appliedDates: [...freezeDates],
        lastRefill: new Date().toISOString()
      };
    } else {
      // Update existing reward
      userProgress.rewards[STREAK_FREEZE_REWARD_ID].uses = freezesAvailable;
      userProgress.rewards[STREAK_FREEZE_REWARD_ID].appliedDates = [...freezeDates];
    }
    
    // Save all changes at once
    await saveUserProgressWithVersionCheck(userProgress);
    
    // Update local cache to ensure consistency
    streakCache = {
      ...streakCache,
      currentStreak: streak,
      routineDates: [...routineDates],
      freezeDates: [...freezeDates],
      freezesAvailable: freezesAvailable
    };
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Check whether a streak is active (not broken)
 */
export const isStreakActive = async (): Promise<boolean> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  return streakCache.currentStreak > 0;
};

/**
 * Get compatibility data for legacy code
 */
export const getLegacyStreakStatus = async (): Promise<{
  streakBroken: boolean;
  freezesAvailable: number;
  currentStreak: number;
  shouldShowFreezePrompt: boolean;
  canSaveYesterdayStreak: boolean;
  hasTodayActivity: boolean;
}> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  const todayStr = dateUtils.today();
  const yesterdayStr = dateUtils.yesterdayString();
  
  const hasTodayActivity = streakCache.routineDates.includes(todayStr);
  const hasYesterdayActivity = streakCache.routineDates.includes(yesterdayStr);
  const hasYesterdayFreeze = streakCache.freezeDates.includes(yesterdayStr);
  
  // Double-check the streak to ensure it's correct
  const calculatedStreak = progressTracker.calculateStreakWithFreezes(
    streakCache.routineDates,
    streakCache.freezeDates
  );
  
  // If calculated streak differs from cached streak, update it
  if (calculatedStreak !== streakCache.currentStreak) {
    await updateStoredStreak(calculatedStreak);
  }
  
  // Get freeze count directly from UserProgress for accuracy
  const userProgress = await storageService.getUserProgress();
  let freezesAvailable = streakCache.freezesAvailable;
  
  // If UserProgress has a different count, prefer that one
  if (userProgress.rewards?.streak_freezes?.uses !== undefined) {
    const storedCount = userProgress.rewards.streak_freezes.uses;
    
    if (storedCount !== freezesAvailable) {
      freezesAvailable = storedCount;
      
      // Update cache to match
      streakCache.freezesAvailable = storedCount;
    }
  }
  
  // Check if we have any routines in the past 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = dateUtils.formatDateYYYYMMDD(twoWeeksAgo);
  
  // Find most recent routine date
  const mostRecentRoutineDate = [...streakCache.routineDates].sort().reverse()[0] || '';
  const hasRecentActivity = mostRecentRoutineDate >= twoWeeksAgoStr;
  
  
  // Check if we can apply a freeze for yesterday
  const canSaveYesterdayStreak = !hasYesterdayActivity && 
                               !hasYesterdayFreeze && 
                               freezesAvailable > 0 &&
                               (streakCache.currentStreak > 0 || hasRecentActivity);
  
  return {
    streakBroken: streakCache.currentStreak === 0,
    freezesAvailable,
    currentStreak: streakCache.currentStreak,
    shouldShowFreezePrompt: canSaveYesterdayStreak,
    canSaveYesterdayStreak,
    hasTodayActivity
  };
};

/**
 * @deprecated Backward compatibility function for old API
 * Returns an object format that matches the old API
 */
export const checkStreakStatus = async (): Promise<{
  currentStreak: number;
  streakBroken: boolean;
  canSaveYesterdayStreak: boolean;
  freezesAvailable: number;
  hasTodayActivity: boolean;
  streakState: StreakState
}> => {
  try {
    // Get legacy status which will correct the streak if needed
    const legacyStatus = await getLegacyStreakStatus();
    
    // Double check freeze count directly from UserProgress
    const userProgress = await storageService.getUserProgress();
    let freezesAvailable = legacyStatus.freezesAvailable;
    
    // If UserProgress has a different count, prefer that
    if (userProgress.rewards?.streak_freezes?.uses !== undefined) {
      const storedCount = userProgress.rewards.streak_freezes.uses;
      
      // If there's a discrepancy, prioritize UserProgress count
      if (storedCount !== freezesAvailable) {
        freezesAvailable = storedCount;
        
        // Update the cached value to match storage
        streakCache.freezesAvailable = storedCount;
      }
    }
    
    // Add the old streakState property
    let streakState: StreakState = 'BROKEN';
    if (legacyStatus.currentStreak > 0) {
      const hasFreeze = await hasFreezeYesterday();
      streakState = hasFreeze ? 'FROZEN' : 'ACTIVE';
    }
    
    return {
      currentStreak: legacyStatus.currentStreak,
      streakBroken: legacyStatus.streakBroken,
      canSaveYesterdayStreak: legacyStatus.canSaveYesterdayStreak,
      freezesAvailable,
      hasTodayActivity: legacyStatus.hasTodayActivity,
      streakState
    };
  } catch (error) {
    return {
      currentStreak: 0,
      streakBroken: true,
      canSaveYesterdayStreak: false,
      freezesAvailable: 0,
      hasTodayActivity: false,
      streakState: 'BROKEN'
    };
  }
};

/**
 * @deprecated Backward compatibility function for old API
 * Use applyFreeze instead
 */
export const saveStreakWithFreeze = async (): Promise<{
  success: boolean;
  streakState: StreakState;
}> => {
  try {
    const result = await applyFreeze();
    
    let streakState: StreakState = 'BROKEN';
    if (result.success && result.currentStreak > 0) {
      streakState = 'FROZEN';
    }
    
    return {
      success: result.success,
      streakState
    };
  } catch (error) {
    return {
      success: false,
      streakState: 'BROKEN'
    };
  }
};

/**
 * @deprecated Backward compatibility function for old API
 * No longer needed as streaks are automatically broken when no activity is detected
 */
export const letStreakBreak = async (): Promise<boolean> => {
  // Just update stored streak to 0
  await updateStoredStreak(0);
  
  // Emit streak broken event
  streakEvents.emit(STREAK_BROKEN_EVENT, {
    currentStreak: 0,
    userReset: true
  });
      
  return true;
};

/**
 * @deprecated Backward compatibility function for old API
 * No longer needed as the new streak system doesn't use this flag
 */
export const resetProcessedTodayFlag = async (): Promise<boolean> => {
  // No action needed in the new system, but return true to indicate "success"
  return true;
};

/**
 * @deprecated Backward compatibility function for old API
 * Use getLegacyStreakStatus instead, which will update challenges
 */
export const forceUpdateStreakChallenges = async (): Promise<boolean> => {
  // Just call getLegacyStreakStatus which will handle updating challenges
  await getLegacyStreakStatus();
  
  // Return true to indicate "success"
  return true;
};

/**
 * Check if the streak is broken (more than 2 consecutive days missed)
 * 
 * @returns True if the streak is broken and should reset to 0
 */
export const isStreakBroken = async (): Promise<boolean> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  // Get dates in user's local timezone, not UTC
  const todayStr = dateUtils.today();
  const yesterdayStr = dateUtils.yesterdayString();
  
  // Get two days ago date string
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = dateUtils.toDateString(twoDaysAgo);
  
  // Check if any of the recent days have routines or freezes
  const hasToday = streakCache.routineDates.includes(todayStr);
  const hasYesterday = streakCache.routineDates.includes(yesterdayStr) || 
                      streakCache.freezeDates.includes(yesterdayStr);
  const hasTwoDaysAgo = streakCache.routineDates.includes(twoDaysAgoStr) || 
                        streakCache.freezeDates.includes(twoDaysAgoStr);
  
  // The streak is broken if:
  // 1. Today is not completed AND
  // 2. Yesterday is not completed (with no freeze) AND
  // 3. Two days ago is not completed (with no freeze)
  const isStreakBroken = !hasToday && !hasYesterday && !hasTwoDaysAgo;
  
  return isStreakBroken;
}; 