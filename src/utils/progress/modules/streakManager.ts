import * as storageService from '../../../services/storageService';
import * as dateUtils from './utils/dateUtils';
import * as soundEffects from '../../../utils/soundEffects';
import { UserProgress, StreakState } from '../types';
import { EventEmitter } from './utils/EventEmitter';
import * as progressTracker from './progressTracker';
import { saveUserProgressWithVersionCheck } from './utils';

// Constants
const FLEX_SAVE_REWARD_ID = 'flex_saves';
const MAX_FLEX_SAVES = 2;

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
  flexSaveDates: [] as string[],
  flexSavesAvailable: 0,
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
      .map(r => dateUtils.toDateString(r.date));
      

      
    // Get streak flexSaves from storage
    const userProgress = await storageService.getUserProgress();
    const flexSaveDates = userProgress.rewards?.[FLEX_SAVE_REWARD_ID]?.appliedDates?.map((d: string) => 
      dateUtils.toDateString(d)
    ) || [];
    

    
    // Read flexSave count from storage
    let flexSavesAvailable = userProgress.rewards?.[FLEX_SAVE_REWARD_ID]?.uses || 0;
    
    // Calculate flexSave usage for this month to validate the count
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfMonthStr = dateUtils.formatDateYYYYMMDD(firstDayOfMonth);
    
    // Count flexSaves used in the current month
    const usedFlexSavesThisMonth = flexSaveDates.filter(date => 
      date >= firstDayOfMonthStr && date <= dateUtils.todayStringLocal()
    ).length;
    
    // The correct flexSave count should be MAX_FLEX_SAVES - usedFlexSavesThisMonth
    const calculatedFlexSaveCount = Math.max(0, MAX_FLEX_SAVES - usedFlexSavesThisMonth);
    
    
    // If there's a discrepancy, update storage with the correct value
    if (flexSavesAvailable !== calculatedFlexSaveCount) {
      
      // Update in storage
      if (userProgress.rewards?.[FLEX_SAVE_REWARD_ID]) {
        userProgress.rewards[FLEX_SAVE_REWARD_ID].uses = calculatedFlexSaveCount;
        await saveUserProgressWithVersionCheck(userProgress, 'streak_init_flexSaves');
      }
      
      // Use the corrected count
      flexSavesAvailable = calculatedFlexSaveCount;
    }
    
    // Force refill flexSaves for certain conditions
    const forceRefill = flexSavesAvailable === 0 && userProgress.level >= 6;
    if (forceRefill) {
      // Attempt direct refill
      if (userProgress.rewards?.[FLEX_SAVE_REWARD_ID]) {
        userProgress.rewards[FLEX_SAVE_REWARD_ID].uses = 2; // Set to MAX_FLEX_SAVES
        await saveUserProgressWithVersionCheck(userProgress, 'streak_init_refill');
        flexSavesAvailable = 2;
      }
    }
    
    // Calculate streak with flexSaves included
    const calculatedStreak = progressTracker.calculateStreakWithFlexSaves(
      routineDates,
      flexSaveDates
    );
    
    
    // Update streak cache
    streakCache = {
      currentStreak: calculatedStreak,
      routineDates,
      flexSaveDates,
      flexSavesAvailable: forceRefill ? 2 : flexSavesAvailable,
      initialized: true
    };
    
    console.log(`[STREAK TIMEZONE DEBUG] initializeStreak - Final streak cache:`, JSON.stringify({
      currentStreak: streakCache.currentStreak,
      routineDatesCount: streakCache.routineDates.length,
      flexSaveDatesCount: streakCache.flexSaveDates.length,
      flexSavesAvailable: streakCache.flexSavesAvailable
    }));
    
    // Emit streak updated event
    streakEvents.emit(STREAK_UPDATED_EVENT, {
      value: calculatedStreak,
      flexSavesRemaining: streakCache.flexSavesAvailable
    });
    
  } catch (error) {
    console.error(`[STREAK TIMEZONE DEBUG] initializeStreak - Error: ${error}`);
    streakCache.initialized = true; // Set initialized to prevent future failures
  }
};

