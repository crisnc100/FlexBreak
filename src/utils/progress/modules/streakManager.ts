import { UserProgress } from '../types';
import * as storageService from '../../../services/storageService';
import * as streakFreezeManager from './streakFreezeManager';
import * as achievementManager from './achievementManager';
import * as dateUtils from './utils/dateUtils';
import { calculateStreak } from './progressTracker';
import { EventEmitter } from './utils/EventEmitter';
import * as cacheUtils from './utils/cacheUtils';

// Event emitter for streak-related events
export const streakEvents = new EventEmitter();
export const STREAK_BROKEN_EVENT = 'streak_broken';
export const STREAK_SAVED_EVENT = 'streak_saved';
export const STREAK_MAINTAINED_EVENT = 'streak_maintained';

// Track whether streak break notification was shown to prevent multiple notifications
let streakBreakNotificationShown = false;
// Track when the notification was last shown for rate limiting
let lastNotificationTimestamp = 0;
// Track how many times notification was shown in last 24 hours
let notificationCount24Hours = 0;

/**
 * Reset the notification flag for testing purposes
 */
export const resetNotificationFlag = () => {
  console.log('Resetting streak break notification flag');
  streakBreakNotificationShown = false;
  lastNotificationTimestamp = 0;
  notificationCount24Hours = 0;
};

/**
 * Check if user streak is broken and handle the logic
 * @returns Object with streak status information
 */
