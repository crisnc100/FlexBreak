import * as storageService from '../../../services/storageService';
import * as dateUtils from './utils/dateUtils';
import * as soundEffects from '../../../utils/soundEffects';
import { UserProgress, StreakState } from '../types';
import { EventEmitter } from './utils/EventEmitter';
import * as progressTracker from './progressTracker';

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
 * Initialize the streak cache from storage
 */
export const initializeStreak = async (): Promise<void> => {
  try {
    const userProgress = await storageService.getUserProgress();
    const allRoutines = await storageService.getAllRoutines();
    
    // Extract routine dates, properly converting to local dates
    const routineDates = allRoutines
      .filter(r => r.date)
      .map(r => dateUtils.toDateString(r.date!))
      .sort();
    
    // Get streak freeze dates and available freezes
    let freezeDates: string[] = [];
    let freezesAvailable = 0;
    
    if (userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]) {
      freezeDates = userProgress.rewards[STREAK_FREEZE_REWARD_ID].appliedDates || [];
      freezesAvailable = userProgress.rewards[STREAK_FREEZE_REWARD_ID].uses || 0;
    }
    
    // Get the current streak from storage
    const storedStreak = userProgress.statistics.currentStreak || 0;
    
    // Initialize cache
    streakCache = {
      currentStreak: storedStreak,
      routineDates,
      freezeDates,
      freezesAvailable,
      initialized: true
    };
    
    // Calculate streak from history for validation
    const calculatedStreak = progressTracker.calculateStreakWithFreezes(routineDates, freezeDates);
    
    // If there's a significant difference, update the stored streak
    if (calculatedStreak !== storedStreak) {
      // If substantial difference or calculated streak is higher, use calculated one
      if (Math.abs(calculatedStreak - storedStreak) > 2 || calculatedStreak > storedStreak) {
        await updateStoredStreak(calculatedStreak);
      }
    }
    
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
  
  // Check if we can apply a freeze for yesterday
  const canFreeze = !hasYesterday && streakCache.freezesAvailable > 0 && streakCache.currentStreak > 0;
  
  return {
    currentStreak: streakCache.currentStreak,
    maintainedToday,
    canFreeze,
    freezesAvailable: streakCache.freezesAvailable
  };
};

/**
 * Update the streak after completing a routine
 * @param routineDate The date of the completed routine
 */
export const completeRoutine = async (routineDate?: string): Promise<{
  currentStreak: number;
  streakIncremented: boolean;
}> => {
  try {
    if (!streakCache.initialized) {
      await initializeStreak();
    }
    
    // Use provided date or today
    const dateToUse = routineDate || dateUtils.today();
    
    // Check if this date is already recorded
    if (streakCache.routineDates.includes(dateToUse)) {
      return {
        currentStreak: streakCache.currentStreak,
        streakIncremented: false
      };
    }
    
    // Get yesterday
    const yesterdayStr = dateUtils.yesterdayString();
    
    // Check if yesterday had activity or a freeze
    const hasYesterdayActivity = streakCache.routineDates.includes(yesterdayStr);
    const hasYesterdayFreeze = streakCache.freezeDates.includes(yesterdayStr);
    const yesterdayCovered = hasYesterdayActivity || hasYesterdayFreeze;
    
    let newStreak = streakCache.currentStreak;
    let streakIncremented = false;
    
    // Update streak based on simple rules
    if (yesterdayCovered) {
      // Yesterday was covered - increment streak
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
    
    // Add the date to routineDates
    const updatedRoutineDates = [...streakCache.routineDates, dateToUse].sort();
    
    // Update the cache
    streakCache = {
      ...streakCache,
      currentStreak: newStreak,
      routineDates: updatedRoutineDates
    };
    
    // Update storage
    await updateStorage(newStreak, updatedRoutineDates, streakCache.freezeDates, streakCache.freezesAvailable);
    
    // Emit specific event for streak maintained
    if (streakIncremented) {
      streakEvents.emit(STREAK_MAINTAINED_EVENT, {
        currentStreak: newStreak,
        increment: true
      });
    }
    
    // Always emit general streak_updated event to refresh all UI components
    streakEvents.emit(STREAK_UPDATED_EVENT);
    
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
    const currentFreezes = userProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.uses || 0;
    
    // Check if we have freezes available
    if (currentFreezes <= 0) {
      return {
        success: false,
        currentStreak: streakCache.currentStreak,
        remainingFreezes: 0
      };
    }
    
    // Apply the freeze
    const updatedFreezeDates = [...streakCache.freezeDates, yesterdayStr].sort();
    const updatedFreezesAvailable = Math.max(0, currentFreezes - 1);
    
    // Calculate what the streak should be with this freeze
    const updatedStreak = progressTracker.calculateStreakWithFreezes(
      streakCache.routineDates,
      updatedFreezeDates
    );
    
    // Update cache
    streakCache = {
      ...streakCache,
      currentStreak: updatedStreak,
      freezeDates: updatedFreezeDates,
      freezesAvailable: updatedFreezesAvailable
    };
    
    // Update storage with all streak data
    await updateStorage(
      updatedStreak,
      streakCache.routineDates,
      updatedFreezeDates,
      updatedFreezesAvailable
    );
    
    // Double check UserProgress was updated correctly
    const updatedUserProgress = await storageService.getUserProgress();
    const updatedStoredFreezes = updatedUserProgress.rewards?.[STREAK_FREEZE_REWARD_ID]?.uses || 0;
    
    if (updatedStoredFreezes !== updatedFreezesAvailable) {
      // Force update the storage directly
      if (updatedUserProgress.rewards?.[STREAK_FREEZE_REWARD_ID]) {
        updatedUserProgress.rewards[STREAK_FREEZE_REWARD_ID].uses = updatedFreezesAvailable;
        await storageService.saveUserProgress(updatedUserProgress);
      }
    }
    
    // Play freeze sound
    await soundEffects.playSound('streakFreeze');
    
    // Emit event
    streakEvents.emit(STREAK_SAVED_EVENT, {
      currentStreak: updatedStreak,
      freezesRemaining: updatedFreezesAvailable
    });
    
    return {
      success: true,
      currentStreak: updatedStreak,
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
    await storageService.saveUserProgress(userProgress);
  
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
    await storageService.saveUserProgress(userProgress);
    
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
  
  // Check if we can apply a freeze for yesterday
  const canSaveYesterdayStreak = !hasYesterdayActivity && 
                               !hasYesterdayFreeze && 
                               freezesAvailable > 0 &&
                               streakCache.currentStreak > 0;
  
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