/**
 * Calculate the current streak based on routine and flexSave dates
 * This is used only for validation and recovery, not normal operations
 */
export const calculateStreakFromHistory = (): number => {
  const { routineDates, flexSaveDates } = streakCache;
  if (!routineDates.length && !flexSaveDates.length) return 0;
  
  // Combine and sort all dates when user was active (routine) or had a flexSave
  const allDates = [...new Set([...routineDates, ...flexSaveDates])].sort();
  
  // Get today's date and yesterday's date
  const todayStr = dateUtils.todayStringLocal();
  
  // Find the most recent date
  let mostRecentDate = allDates[allDates.length - 1];
  
  // If the most recent date is in the future, use today instead
  if (mostRecentDate > todayStr) {
    mostRecentDate = todayStr;
  }
  
  // If the most recent date is not today or yesterday, streak is broken
  const yesterdayStr = dateUtils.yesterdayStringLocal();
  
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
    
    // Check if the previous day has activity or flexSave
    if (allDates.includes(dateStr)) {
      streak++;
    } else {
      // No activity or flexSave on this day - streak ends
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
  
  const today = dateUtils.todayStringLocal();
  return streakCache.routineDates.includes(today);
};

/**
 * Check if user completed a routine yesterday
 */
export const hasRoutineYesterday = async (): Promise<boolean> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  const yesterdayStr = dateUtils.yesterdayStringLocal();
  
  return streakCache.routineDates.includes(yesterdayStr);
};

/**
 * Check if a flexSave was applied for yesterday
 */
export const hasFlexSaveYesterday = async (): Promise<boolean> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  const yesterdayStr = dateUtils.yesterdayStringLocal();
  
  return streakCache.flexSaveDates.includes(yesterdayStr);
};

/**
 * Get the current streak status
 */
export const getStreakStatus = async (forceRefresh = false): Promise<{
  currentStreak: number;
  maintainedToday: boolean;
  canFlexSave: boolean;
  flexSavesAvailable: number;
}> => {
  if (forceRefresh || !streakCache.initialized) {
    await initializeStreak();
  }
  
  const today = dateUtils.todayStringLocal();
  const yesterdayStr = dateUtils.yesterdayStringLocal();
  
  
  const hasToday = streakCache.routineDates.includes(today);
  const hasYesterday = streakCache.routineDates.includes(yesterdayStr) || 
                      streakCache.flexSaveDates.includes(yesterdayStr);
  
  
  // Check if streak is maintained today
  const maintainedToday = hasToday || hasYesterday;
  
  // Check if we have any routines in the past 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = dateUtils.formatDateYYYYMMDD(twoWeeksAgo);
  
  // Find most recent routine date
  const mostRecentRoutineDate = [...streakCache.routineDates].sort().reverse()[0] || '';
  const hasRecentActivity = mostRecentRoutineDate >= twoWeeksAgoStr;
  
  
  // Check if we can apply a flexSave for yesterday
  // Allow flexSaves even if streak is 0 as long as there's recent activity
  const canFlexSave = !hasYesterday && 
                    streakCache.flexSavesAvailable > 0 && 
                    (streakCache.currentStreak > 0 || hasRecentActivity);
  
  return {
    currentStreak: streakCache.currentStreak,
    maintainedToday,
    canFlexSave,
    flexSavesAvailable: streakCache.flexSavesAvailable
  };
};

/**
 * Record a completed routine and update streak
 * 
 * @param dateToUse The date to mark as completed, defaults to today
 * @returns 
 */