export const checkStreakStatus = async (): Promise<{
  streakBroken: boolean;
  freezesAvailable: number;
  currentStreak: number;
  shouldShowFreezePrompt: boolean;
  canSaveYesterdayStreak: boolean;
}> => {
  const userProgress = await storageService.getUserProgress();
  const allRoutines = await cacheUtils.getCachedRoutines();
  
  console.log('Checking streak status with:', {
    routineCount: allRoutines.length,
    userLevel: userProgress.level,
    storedStreak: userProgress.statistics.currentStreak
  });
  
  // Use calculateStreak from progressTracker to get current streak
  const calculatedStreak = calculateStreak(allRoutines);
  
  // Check if streak is broken
  const lastUpdated = userProgress.statistics.lastUpdated 
    ? new Date(userProgress.statistics.lastUpdated) 
    : new Date();

  const currentDate = new Date();
  const daysSinceLastRoutine = dateUtils.daysBetween(lastUpdated, currentDate);
  
  // Retrieve stored streak
  let storedStreak = userProgress.statistics.currentStreak;
  
  // *** CRITICAL CHECK - If calculated streak is 0 but we have routine data, use data length as stored streak
  // This is a failsafe for when the stored streak value is incorrectly reset or not initialized
  if (storedStreak === 0 && allRoutines.length > 0) {
    // There are routines but stored streak is 0, this is likely a data inconsistency
    // Use routine length as an approximation for streak, or the calculated value if available
    if (calculatedStreak > 0) {
      console.log('Found zero stored streak despite having routines. Using calculated streak:', calculatedStreak);
      storedStreak = calculatedStreak;
      
      // Update stored streak in user progress for future reference
      userProgress.statistics.currentStreak = calculatedStreak;
      await storageService.saveUserProgress(userProgress);
    } else if (allRoutines.length > 0) {
      // Default to using routine count if we have routines but calculated streak is 0
      // This could happen when there's a gap that the calculateStreak function detects
      const defaultStreak = Math.min(allRoutines.length, 5); // Cap this at 5 as a safe default
      console.log('Zero calculated streak despite having routines. Using safe default:', defaultStreak);
      storedStreak = defaultStreak;
      
      // Update stored streak in user progress
      userProgress.statistics.currentStreak = defaultStreak;
      await storageService.saveUserProgress(userProgress);
    }
  }
  
  // Get today and yesterday's dates for specific streak checking
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = dateUtils.formatDateYYYYMMDD(today);
  const yesterdayStr = dateUtils.formatDateYYYYMMDD(yesterday);
  
  // Check for specific activity on today and yesterday
  const hasTodayActivity = allRoutines.some(routine => 
    routine.date && routine.date.startsWith(todayStr)
  );
  
  const hasYesterdayActivity = allRoutines.some(routine => 
    routine.date && routine.date.startsWith(yesterdayStr)
  );
  
  // Check if a streak freeze was used for yesterday
  const streakFreezeUsed = await streakFreezeManager.wasStreakFreezeUsedForCurrentDay();
  
  console.log(`Activity check - Today (${todayStr}): ${hasTodayActivity}, Yesterday (${yesterdayStr}): ${hasYesterdayActivity}, Streak freeze used: ${streakFreezeUsed}`);
  
  // Important: If a streak freeze was applied, treat yesterday as if it had activity
  const effectiveYesterdayActivity = hasYesterdayActivity || streakFreezeUsed;
  
  // Check if lastUpdated is already from today (meaning we already processed today's activity)
  const lastUpdatedDate = new Date(userProgress.statistics.lastUpdated);
  const isLastUpdatedToday = 
    lastUpdatedDate.getFullYear() === today.getFullYear() &&
    lastUpdatedDate.getMonth() === today.getMonth() &&
    lastUpdatedDate.getDate() === today.getDate();
  
  // Only increment if:
  // 1. There's activity today
  // 2. There was effective activity yesterday (actual or via streak freeze)
  // 3. The streak is already active (> 0)
  // 4. We haven't already incremented the streak today
  const shouldIncrementStreak = 
    hasTodayActivity && 
    effectiveYesterdayActivity && 
    storedStreak > 0 && 
    !isLastUpdatedToday;
  
  // Debug the increment condition
  console.log('Streak increment check:', {
    hasTodayActivity,
    effectiveYesterdayActivity,
    storedStreak,
    isLastUpdatedToday,
    lastUpdatedStr: userProgress.statistics.lastUpdated,
    todayStr,
    shouldIncrementStreak
  });
  
  if (shouldIncrementStreak) {
    // Increment the streak counter as we've maintained continuity
    const newStreak = storedStreak + 1;
    
    console.log(`Incrementing streak from ${storedStreak} to ${newStreak} due to continued activity with streak freeze protection`);
    
    userProgress.statistics.currentStreak = newStreak;
    
    // Update best streak if needed
    if (newStreak > userProgress.statistics.bestStreak) {
      userProgress.statistics.bestStreak = newStreak;
    }
    
    // Update lastUpdated to mark that we processed today's activity
    userProgress.statistics.lastUpdated = new Date().toISOString();
    
    // Save the updated progress
    await storageService.saveUserProgress(userProgress);
    
    // Use the updated streak value
    storedStreak = newStreak;
    
    // Emit streak maintained event
    streakEvents.emit(STREAK_MAINTAINED_EVENT, {
      currentStreak: newStreak,
      increment: true
    });
  }
  
  // A streak is broken if:
  // 1. User had a streak (storedStreak > 0)
  // 2. Yesterday had no activity AND no streak freeze was used
  const streakBroken = storedStreak > 0 && !effectiveYesterdayActivity;
  
  // User can save yesterday's streak if:
  // 1. They have a streak (storedStreak > 0)
  // 2. Yesterday had no activity and no streak freeze was used
  // 3. Recent enough to be saved (not too many days ago)
  const canSaveYesterdayStreak = 
    !effectiveYesterdayActivity && 
    storedStreak > 0 &&
    daysSinceLastRoutine <= 2; // Allow saving if within 2 days
  
  console.log('Streak evaluation:', { 
    storedStreak, 
    calculatedStreak, 
    daysSinceLastRoutine, 
    streakBroken,
    canSaveYesterdayStreak,
    streakFreezeUsed,
    effectiveYesterdayActivity,
    lastUpdated: userProgress.statistics.lastUpdated
  });
  
  // If streak was broken too long ago, don't show the prompt again
  if (daysSinceLastRoutine > 2) {
    console.log('Streak broken too long ago, not showing prompt');
    streakBreakNotificationShown = true;
  }
  
  let freezesAvailable = 0;
  let shouldShowFreezePrompt = false;
  
  // Initialize streak freezes just in case
  await streakFreezeManager.refillMonthlyStreakFreezes();
  
  if ((streakBroken || canSaveYesterdayStreak) && !streakBreakNotificationShown) {
    // Check if user has streak freezes available
    const isAvailable = await streakFreezeManager.isStreakFreezeAvailable();
    
    console.log('Streak freeze availability check:', { isAvailable });
    
    if (isAvailable) {
      const freezeReward = userProgress.rewards['streak_freezes'] as any;
      freezesAvailable = freezeReward?.uses || 0;
      
      // Check if user is premium (required for streak freezes)
      const isPremium = userProgress.rewards['premium']?.unlocked === true;
      
      // Check notification rate limiting
      const now = Date.now();
      const hoursSinceLastNotification = (now - lastNotificationTimestamp) / (1000 * 60 * 60);
      
      // Reset notification count if 24 hours have passed
      if (hoursSinceLastNotification >= 24) {
        notificationCount24Hours = 0;
      }
      
      // Only prompt if:
      // 1. User is premium
      // 2. User is at least level 6
      // 3. User has freezes available
      // 4. We haven't shown too many notifications in the last 24 hours (max 2)
      shouldShowFreezePrompt = 
        isPremium && 
        userProgress.level >= 6 && 
        freezesAvailable > 0 &&
        notificationCount24Hours < 2;
      
      console.log('Streak freeze prompt evaluation:', {
        levelCheck: userProgress.level >= 6,
        freezesAvailable,
        isPremium,
        notificationCount24Hours,
        hoursSinceLastNotification,
        shouldShowPrompt: shouldShowFreezePrompt
      });
      
      // If we should show prompt, emit the streak broken event
      if (shouldShowFreezePrompt) {
        streakEvents.emit(STREAK_BROKEN_EVENT, {
          currentStreak: storedStreak,
          freezesAvailable
        });
        
        // Mark as shown to prevent multiple notifications
        streakBreakNotificationShown = true;
        
        // Update notification counters
        lastNotificationTimestamp = now;
        notificationCount24Hours++;
        
        console.log('Emitting streak broken event', {
          currentStreak: storedStreak,
          freezesAvailable,
          notificationCount: notificationCount24Hours
        });
      }
    }
  }
  
  return {
    streakBroken,
    freezesAvailable,
    currentStreak: storedStreak,
    shouldShowFreezePrompt,
    canSaveYesterdayStreak
  };
};

