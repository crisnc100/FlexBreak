import { UserProgress } from '../types';
import * as storageService from '../../../services/storageService';
import * as streakFreezeManager from './streakFreezeManager';
import * as achievementManager from './achievementManager';
import * as dateUtils from './utils/dateUtils';
import { calculateStreak } from './progressTracker';
import { EventEmitter } from './utils/EventEmitter';
import * as cacheUtils from './utils/cacheUtils';
import * as challengeManager from './challengeManager';
import * as soundEffects from '../../../utils/soundEffects';

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
  hasTodayActivity: boolean;
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
  
  const dayBeforeYesterday = new Date(yesterday);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
  
  const todayStr = dateUtils.formatDateYYYYMMDD(today);
  const yesterdayStr = dateUtils.formatDateYYYYMMDD(yesterday);
  const dayBeforeYesterdayStr = dateUtils.formatDateYYYYMMDD(dayBeforeYesterday);
  
  // Check for specific activity on today, yesterday, and the day before
  const hasTodayActivity = allRoutines.some(routine => 
    routine.date && routine.date.startsWith(todayStr)
  );
  
  const hasYesterdayActivity = allRoutines.some(routine => 
    routine.date && routine.date.startsWith(yesterdayStr)
  );
  
  const hasDayBeforeYesterdayActivity = allRoutines.some(routine => 
    routine.date && routine.date.startsWith(dayBeforeYesterdayStr)
  );
  
  // Check if a streak freeze was used for yesterday
  const streakFreezeUsed = await streakFreezeManager.wasStreakFreezeUsedForCurrentDay();
  
  console.log(`Activity check - Today (${todayStr}): ${hasTodayActivity}, Yesterday (${yesterdayStr}): ${hasYesterdayActivity}, Day Before (${dayBeforeYesterdayStr}): ${hasDayBeforeYesterdayActivity}, Streak freeze used: ${streakFreezeUsed}`);
  
  // Check for a multi-day gap in activity (2+ days missed)
  // A 2-day gap is when both yesterday AND day before yesterday have no activity
  const hasMultiDayGap = !hasYesterdayActivity && !hasDayBeforeYesterdayActivity && storedStreak > 0;
  
  // Log multi-day gap check
  console.log(`Multi-day gap check: ${hasMultiDayGap} (Yesterday: ${!hasYesterdayActivity}, Day before: ${!hasDayBeforeYesterdayActivity}, Stored streak: ${storedStreak > 0})`);
  
  // If there's a multi-day gap (both yesterday AND day before yesterday were missed), 
  // reset streak to 0 - streak freeze can't save a 2+ day gap
  if (hasMultiDayGap) {
    console.log('Multi-day gap detected (2+ days missed). Streak freeze cannot be applied.');
    
    // If there's activity today, set streak to 1 to restart it
    // Otherwise, reset streak to 0
    if (hasTodayActivity) {
      console.log('Activity detected today after multi-day gap. Starting new streak at 1.');
      
      // Check if we've already updated the streak to avoid redundant updates
      if (userProgress.statistics.currentStreak !== 1) {
        userProgress.statistics.currentStreak = 1;
        // Update lastUpdated to mark that we processed today's activity
        userProgress.statistics.lastUpdated = new Date().toISOString();
        await storageService.saveUserProgress(userProgress);
        
        // Emit streak maintained event with newStreak flag
        streakEvents.emit(STREAK_MAINTAINED_EVENT, {
          currentStreak: 1,
          increment: false,
          newStreak: true
        });
      }
      storedStreak = 1;
    } else {
      // No activity today, reset streak to 0
      if (userProgress.statistics.currentStreak !== 0) {
        userProgress.statistics.currentStreak = 0;
        await storageService.saveUserProgress(userProgress);
      }
      storedStreak = 0;
    }
  }
  
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
  
  // Special case: Start a new streak when:
  // 1. There's activity today
  // 2. There was a gap in activity (streak is 0 or was reset due to multi-day gap)
  // 3. We haven't already processed today's activity OR we just reset the streak due to multi-day gap
  const shouldStartNewStreak = 
    hasTodayActivity && 
    storedStreak === 0 && 
    (!isLastUpdatedToday || hasMultiDayGap);
  
  // Debug the increment condition
  console.log('Streak increment check:', {
    hasTodayActivity,
    effectiveYesterdayActivity,
    storedStreak,
    isLastUpdatedToday,
    hasMultiDayGap,
    lastUpdatedStr: userProgress.statistics.lastUpdated,
    todayStr,
    shouldIncrementStreak,
    shouldStartNewStreak
  });
  
  if (shouldIncrementStreak) {
    // Increment the streak counter as we've maintained continuity
    const newStreak = storedStreak + 1;
    
    console.log(`Incrementing streak from ${storedStreak} to ${newStreak} due to continued activity with streak freeze protection`);
    
    // Check if we've already updated to this value to avoid redundant updates
    if (userProgress.statistics.currentStreak !== newStreak) {
      userProgress.statistics.currentStreak = newStreak;
      
      // Update best streak if needed
      if (newStreak > userProgress.statistics.bestStreak) {
        userProgress.statistics.bestStreak = newStreak;
      }
      
      // Update lastUpdated to mark that we processed today's activity
      userProgress.statistics.lastUpdated = new Date().toISOString();
      
      // Save the updated progress
      await storageService.saveUserProgress(userProgress);
      
      // Emit streak maintained event
      streakEvents.emit(STREAK_MAINTAINED_EVENT, {
        currentStreak: newStreak,
        increment: true
      });
    }
    
    // Use the updated streak value
    storedStreak = newStreak;
    
  } else if (shouldStartNewStreak) {
    // Start a new streak at 1 after a gap
    console.log(`Starting new streak after a gap. Setting streak to 1.`);
    
    // Check if we've already updated to this value to avoid redundant updates
    if (userProgress.statistics.currentStreak !== 1) {
      userProgress.statistics.currentStreak = 1;
      
      // Update lastUpdated to mark that we processed today's activity
      userProgress.statistics.lastUpdated = new Date().toISOString();
      
      // Save the updated progress
      await storageService.saveUserProgress(userProgress);
      
      // Emit streak maintained event
      streakEvents.emit(STREAK_MAINTAINED_EVENT, {
        currentStreak: 1,
        increment: false,
        newStreak: true
      });
    }
    
    // Use the updated streak value
    storedStreak = 1;
  }
  
  // A streak is broken if:
  // 1. User had a streak (storedStreak > 0)
  // 2. Yesterday had no activity AND no streak freeze was used
  // 3. OR there was a multi-day gap which automatically breaks the streak
  const streakBroken = (storedStreak > 0 && !effectiveYesterdayActivity) || hasMultiDayGap;
  
  // User can save yesterday's streak if:
  // 1. They have a streak (storedStreak > 0)
  // 2. Yesterday had no activity and no streak freeze was used
  // 3. MUST NOT have a multi-day gap (can't save if both yesterday AND day before were missed)
  // 4. Recent enough to be saved (not too many days ago)
  const canSaveYesterdayStreak = 
    !effectiveYesterdayActivity && 
    storedStreak > 0 &&
    hasDayBeforeYesterdayActivity && // Require activity on the day before yesterday
    daysSinceLastRoutine <= 2 && // Allow saving if within 2 days
    !hasMultiDayGap; // Explicitly check that there is not a multi-day gap
  
  console.log('Streak evaluation:', { 
    storedStreak, 
    calculatedStreak, 
    daysSinceLastRoutine, 
    streakBroken,
    canSaveYesterdayStreak,
    streakFreezeUsed,
    effectiveYesterdayActivity,
    hasMultiDayGap,
    hasDayBeforeYesterdayActivity,
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
  
  // Return streak status information
  return {
    streakBroken,
    freezesAvailable,
    currentStreak: storedStreak,
    shouldShowFreezePrompt,
    canSaveYesterdayStreak: !effectiveYesterdayActivity && 
      storedStreak > 0 &&
      hasDayBeforeYesterdayActivity && // Require activity on the day before yesterday
      daysSinceLastRoutine <= 2 && // Allow saving if within 2 days
      !hasMultiDayGap, // Explicitly check that there is not a multi-day gap
    hasTodayActivity
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
    const streakFreezeReward = userProgress.rewards['streak_freezes'];
    if (!streakFreezeReward || !streakFreezeReward.unlocked) {
      console.log('Streak freeze reward not found or not unlocked');
      return false;
    }
    
    // Check if user has streak freezes available
    const currentCount = streakFreezeReward.uses || 0;
    console.log(`Current streak freeze count before applying: ${currentCount}`);
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
    
    // Play streak freeze sound effect
    await soundEffects.playStreakFreezeSound();
    
    // Update the streak freeze storage time
    // Use UTC date string to easily track last shown notification across time zones
    await cacheUtils.setStoredValue('lastStreakFreezeUsed', new Date().toISOString());
    
    // Clear any pending notifications about broken streaks
    await cacheUtils.setStoredValue('streakBreakNotificationShown', 'true');
    
    console.log('Streak freeze applied successfully. Streak maintained.');
    return true;
  } catch (error) {
    console.error('Error applying streak freeze:', error);
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
  
  // Clean up any old streak_freeze (singular) entries
  if (userProgress.rewards && userProgress.rewards['streak_freeze']) {
    // Copy over any important data from the old entry
    const oldFreeze = userProgress.rewards['streak_freeze'] as any;
    
    if (!userProgress.rewards['streak_freezes']) {
      // Create the new entry with correct data
      userProgress.rewards['streak_freezes'] = {
        id: 'streak_freezes',
        title: 'Streak Freezes',
        description: 'Prevent losing your streak when you miss a day',
        icon: 'snow-outline',
        unlocked: userProgress.level >= 6,
        levelRequired: 6,
        type: 'power_up'
      };
    }
    
    // Copy extended properties
    const newFreeze = userProgress.rewards['streak_freezes'] as any;
    
    // For uses, lastUsed, and lastRefill, only copy if they exist
    if (oldFreeze.uses !== undefined) {
      newFreeze.uses = oldFreeze.uses;
    }
    
    if (oldFreeze.lastUsed) {
      newFreeze.lastUsed = oldFreeze.lastUsed;
    }
    
    if (oldFreeze.lastRefill) {
      newFreeze.lastRefill = oldFreeze.lastRefill;
    }
    
    // Delete the old entry
    delete userProgress.rewards['streak_freeze'];
    
    // Save changes
    await storageService.saveUserProgress(userProgress);
    console.log('Migrated streak_freeze to streak_freezes');
  }
  
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

/**
 * Force an update of all streak challenges - use this after detecting activity
 * @returns Promise<boolean> True if challenges were updated
 */
export const forceUpdateStreakChallenges = async (): Promise<boolean> => {
  try {
    // Get current user progress
    const userProgress = await storageService.getUserProgress();
    
    // Get streak status to check activity
    const streakStatus = await checkStreakStatus();
    
    // Only proceed if there's activity today or current streak > 0
    if (!streakStatus.hasTodayActivity && streakStatus.currentStreak === 0) {
      return false;
    }
    
    // Find all streak challenges that aren't completed
    const streakChallenges = Object.values(userProgress.challenges)
      .filter(c => c.type === 'streak' && !c.completed);
    
    let updatedCount = 0;
    
    // Process each streak challenge
    for (const challenge of streakChallenges) {
      const oldProgress = challenge.progress;
      
      // If there's activity today OR current streak > 0 but progress is 0,
      // force it to match the current streak (minimum 1)
      if ((streakStatus.hasTodayActivity || streakStatus.currentStreak > 0) && oldProgress === 0) {
        // Use current streak as progress, but ensure it's at least 1
        const newProgress = Math.max(1, streakStatus.currentStreak);
        userProgress.challenges[challenge.id].progress = newProgress;
        updatedCount++;
      }
    }
    
    // If changes were made, save progress
    if (updatedCount > 0) {
      await storageService.saveUserProgress(userProgress);
      
      // Invalidate challenge caches to ensure UI updates
      await challengeManager.refreshChallenges(userProgress);
      
      // Emit event so UI can update
      streakEvents.emit(STREAK_MAINTAINED_EVENT, {
        currentStreak: streakStatus.currentStreak,
        streakChallengesUpdated: true
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in forceUpdateStreakChallenges:', error);
    return false;
  }
};