export const completeRoutine = async (dateToUse: string = dateUtils.todayStringLocal()): Promise<{
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
    const yesterdayStr = dateUtils.yesterdayStringLocal();
    
    // Check if yesterday had activity or a flexSave
    const hasYesterdayActivity = streakCache.routineDates.includes(yesterdayStr);
    const hasYesterdayFlexSave = streakCache.flexSaveDates.includes(yesterdayStr);
    const yesterdayCovered = hasYesterdayActivity || hasYesterdayFlexSave;
    
    // Also check if we have a flexSave for 2 days ago when today is being processed
    // This handles the case when user completes routine today after applying a flexSave for yesterday
    const twoDaysAgoStr = dateUtils.getDaysAgoString(2);
    const hasTwoDaysAgoFlexSave = streakCache.flexSaveDates.includes(twoDaysAgoStr);
    const hasTwoDaysAgoActivity = streakCache.routineDates.includes(twoDaysAgoStr);
    
    // Using dateToUse === dateUtils.todayStringLocal() checks if we're processing today's routine
    const processingToday = dateToUse === dateUtils.todayStringLocal();
    
    // Special case: Check if we're processing today and have a flexSave for yesterday
    const hasActiveFlexSave = processingToday && hasYesterdayFlexSave;
    
    
    let newStreak = streakCache.currentStreak;
    
    // If yesterday is covered, increase streak (consecutive days)
    if (yesterdayCovered) {
      newStreak += 1;
      streakIncremented = true;
    } else if (hasActiveFlexSave) {
      // Special case: Today's routine after yesterday's flexSave
      // We should maintain streak + 1 since the flexSave already "saved" the previous streak
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
      streakCache.flexSaveDates,
      streakCache.flexSavesAvailable
    );
    
    // Emit streak updated event
    streakEvents.emit(STREAK_UPDATED_EVENT, {
      value: newStreak,
      flexSavesRemaining: streakCache.flexSavesAvailable
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
 * Apply a streak flexSave to save the current streak
 */
export const applyFlexSave = async (): Promise<{
  success: boolean;
  currentStreak: number;
  remainingFlexSaves: number;
}> => {
  try {
    if (!streakCache.initialized) {
      await initializeStreak();
    }
    
    // Get yesterday's date in local time
    const yesterdayStr = dateUtils.yesterdayStringLocal();
    
    // Check if yesterday already has activity or a flexSave
    if (streakCache.routineDates.includes(yesterdayStr)) {
      return {
        success: false,
        currentStreak: streakCache.currentStreak,
        remainingFlexSaves: streakCache.flexSavesAvailable
      };
    }
    
    if (streakCache.flexSaveDates.includes(yesterdayStr)) {
      return {
        success: true,
        currentStreak: streakCache.currentStreak,
        remainingFlexSaves: streakCache.flexSavesAvailable
      };
    }
    
    // Get user progress to check flexSave count directly from storage
    const userProgress = await storageService.getUserProgress();
    const storedFlexSaveCount = userProgress.rewards?.[FLEX_SAVE_REWARD_ID]?.uses || 0;
    const cachedFlexSaveCount = streakCache.flexSavesAvailable;
    
    // Use the higher value between storage and cache to avoid discrepancies
    const currentFlexSaves = Math.max(storedFlexSaveCount, cachedFlexSaveCount);
    
    // Check if we have flexSaves available
    if (currentFlexSaves <= 0) {
      return {
        success: false,
        currentStreak: streakCache.currentStreak,
        remainingFlexSaves: 0
      };
    }
    
    // Check if there's any recent activity (max 2 weeks back) to apply a flexSave to
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
        remainingFlexSaves: currentFlexSaves
      };
    }
    
    
    // Get all flexSaves in the current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfMonthStr = dateUtils.formatDateYYYYMMDD(firstDayOfMonth);

    // Count flexSaves used this month for an accurate count
    const existingFlexSaveDates = userProgress.rewards?.[FLEX_SAVE_REWARD_ID]?.appliedDates || [];
    const flexSavesUsedThisMonth = existingFlexSaveDates.filter(date => 
      date >= firstDayOfMonthStr && date <= dateUtils.todayStringLocal()
    ).length;
    
    console.log(`[STREAK DEBUG] Current month flexSave usage: ${flexSavesUsedThisMonth} used, about to use 1 more`);
    
    // Apply the flexSave
    const updatedFlexSaveDates = [...streakCache.flexSaveDates, yesterdayStr].sort();
    
    // Calculate the updated flexSave count (this month's usage + this flexSave)
    const updatedFlexSaveCount = flexSavesUsedThisMonth + 1;
    const updatedFlexSavesAvailable = Math.max(0, MAX_FLEX_SAVES - updatedFlexSaveCount);
    
    console.log(`[STREAK DEBUG] Updated flexSave availability: ${updatedFlexSavesAvailable} remaining after this use`);
    
    // Calculate what the streak should be with this flexSave
    const updatedStreak = progressTracker.calculateStreakWithFlexSaves(
      streakCache.routineDates,
      updatedFlexSaveDates
    );
    
    // For streak recovery, if current streak is 0 but most recent activity is recent,
    // set the streak to at least 1 to restart the streak
    const finalStreak = updatedStreak > 0 ? updatedStreak : (hasRecentActivity ? 1 : 0);
    
    // Update cache
    streakCache = {
      ...streakCache,
      currentStreak: finalStreak,
      flexSaveDates: updatedFlexSaveDates,
      flexSavesAvailable: updatedFlexSavesAvailable
    };
    
    // Update storage with all streak data
    await updateStorage(
      finalStreak,
      streakCache.routineDates,
      updatedFlexSaveDates,
      updatedFlexSavesAvailable
    );
    
    // Double check UserProgress was updated correctly
    const updatedUserProgress = await storageService.getUserProgress();
    const updatedStoredFlexSaves = updatedUserProgress.rewards?.[FLEX_SAVE_REWARD_ID]?.uses || 0;
    
    // If storage has a different value than what we calculated, update it directly
    if (updatedStoredFlexSaves !== updatedFlexSavesAvailable) {
      console.log(`[STREAK DEBUG] Storage flexSave count (${updatedStoredFlexSaves}) doesn't match calculated (${updatedFlexSavesAvailable}), fixing...`);
      
      if (updatedUserProgress.rewards?.[FLEX_SAVE_REWARD_ID]) {
        updatedUserProgress.rewards[FLEX_SAVE_REWARD_ID].uses = updatedFlexSavesAvailable;
        await saveUserProgressWithVersionCheck(updatedUserProgress, 'flex_save_apply');
        
        // Re-validate to make sure it was applied correctly
        const finalCheck = await storageService.getUserProgress();
        console.log(`[STREAK DEBUG] Final flexSave count validation: ${finalCheck.rewards?.[FLEX_SAVE_REWARD_ID]?.uses}`);
      }
    }
    
    // Play flexSave sound
    await soundEffects.playSound('flexSave');
    
    // Emit event
    streakEvents.emit(STREAK_SAVED_EVENT, {
      currentStreak: finalStreak,
      flexSavesRemaining: updatedFlexSavesAvailable
    });
    
    
    return {
      success: true,
      currentStreak: finalStreak,
      remainingFlexSaves: updatedFlexSavesAvailable
    };
  } catch (error) {
    return {
      success: false,
      currentStreak: streakCache.currentStreak,
      remainingFlexSaves: streakCache.flexSavesAvailable
    };
  }
};

/**
 * Refill streak flexSaves (e.g., at the start of a month)
 */
export const refillFlexSaves = async (): Promise<boolean> => {
  try {
    if (!streakCache.initialized) {
      await initializeStreak();
    }
    
    // Get the current value directly from UserProgress
    const userProgress = await storageService.getUserProgress();
    const currentFlexSaves = userProgress.rewards?.[FLEX_SAVE_REWARD_ID]?.uses || 0;
    
    // Determine if we need to refill
    const needsRefill = currentFlexSaves < MAX_FLEX_SAVES;
    
    // Already at max or we already refilled this month
    if (!needsRefill) {
      return false;
    }
    
    // Update cache
    streakCache = {
      ...streakCache,
      flexSavesAvailable: MAX_FLEX_SAVES
    };
    
    // Update storage
    await updateStorage(
      streakCache.currentStreak,
      streakCache.routineDates,
      streakCache.flexSaveDates,
      MAX_FLEX_SAVES
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
  flexSaveDates: string[],
  flexSavesAvailable: number
): Promise<boolean> => {
  try {
    const userProgress = await storageService.getUserProgress();
  
    // Update streak count
    userProgress.statistics.currentStreak = streak;
    
    // Update best streak if needed
    if (streak > (userProgress.statistics.bestStreak || 0)) {
      userProgress.statistics.bestStreak = streak;
    }
    
    // Update flexSave data
    if (!userProgress.rewards[FLEX_SAVE_REWARD_ID]) {
      // Create the reward if it doesn't exist
      userProgress.rewards[FLEX_SAVE_REWARD_ID] = {
        id: FLEX_SAVE_REWARD_ID,
        title: "Flex Saves",
        description: "FlexSave your streak to protect it when you miss a day",
        icon: "snow",
        unlocked: true,
        levelRequired: 6,
        type: "consumable",
        uses: flexSavesAvailable,
        appliedDates: [...flexSaveDates],
        lastRefill: new Date().toISOString()
      };
    } else {
      // Update existing reward
      userProgress.rewards[FLEX_SAVE_REWARD_ID].uses = flexSavesAvailable;
      userProgress.rewards[FLEX_SAVE_REWARD_ID].appliedDates = [...flexSaveDates];
    }
    
    // Save all changes at once
    await saveUserProgressWithVersionCheck(userProgress);
    
    // Update local cache to ensure consistency
    streakCache = {
      ...streakCache,
      currentStreak: streak,
      routineDates: [...routineDates],
      flexSaveDates: [...flexSaveDates],
      flexSavesAvailable: flexSavesAvailable
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
  flexSavesAvailable: number;
  currentStreak: number;
  shouldShowFlexSavePrompt: boolean;
  canSaveYesterdayStreak: boolean;
  hasTodayActivity: boolean;
}> => {
  if (!streakCache.initialized) {
    await initializeStreak();
  }
  
  const todayStr = dateUtils.todayStringLocal();
  const yesterdayStr = dateUtils.yesterdayStringLocal();
  
  const hasTodayActivity = streakCache.routineDates.includes(todayStr);
  const hasYesterdayActivity = streakCache.routineDates.includes(yesterdayStr);
  const hasYesterdayFlexSave = streakCache.flexSaveDates.includes(yesterdayStr);
  
  // Double-check the streak to ensure it's correct
  const calculatedStreak = progressTracker.calculateStreakWithFlexSaves(
    streakCache.routineDates,
    streakCache.flexSaveDates
  );
  
  // If calculated streak differs from cached streak, update it
  if (calculatedStreak !== streakCache.currentStreak) {
    await updateStoredStreak(calculatedStreak);
  }
  
  // Get flexSave count directly from UserProgress for accuracy
  const userProgress = await storageService.getUserProgress();
  let flexSavesAvailable = streakCache.flexSavesAvailable;
  
  // If UserProgress has a different count, prefer that one
  if (userProgress.rewards?.flex_saves?.uses !== undefined) {
    const storedCount = userProgress.rewards.flex_saves.uses;
    
    if (storedCount !== flexSavesAvailable) {
      flexSavesAvailable = storedCount;
      
      // Update cache to match
      streakCache.flexSavesAvailable = storedCount;
    }
  }
  
  // Check if we have any routines in the past 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = dateUtils.formatDateYYYYMMDD(twoWeeksAgo);
  
  // Find most recent routine date
  const mostRecentRoutineDate = [...streakCache.routineDates].sort().reverse()[0] || '';
  const hasRecentActivity = mostRecentRoutineDate >= twoWeeksAgoStr;
  
  
  // Check if we can apply a flexSave for yesterday
  const canSaveYesterdayStreak = !hasYesterdayActivity && 
                               !hasYesterdayFlexSave && 
                               flexSavesAvailable > 0 &&
                               (streakCache.currentStreak > 0 || hasRecentActivity);
  
  return {
    streakBroken: streakCache.currentStreak === 0,
    flexSavesAvailable,
    currentStreak: streakCache.currentStreak,
    shouldShowFlexSavePrompt: canSaveYesterdayStreak,
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
  flexSavesAvailable: number;
  hasTodayActivity: boolean;
  streakState: StreakState
}> => {
  try {
    // Get legacy status which will correct the streak if needed
    const legacyStatus = await getLegacyStreakStatus();
    
    // Double check flexSave count directly from UserProgress
    const userProgress = await storageService.getUserProgress();
    let flexSavesAvailable = legacyStatus.flexSavesAvailable;
    
    // If UserProgress has a different count, prefer that
    if (userProgress.rewards?.flex_saves?.uses !== undefined) {
      const storedCount = userProgress.rewards.flex_saves.uses;
      
      // If there's a discrepancy, prioritize UserProgress count
      if (storedCount !== flexSavesAvailable) {
        flexSavesAvailable = storedCount;
        
        // Update the cached value to match storage
        streakCache.flexSavesAvailable = storedCount;
      }
    }
    
    // Add the old streakState property
    let streakState: StreakState = 'BROKEN';
    if (legacyStatus.currentStreak > 0) {
      const hasFlexSave = await hasFlexSaveYesterday();
      streakState = hasFlexSave ? 'FROZEN' : 'ACTIVE';
    }
    
    return {
      currentStreak: legacyStatus.currentStreak,
      streakBroken: legacyStatus.streakBroken,
      canSaveYesterdayStreak: legacyStatus.canSaveYesterdayStreak,
      flexSavesAvailable,
      hasTodayActivity: legacyStatus.hasTodayActivity,
      streakState
    };
  } catch (error) {
    return {
      currentStreak: 0,
      streakBroken: true,
      canSaveYesterdayStreak: false,
      flexSavesAvailable: 0,
      hasTodayActivity: false,
      streakState: 'BROKEN'
    };
  }
};

/**
 * @deprecated Backward compatibility function for old API
 * Use applyFlexSave instead
 */
export const saveStreakWithFlexSave = async (): Promise<{
  success: boolean;
  streakState: StreakState;
}> => {
  try {
    const result = await applyFlexSave();
    
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
  const todayStr = dateUtils.todayStringLocal();
  const yesterdayStr = dateUtils.yesterdayStringLocal();
  
  // Get two days ago date string
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = dateUtils.toDateString(twoDaysAgo);
  
  // Check if any of the recent days have routines or flexSaves
  const hasToday = streakCache.routineDates.includes(todayStr);
  const hasYesterday = streakCache.routineDates.includes(yesterdayStr) || 
                      streakCache.flexSaveDates.includes(yesterdayStr);
  const hasTwoDaysAgo = streakCache.routineDates.includes(twoDaysAgoStr) || 
                        streakCache.flexSaveDates.includes(twoDaysAgoStr);
  
  // The streak is broken if:
  // 1. Today is not completed AND
  // 2. Yesterday is not completed (with no flexSave) AND
  // 3. Two days ago is not completed (with no flexSave)
  const isStreakBroken = !hasToday && !hasYesterday && !hasTwoDaysAgo;
  
  return isStreakBroken;
}; 