/**
 * Save a broken streak by using a streak freeze
 * @returns True if successful, false otherwise
 */
export const saveStreakWithFreeze = async (): Promise<boolean> => {
  try {
    // Get a fresh copy of user progress
    const userProgress = await storageService.getUserProgress();
    
    // Check if user meets level requirements
    if (userProgress.level < 6) {
      console.log('User level not high enough for streak freezes (minimum level 6)');
      return false;
    }
    
    // Check if streak freeze reward exists and is unlocked
    const streakFreezeReward = userProgress.rewards['streak_freeze'];
    if (!streakFreezeReward || !streakFreezeReward.unlocked) {
      console.log('Streak freeze reward not found or not unlocked');
      return false;
    }
    
    // Check if user has streak freezes available
    const currentCount = streakFreezeReward.uses || 0;
    if (currentCount <= 0) {
      console.log('No streak freezes available to use');
      return false;
    }
    
    console.log(`Directly updating streak freeze count from ${currentCount} to ${currentCount - 1}`);
    
    // Directly update the streak freeze count in the user progress object
    streakFreezeReward.uses = Math.max(0, currentCount - 1); 
    streakFreezeReward.lastUsed = new Date().toISOString();
    
    // Set the lastUpdated date to today's date to maintain streak
    userProgress.statistics.lastUpdated = new Date().toISOString();
    
    // Save the updated user progress with both changes at once
    // This ensures atomic update of both the streak freeze count and the streak maintenance
    await storageService.saveUserProgress(userProgress);
    
    console.log(`Saved streak with freeze. Current streak: ${userProgress.statistics.currentStreak}, Streak freezes remaining: ${streakFreezeReward.uses}`);
    
    // Reset notification flag
    streakBreakNotificationShown = false;
    
    // Return success
    return true;
  } catch (error) {
    console.error('Error saving streak with freeze:', error);
    return false;
  }
};

/**
 * Let the streak break (user declined to use streak freeze)
 */
export const letStreakBreak = async (): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  // Reset the streak counter
  userProgress.statistics.currentStreak = 0;
  
  // Reset streak achievements
  achievementManager.resetStreakAchievements(userProgress);
  
  // Save the updated progress
  await storageService.saveUserProgress(userProgress);
  
  // Reset the notification flag
  streakBreakNotificationShown = false;
  
  return true;
};

/**
 * Set up monthly streak freeze grants for users at level 6+
 * This should be called when the app starts
 */
export const setupMonthlyStreakFreezes = async (): Promise<void> => {
  const userProgress = await storageService.getUserProgress();
  
  // Only proceed if user is at least level 6
  if (userProgress.level < 6) {
    return;
  }
  
  // Ensure the streak_freezes reward is properly set up
  if (!userProgress.rewards.streak_freezes) {
    userProgress.rewards.streak_freezes = {
      id: 'streak_freezes',
      title: 'Streak Freezes',
      description: 'Prevent losing your streak when you miss a day',
      icon: 'snow-outline',
      unlocked: true,
      levelRequired: 6,
      type: 'power_up'
    };
  }
  
  // Unlock the reward if not already unlocked
  userProgress.rewards.streak_freezes.unlocked = true;
  
  // Check if it's time for monthly refill
  const freezeReward = userProgress.rewards.streak_freezes as any;
  const lastRefill = freezeReward.lastRefill ? new Date(freezeReward.lastRefill) : null;
  const now = new Date();
  
  // If no previous refill or it's a new month since last refill
  if (!lastRefill || 
      lastRefill.getMonth() !== now.getMonth() || 
      lastRefill.getFullYear() !== now.getFullYear()) {
    
    // Reset to exactly 2 streak freezes (don't accumulate)
    freezeReward.uses = 2;
    freezeReward.lastRefill = now.toISOString();
    
    await storageService.saveUserProgress(userProgress);
    console.log('Monthly streak freezes refilled: 2 streak freezes granted');
  }
};
