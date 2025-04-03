import { ProgressEntry } from '../../types';
import { UserProgress, Challenge, Achievement, Reward, CHALLENGE_STATUS } from './types';
import * as storageService from '../../services/storageService';
import { 
  INITIAL_USER_PROGRESS, 
  CORE_CHALLENGES, 
  CORE_ACHIEVEMENTS, 
  CORE_REWARDS, 
  LEVELS,
  REDEMPTION_PERIODS,
  CHALLENGE_LIMITS,
  DAILY_LIMITS
} from './constants';
import * as rewardManager from './modules/rewardManager';
import * as streakFreezeManager from './modules/streakFreezeManager';
import * as xpBoostManager from './modules/xpBoostManager';
import * as achievementManager from './modules/achievementManager';
import { calculateStreak } from './modules/progressTracker';
import * as dateUtils from './modules/utils/dateUtils';
import * as cacheUtils from './modules/utils/cacheUtils';

// Track recent challenges to avoid repetition
let recentChallenges: Record<string, string[]> = { daily: [], weekly: [] };

const trackUsedChallenge = (challengeId: string, category: string) => {
  recentChallenges[category] = recentChallenges[category] || [];
  recentChallenges[category].push(challengeId);
  const maxHistory = category === 'daily' ? 3 : 2;
  if (recentChallenges[category].length > maxHistory) {
    recentChallenges[category] = recentChallenges[category].slice(-maxHistory);
  }
};

const isFirstRoutineOfDay = (routine: ProgressEntry, allRoutines: ProgressEntry[]): boolean => {
  const routineDate = new Date(routine.date);
  const routineDateString = dateUtils.toDateString(routineDate);
  
  const routinesOnSameDay = allRoutines.filter((r) => {
    return dateUtils.toDateString(new Date(r.date)) === routineDateString;
  });
  
  routinesOnSameDay.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return routinesOnSameDay.length > 0 && routinesOnSameDay[0].date === routine.date;
};

const isFirstEverRoutine = async (routine: ProgressEntry, allRoutines: ProgressEntry[]): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  if (userProgress.hasReceivedWelcomeBonus) {
    return false;
  }
  
  userProgress.hasReceivedWelcomeBonus = true;
  await storageService.saveUserProgress(userProgress);
  
  let isFirst = false;
  
  if (allRoutines.length <= 1) {
    isFirst = true;
  } else {
    const routineDateString = dateUtils.toDateString(new Date(routine.date));
    const routinesOnOtherDays = allRoutines.filter((r) => {
      const dateStr = dateUtils.toDateString(new Date(r.date));
      return dateStr !== routineDateString;
    });
    
    isFirst = routinesOnOtherDays.length === 0;
  }
  
  return isFirst;
};

// Helper to check if routines have been done for time-specific challenges
const checkTimeSpecificRoutines = (
  allRoutines: ProgressEntry[],
  timeRange: { start: number; end: number } = { start: 0, end: 24 },
  dayOffset: number = 0
): number => {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const targetDateString = dateUtils.toDateString(targetDate);
  
  const matchingRoutines = allRoutines.filter(routine => {
    const routineDate = new Date(routine.date);
    const routineDateString = dateUtils.toDateString(routineDate);
    const routineHour = routineDate.getHours();
    
    return routineDateString === targetDateString && 
           routineHour >= timeRange.start && 
           routineHour < timeRange.end;
  });
  
  return matchingRoutines.length;
};

/**
 * Factory for creating new challenges with consistent defaults
 */
const ChallengeFactory = {
  createFromTemplate(
    template: any, 
    category: string,
    options: { 
      uniqueIdSuffix?: string;
      forceStartDate?: Date;
    } = {}
  ): Challenge {
    const now = new Date();
    const uniqueId = `${template.id}_${dateUtils.today()}_${options.uniqueIdSuffix || Math.floor(Math.random() * 10000)}`;
    
    return {
      ...template,
      id: uniqueId,
      startDate: options.forceStartDate?.toISOString() || now.toISOString(),
      endDate: dateUtils.getEndDateForCategory(category),
      progress: 0,
      completed: false,
      claimed: false,
      category,
      status: CHALLENGE_STATUS.ACTIVE,
      lastUpdated: now.toISOString()
    };
  },
  
  createBatch(
    challengePool: any[],
    category: string,
    count: number,
    recentIds: string[] = []
  ): Challenge[] {
    let eligibleChallenges = challengePool.filter(c => !recentIds.includes(c.id));
    
    if (eligibleChallenges.length < count) {
      console.log(`Resetting ${category} challenge history due to insufficient unused challenges`);
      eligibleChallenges = challengePool;
    }
    
    const shuffled = [...eligibleChallenges].sort(() => 0.5 - Math.random());
    const selectedTemplates = shuffled.slice(0, count);
    
    return selectedTemplates.map(template => 
      ChallengeFactory.createFromTemplate(template, category)
    );
  }
};

// Core functions
export const initializeUserProgress = async (): Promise<UserProgress> => {
  const currentProgress = await storageService.getUserProgress();
  const resetProgress = { ...INITIAL_USER_PROGRESS, rewards: currentProgress.rewards };
  
  achievementManager.initializeAchievements(resetProgress);
  
  await storageService.saveUserProgress(resetProgress);
  return resetProgress;
};

export const processCompletedRoutine = async (routine: ProgressEntry): Promise<{ userProgress: UserProgress; xpBreakdown: any }> => {
  let userProgress = await storageService.getUserProgress();
  userProgress = normalizeUserProgress(userProgress);
  await storageService.saveRoutineProgress(routine);
  
  cacheUtils.invalidateRoutineCache();
  const allRoutines = await cacheUtils.getCachedRoutines();

  updateUserStatistics(userProgress, routine, allRoutines);
  
  const { xp: routineXp, breakdown } = await calculateXpRewards(routine, allRoutines, userProgress);
  userProgress.totalXP += routineXp;
  
  handleStreakChanges(userProgress, allRoutines);
  await updateUserChallenges(userProgress);
  achievementManager.updateAchievements(userProgress);

  const { level: newLevel } = calculateLevel(userProgress.totalXP);
  if (newLevel !== userProgress.level) {
    userProgress.level = newLevel;
    await rewardManager.updateRewards(userProgress);
    
    if (userProgress.rewards['streak_freezes']?.unlocked) {
      await streakFreezeManager.checkAndGrantWeeklyStreakFreeze();
    }
  }

      await storageService.saveUserProgress(userProgress);
  return { userProgress, xpBreakdown: breakdown };
};

// Helper function to update user statistics
const updateUserStatistics = (userProgress: UserProgress, routine: ProgressEntry, allRoutines: ProgressEntry[]): void => {
  userProgress.statistics.totalRoutines += 1;
  userProgress.statistics.currentStreak = calculateStreak(allRoutines);
  
  // Add area if it's new
  if (!userProgress.statistics.uniqueAreas.includes(routine.area)) {
    userProgress.statistics.uniqueAreas.push(routine.area);
  }
  
  // Update minutes and area counts - ensure totalMinutes is initialized if undefined
  userProgress.statistics.totalMinutes = (userProgress.statistics.totalMinutes || 0) + parseInt(routine.duration, 10);
  userProgress.statistics.routinesByArea[routine.area] =
    (userProgress.statistics.routinesByArea[routine.area] || 0) + 1;
};

// Helper function to calculate XP rewards
const calculateXpRewards = async (
  routine: ProgressEntry, 
  allRoutines: ProgressEntry[],
  userProgress: UserProgress
): Promise<{ xp: number; breakdown: any }> => {
  const isFirstOfDay = isFirstRoutineOfDay(routine, allRoutines);
  const isFirstEver = !userProgress.hasReceivedWelcomeBonus ? 
    await isFirstEverRoutine(routine, allRoutines) : false;
  
  // Calculate XP with breakdown
  const result = await calculateRoutineXp(routine, isFirstOfDay, isFirstEver);
  
  // Ensure welcome bonus flag is set
  userProgress.hasReceivedWelcomeBonus = true;
  
  return result;
};

// Helper function to handle streak changes
const handleStreakChanges = async (userProgress: UserProgress, allRoutines: ProgressEntry[]): Promise<void> => {
  const oldStreak = userProgress.statistics.currentStreak;
  userProgress.statistics.currentStreak = calculateStreak(allRoutines);
  
  // Check if streak was broken
  if (userProgress.statistics.currentStreak === 0 && oldStreak > 0) {
    // Reset incomplete streak achievements using achievementManager
    achievementManager.resetStreakAchievements(userProgress);
    
    // Try to use a streak freeze if available
    const streakFreezeData = await streakFreezeManager.getStreakFreezeData();
    if (streakFreezeData.available > 0) {
      const freezeResult = await streakFreezeManager.useStreakFreeze(oldStreak);
      if (freezeResult.success) {
        userProgress.statistics.currentStreak = oldStreak;
      }
    }
  }
};

/**
 * Efficiently batch process challenge updates to avoid redundant status checks
 */
const batchUpdateChallenges = async (
  userProgress: UserProgress, 
  forceStatusUpdate: boolean = false
): Promise<number> => {
  let updatedCount = 0;
  const allRoutines = await cacheUtils.getCachedRoutines();

  // Process all challenges in a single pass
  for (const id of Object.keys(userProgress.challenges)) {
    const challenge = userProgress.challenges[id];
    
    // Skip already claimed or expired challenges
    if (challenge.claimed || challenge.status === CHALLENGE_STATUS.EXPIRED) {
      continue;
    }
    
    try {
      // Only update progress for incomplete challenges
      if (!challenge.completed) {
        const beforeProgress = challenge.progress;
        const updatedChallenge = await updateChallengeProgress(userProgress, challenge);
        
        // Only count as updated if progress actually changed
        if (beforeProgress !== updatedChallenge.progress || 
            challenge.completed !== updatedChallenge.completed) {
          updatedCount++;
        }
        
        // Update the challenge in place
        userProgress.challenges[id] = updatedChallenge;
      }
      
      // Only update status if requested or if challenge was updated
      if (forceStatusUpdate || updatedCount > 0) {
        userProgress.challenges[id] = updateChallengeStatus(userProgress.challenges[id]);
      }
    } catch (error) {
      console.error(`Error updating challenge ${id}:`, error);
    }
  }
  
  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} challenges during batch update`);
  }
  
  return updatedCount;
};

// Update references to use the new batch function
const updateUserChallenges = async (userProgress: UserProgress): Promise<void> => {
  // First refresh all challenges
  await refreshChallenges(userProgress);

  // Then batch update all challenge progress and statuses
  await batchUpdateChallenges(userProgress, true);
};

/**
 * Get the appropriate end date for a challenge based on its category - optimized
 */
const getEndDateForCategory = (category: string): string => {
  const now = new Date();
  const result = new Date(now);
  
  // Default end time for all cases
  result.setHours(23, 59, 59, 999);
  
  switch(category) {
    case 'daily':
      // End at midnight tonight (no change needed)
      break;
      
    case 'weekly':
      // End at the end of the current week (Sunday)
      const daysToSunday = 7 - result.getDay();
      result.setDate(result.getDate() + (daysToSunday === 0 ? 7 : daysToSunday));
      break;
      
    case 'monthly':
      // End at the end of the current month
      result.setMonth(result.getMonth() + 1, 0);
      break;
      
    case 'special':
      // Special challenges last for 2 weeks by default
      result.setDate(result.getDate() + 14);
      break;
      
    default:
      // Default to 24 hours for unknown categories
      result.setDate(result.getDate() + 1);
  }
  
  return result.toISOString();
};

/**
 * Expire challenges that have passed their end date
 * @param userProgress The user progress object to update
 * @returns The number of challenges that were expired
 */
const expireChallenges = async (userProgress: UserProgress): Promise<number> => {
  const now = new Date();
  let expiredCount = 0;
  
  // Process all challenges to check for expired ones
  Object.values(userProgress.challenges).forEach(challenge => {
    // Skip already expired challenges
    if (challenge.status === CHALLENGE_STATUS.EXPIRED) {
      return;
    }
    
    const endDate = new Date(challenge.endDate);
    
    // Completed challenges with claim period expired
    if (challenge.completed && !challenge.claimed) {
      const completedDate = challenge.dateCompleted ? new Date(challenge.dateCompleted) : now;
      const redemptionMs = REDEMPTION_PERIODS[challenge.category as keyof typeof REDEMPTION_PERIODS] * 60 * 60 * 1000;
      
      if (now.getTime() - completedDate.getTime() > redemptionMs) {
        console.log(`Challenge expired (claim period): ${challenge.title}`);
        challenge.status = CHALLENGE_STATUS.EXPIRED;
        expiredCount++;
      }
    }
    // Challenges past end date - only expire challenges that haven't been completed
    else if (!challenge.completed && endDate < now) {
      console.log(`Challenge expired (end date): ${challenge.title}`);
      challenge.status = CHALLENGE_STATUS.EXPIRED;
      expiredCount++;
    }
  });
  
  if (expiredCount > 0) {
    console.log(`Expired ${expiredCount} challenges`);
    await storageService.saveUserProgress(userProgress);
  }
  
  return expiredCount;
};

/**
 * Update challenge statuses based on their current state - optimized
 */
const updateChallengeStatus = (challenge: Challenge): Challenge => {
  // Skip challenges that already have a final status
  if (challenge.status === CHALLENGE_STATUS.CLAIMED || 
      challenge.status === CHALLENGE_STATUS.EXPIRED) {
    return challenge;
  }
  
  const now = new Date();
  
  // Update status based on completion and claim state
  if (challenge.completed) {
    if (challenge.claimed) {
      challenge.status = CHALLENGE_STATUS.CLAIMED;
    } else {
      challenge.status = CHALLENGE_STATUS.COMPLETED;
      
      // Check if challenge is about to expire
      if (challenge.dateCompleted) {
        const completedDate = new Date(challenge.dateCompleted);
        const redemptionMs = REDEMPTION_PERIODS[challenge.category as keyof typeof REDEMPTION_PERIODS] * 60 * 60 * 1000;
        const expiryTime = completedDate.getTime() + redemptionMs;
        
        // Add exact expiry date for UI display
        challenge.expiryDate = new Date(expiryTime).toISOString();
        
        // Set warning flag if less than 25% of redemption time remains
        const timeUntilExpiry = expiryTime - now.getTime();
        challenge.expiryWarning = timeUntilExpiry < (redemptionMs * 0.25);
      }
    }
  } else {
    challenge.status = CHALLENGE_STATUS.ACTIVE;
    
    // Check if challenge is about to expire
    const endDate = new Date(challenge.endDate);
    const timeUntilEnd = endDate.getTime() - now.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Set warning flag if less than 1 day remains for daily challenges
    // or less than 2 days for others
    const warningThreshold = challenge.category === 'daily' ? dayInMs : dayInMs * 2;
    challenge.expiryWarning = timeUntilEnd < warningThreshold;
  }
  
  return challenge;
};

// Update challenges based on user progress data - enhanced to handle special cases
const updateChallengeProgress = async (userProgress: UserProgress, challenge: Challenge): Promise<Challenge> => {
  // Skip already completed or claimed challenges
  if (challenge.completed || 
      challenge.claimed || 
      challenge.status === CHALLENGE_STATUS.EXPIRED) {
    return challenge;
  }
  
  const stats = userProgress.statistics;
  const allRoutines = await cacheUtils.getCachedRoutines(); // Use cached routines
  
  // Log for debugging
  console.log(`Updating challenge: ${challenge.title} (${challenge.type}), current progress: ${challenge.progress}/${challenge.requirement}`);
  
  // Handle challenge based on its type and specific ID
  try {
    // Update progress based on challenge type - with special case handling
    switch (challenge.type) {
      case 'routine_count':
        // Handle special named challenges with specific conditions
        if (challenge.id.includes('morning_flexibility')) {
          // Morning routines (before noon)
          challenge.progress = checkTimeSpecificRoutines(allRoutines, { start: 0, end: 12 });
          console.log(`Morning flexibility challenge: ${challenge.progress}/${challenge.requirement} routines completed before noon`);
        } 
        else if (challenge.id.includes('evening_routine')) {
          // Evening routines (after 6pm)
          challenge.progress = checkTimeSpecificRoutines(allRoutines, { start: 18, end: 24 });
          console.log(`Evening routine challenge: ${challenge.progress}/${challenge.requirement} routines completed after 6pm`);
        }
        else if (challenge.id.includes('night_owl')) {
          // Night owl routines (after 9pm)
          challenge.progress = checkTimeSpecificRoutines(allRoutines, { start: 21, end: 24 });
        }
        else if (challenge.id.includes('afternoon_') || challenge.id.includes('lunch_')) {
          // Afternoon routines (12pm-6pm)
          challenge.progress = checkTimeSpecificRoutines(allRoutines, { start: 12, end: 18 });
        }
        else {
          // Default routine count challenge
          challenge.progress = stats.totalRoutines || 0;
        }
        break;
        
      case 'daily_minutes':
        // Basic total minutes challenge
        challenge.progress = stats.totalMinutes || 0;
        
        // For challenges that check mins today only
        if (challenge.id.includes('today_') || challenge.id.includes('daily_mins')) {
          // Get routines from today and sum their durations
          const todayRoutines = allRoutines.filter(routine => dateUtils.isToday(routine.date));
          
          const todayMinutes = todayRoutines.reduce((sum, routine) => {
            return sum + parseInt(routine.duration, 10);
          }, 0);
          
          challenge.progress = todayMinutes;
          console.log(`Today's minutes challenge: ${challenge.progress}/${challenge.requirement} minutes today`);
        }
        
        // Handle stretch master challenge (specifically check for "stretch_master" in the ID)
        if (challenge.id.includes('stretch_master')) {
          // Force update to ensure it matches user stats exactly
          challenge.progress = stats.totalMinutes || 0;
          console.log(`Stretch Master challenge progress updated: ${challenge.progress}/${challenge.requirement} minutes`);
        }
        break;
        
      case 'streak':
        challenge.progress = stats.currentStreak || 0;
        break;
        
      case 'weekly_consistency':
        // Count unique days in the current week with routines
        try {
          // Get the start of the current week (Sunday)
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
          weekStart.setHours(0, 0, 0, 0);
          
          // Get unique dates this week with routines
          const uniqueDaysThisWeek = new Set();
          allRoutines.forEach(routine => {
            const routineDate = new Date(routine.date);
            // Check if routine is from this week
            if (routineDate >= weekStart && routineDate <= new Date()) {
              const dayString = routineDate.toISOString().split('T')[0];
              uniqueDaysThisWeek.add(dayString);
            }
          });
          
          challenge.progress = uniqueDaysThisWeek.size;
          console.log(`Weekly consistency challenge progress: ${challenge.progress}/${challenge.requirement} days`);
        } catch (error) {
          console.error('Error calculating weekly consistency:', error);
          // Fall back to current streak as a proxy if calculation fails
          challenge.progress = Math.min(7, stats.currentStreak || 0);
        }
        break;
        
      case 'area_variety':
        challenge.progress = stats.uniqueAreas?.length || 0;
        break;
        
      case 'specific_area':
        // Check for routines targeting a specific area
        const specificArea = challenge.requirementData?.area;
        if (specificArea && stats.routinesByArea) {
          challenge.progress = stats.routinesByArea[specificArea] || 0;
          console.log(`Specific area challenge '${specificArea}': ${challenge.progress}/${challenge.requirement} routines`);
        } else {
          // Without a specific area defined, use highest area count as default
          if (stats.routinesByArea && Object.keys(stats.routinesByArea).length > 0) {
            challenge.progress = Math.max(...Object.values(stats.routinesByArea));
          }
        }
        break;
    }
  } catch (error) {
    console.error(`Error updating challenge ${challenge.id}:`, error);
  }
  
  // Check if challenge is now completed
  if (challenge.progress >= challenge.requirement && !challenge.completed) {
    challenge.completed = true;
    challenge.dateCompleted = new Date().toISOString();
    challenge.status = CHALLENGE_STATUS.COMPLETED;
    console.log(`Challenge completed: ${challenge.title} (${challenge.progress}/${challenge.requirement})`);
  }
  
  return challenge;
};

/**
 * Ensure we have the right number of active challenges for each category - optimized
 * Respects cycle periods and will not add new challenges until the current cycle ends
 */
const ensureChallengeCount = async (
  userProgress: UserProgress,
  challengeData: Record<string, any[]>
): Promise<number> => {
  const now = new Date();
  const today = dateUtils.today();
  let addedCount = 0;
  
  // Get the last check date to determine if cycles have ended
  const lastCheck = userProgress.lastDailyChallengeCheck || '1970-01-01';
  const lastCheckDate = lastCheck.split('T')[0];
  
  // Determine which categories are eligible for new challenges based on cycle resets
  const cycleEnded = {
    daily: today !== lastCheckDate, // Daily cycle ends at midnight
    weekly: dateUtils.shouldResetWeekly(lastCheck), // Weekly cycle ends on Sunday
    monthly: dateUtils.shouldResetMonthly(lastCheck), // Monthly cycle ends at month boundary
    special: false // Special challenges don't auto-reset (they're manually managed)
  };
  
  // Process each challenge category
  for (const category of Object.keys(CHALLENGE_LIMITS)) {
    // Skip if no challenge data exists for this category
    if (!challengeData[category] || !challengeData[category].length) {
      console.log(`No challenge data available for ${category} category`);
      continue;
    }
    
    // Determine if we should add challenges for this category based on cycle reset
    const hasCycleEnded = cycleEnded[category as keyof typeof cycleEnded] || false;
    
    // Count both active and completed-but-not-claimed challenges in this category
    const activeCount = Object.values(userProgress.challenges).filter(c => 
      c.category === category && 
      c.status !== CHALLENGE_STATUS.EXPIRED &&
      c.status !== CHALLENGE_STATUS.CLAIMED &&
      !c.completed
    ).length;
    
    const completedCount = Object.values(userProgress.challenges).filter(c => 
      c.category === category && 
      c.status !== CHALLENGE_STATUS.EXPIRED &&
      c.status !== CHALLENGE_STATUS.CLAIMED &&
      c.completed
    ).length;
    
    // Get total count of ongoing challenges (active + completed but not claimed)
    const totalOngoingCount = activeCount + completedCount;
    
    // Calculate how many new challenges we need, accounting for both active and completed
    const targetCount = CHALLENGE_LIMITS[category as keyof typeof CHALLENGE_LIMITS];
    const neededCount = Math.max(0, targetCount - totalOngoingCount);
    
    // Get category-specific message
    const cycleInfo = category === 'daily' ? 'today' : 
                      category === 'weekly' ? 'this week' :
                      category === 'monthly' ? 'this month' : 'for this period';
    
    if (neededCount <= 0) {
      console.log(`No new ${category} challenges needed (${activeCount} active + ${completedCount} completed = ${totalOngoingCount}/${targetCount} ${cycleInfo})`);
      continue;
    }
    
    // Critical: Only add new challenges if the current cycle has ended OR there are zero challenges
    // Zero challenges is a special case to handle first-time setup or app initialization
    if (!hasCycleEnded && totalOngoingCount > 0) {
      console.log(`Skipping adding new ${category} challenges - current cycle hasn't ended yet`);
      continue;
    }
    
    console.log(`Adding ${neededCount} new ${category} challenges (${totalOngoingCount}/${targetCount} ${cycleInfo})`);
    
    // Get recently used challenge IDs to avoid repetition
    const recentIds = recentChallenges[category] || [];
    
    // Create new challenges with the factory
    const newChallenges = ChallengeFactory.createBatch(
      challengeData[category],
      category,
      neededCount,
      recentIds
    );
    
    // Add new challenges to user progress
    newChallenges.forEach(challenge => {
      userProgress.challenges[challenge.id] = challenge;
      
      // Track challenge as used to avoid repetition
      trackUsedChallenge(challenge.id.split('_')[0], category);
      addedCount++;
    });
  }
  
  // Save changes if any challenges were added
  if (addedCount > 0) {
    console.log(`Added ${addedCount} new challenges in total`);
    await storageService.saveUserProgress(userProgress);
  }
  
  return addedCount;
};

/**
 * Get IDs of challenges to reset based on their category
 */
const getChallengeIdsToReset = (
  userProgress: UserProgress, 
  category: string, 
  onlyIncompleteAndUnclaimed: boolean = true
): string[] => {
  return Object.keys(userProgress.challenges).filter(id => {
    const challenge = userProgress.challenges[id];
    const matchesCategory = challenge.category === category;
    const isIncompleteOrUnclaimed = !challenge.completed || !challenge.claimed;
    
    // Filter based on category and optionally completion status
    return matchesCategory && (onlyIncompleteAndUnclaimed ? isIncompleteOrUnclaimed : true);
  });
};

// Cache for routine data to avoid redundant storage calls
let routineCache: {
  data: ProgressEntry[] | null;
  timestamp: number;
  ttl: number;
} = {
  data: null,
  timestamp: 0,
  ttl: 60 * 1000 // 1 minute TTL by default
};

/**
 * Get all routines with caching to reduce redundant database calls
 */
const getCachedRoutines = async (forceRefresh: boolean = false): Promise<ProgressEntry[]> => {
  const now = Date.now();
  
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && 
      routineCache.data && 
      routineCache.timestamp > 0 && 
      now - routineCache.timestamp < routineCache.ttl) {
    console.log('Using cached routines data');
    return routineCache.data;
  }
  
  // Refresh cache
  console.log('Fetching fresh routines data from storage');
  const allRoutines = await storageService.getAllRoutines() || [];
  
  // Update cache
  routineCache = {
    data: allRoutines,
    timestamp: now,
    ttl: 60 * 1000 // 1 minute TTL
  };
  
  return allRoutines;
};

/**
 * Invalidate routine cache when new data is added
 */
const invalidateRoutineCache = (): void => {
  routineCache.timestamp = 0;
  routineCache.data = null;
};

// Memoization cache for level calculations
const levelCache: Record<number, {
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number;
}> = {};

const calculateLevel = (xp: number) => {
  // Check if result is already in cache
  if (levelCache[xp]) {
    return levelCache[xp];
  }
  
  const levelData = LEVELS.findLast((lvl) => xp >= lvl.xpRequired) || LEVELS[0];
  const level = levelData.level;
  const xpForCurrentLevel = levelData.xpRequired;
  const nextLevelData = LEVELS.find((lvl) => lvl.level === level + 1);
  const xpForNextLevel = nextLevelData ? nextLevelData.xpRequired : Infinity;
  const progress = nextLevelData ? (xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel) : 1;
  
  // Store result in cache
  const result = { level, xpForCurrentLevel, xpForNextLevel, progress };
  levelCache[xp] = result;
  
  return result;
};

/**
 * Get user level information
 */
export const getUserLevelInfo = async () => {
  const userProgress = await storageService.getUserProgress();
  const { level, xpForCurrentLevel, xpForNextLevel, progress } = calculateLevel(userProgress.totalXP);
  
  return {
    level,
    totalXP: userProgress.totalXP,
    xpToNextLevel: xpForNextLevel === Infinity ? null : xpForNextLevel - xpForCurrentLevel,
    percentToNextLevel: Math.round(progress * 100)
  };
};

/**
 * Get a complete summary of the gamification state
 */
export const getGamificationSummary = async () => {
  const userProgress = await storageService.getUserProgress();
  const { level, xpForCurrentLevel, xpForNextLevel, progress } = calculateLevel(userProgress.totalXP);
  
  const challenges = {
    active: {
      daily: [] as Challenge[],
      weekly: [] as Challenge[],
      monthly: [] as Challenge[],
      special: [] as Challenge[]
    },
    completed: {
      daily: [] as Challenge[],
      weekly: [] as Challenge[],
      monthly: [] as Challenge[],
      special: [] as Challenge[]
    },
    claimable: [] as Challenge[]
  };
  
  Object.values(userProgress.challenges).forEach(challenge => {
    const category = challenge.category as 'daily' | 'weekly' | 'monthly' | 'special';
    
    if (challenge.completed && !challenge.claimed) {
      challenges.claimable.push(challenge);
    }
    
    if (challenge.completed) {
      challenges.completed[category].push(challenge);
    } else {
      challenges.active[category].push(challenge);
    }
  });
  
  const achievements = achievementManager.getAchievementsSummary(userProgress);
  
  return {
    user: {
      level,
      totalXP: userProgress.totalXP,
      xpToNextLevel: xpForNextLevel === Infinity ? null : xpForNextLevel - xpForCurrentLevel,
      percentToNextLevel: Math.round(progress * 100)
    },
    statistics: userProgress.statistics,
    challenges,
    achievements,
    rewards: Object.values(userProgress.rewards)
  };
};

/**
 * Recalculate all statistics based on stored routines
 * Used to fix inconsistencies or update statistics after changes
 */
export const recalculateStatistics = async (): Promise<UserProgress> => {
  console.log('Recalculating all statistics from stored routines');
  let userProgress = await storageService.getUserProgress();
  userProgress = normalizeUserProgress(userProgress);
  const allRoutines = await getCachedRoutines();
  
  // Reset statistics to zero values
  userProgress.statistics = {
    totalRoutines: 0,
    currentStreak: 0,
    bestStreak: 0,
    uniqueAreas: [],
    totalMinutes: 0,
    routinesByArea: {},
    lastUpdated: new Date().toISOString()
  };
  
  // Rebuild statistics from all routines
  if (allRoutines.length > 0) {
    // Count total routines
    userProgress.statistics.totalRoutines = allRoutines.length;
    
    // Calculate streak
    userProgress.statistics.currentStreak = calculateStreak(allRoutines);
    userProgress.statistics.bestStreak = Math.max(
      userProgress.statistics.currentStreak,
      userProgress.statistics.bestStreak || 0
    );
    
    // Build unique areas and area counts
    const uniqueAreas = new Set<string>();
    const routinesByArea: Record<string, number> = {};
    
    // Calculate total minutes
    let totalMinutes = 0;
    
    // Process each routine
    allRoutines.forEach(routine => {
      // Add to unique areas
      uniqueAreas.add(routine.area);
      
      // Add to area counts
      routinesByArea[routine.area] = (routinesByArea[routine.area] || 0) + 1;
      
      // Add to total minutes
      totalMinutes += parseInt(routine.duration, 10) || 0;
    });
    
    // Update statistics with calculated values
    userProgress.statistics.uniqueAreas = Array.from(uniqueAreas);
    userProgress.statistics.routinesByArea = routinesByArea;
    userProgress.statistics.totalMinutes = totalMinutes;
    userProgress.statistics.lastUpdated = new Date().toISOString();
  }
  
  // Save the updated progress
  await storageService.saveUserProgress(userProgress);
  return userProgress;
};

/**
 * Handle streak reset - resets streak-related challenges
 * Used when a user's streak is broken
 */
export const handleStreakReset = async (): Promise<UserProgress> => {
  console.log('Handling streak reset for challenges');
  const userProgress = await storageService.getUserProgress();
  
  // Reset progress on all active streak-related challenges
  let updatedAny = false;
  
  Object.values(userProgress.challenges).forEach(challenge => {
    if (challenge.type === 'streak' && !challenge.completed && !challenge.claimed) {
      // Reset the challenge progress
      const oldProgress = challenge.progress;
      challenge.progress = 0;
      
      console.log(`Reset streak challenge: ${challenge.title} (${oldProgress} → 0)`);
      updatedAny = true;
    }
  });
  
  // Reset progress on incomplete streak achievements
  Object.values(userProgress.achievements).forEach(achievement => {
    if (achievement.type === 'streak' && !achievement.completed) {
      const oldProgress = achievement.progress;
      achievement.progress = 0;
      
      console.log(`Reset streak achievement: ${achievement.title} (${oldProgress} → 0)`);
      updatedAny = true;
    }
  });
  
  // Save changes if any were made
  if (updatedAny) {
    await storageService.saveUserProgress(userProgress);
    console.log('Saved user progress after resetting streak challenges and achievements');
  } else {
    console.log('No streak challenges or achievements needed resetting');
  }
  
  return userProgress;
};

/**
 * Reset streak-related achievements only
 * Used when a streak is broken
 */
export const resetStreakAchievements = async (): Promise<UserProgress> => {
  console.log('Resetting streak-related achievements');
  const userProgress = await storageService.getUserProgress();
  
  // Reset progress on incomplete streak achievements
  let resetAny = false;
  Object.values(userProgress.achievements).forEach(achievement => {
    if (achievement.type === 'streak' && !achievement.completed) {
      const oldProgress = achievement.progress;
      achievement.progress = 0;
      
      console.log(`Reset streak achievement: ${achievement.title} (${oldProgress} → 0)`);
      resetAny = true;
    }
  });
  
  // Save changes if any were made
  if (resetAny) {
    await storageService.saveUserProgress(userProgress);
    console.log('Saved user progress after resetting streak achievements');
  } else {
    console.log('No streak achievements needed resetting');
  }
  
  return userProgress;
};

/**
 * Get all active challenges grouped by category - optimized
 */
export const getActiveChallenges = async (): Promise<Record<string, Challenge[]>> => {
  const userProgress = await storageService.getUserProgress();
  const result: Record<string, Challenge[]> = {
    daily: [],
    weekly: [],
    monthly: [],
    special: []
  };
  
  // Process challenges once with early filtering - only include incomplete challenges
  Object.values(userProgress.challenges)
    .filter(challenge => 
      !challenge.completed && 
      !challenge.claimed && 
      challenge.status !== CHALLENGE_STATUS.EXPIRED)
    .forEach(challenge => {
      // Update status before categorizing
      challenge = updateChallengeStatus(challenge);
      
      // Only include active challenges
      if (challenge.status === CHALLENGE_STATUS.ACTIVE) {
        const category = challenge.category;
        
        // Add to the correct category if it exists
        if (category && result[category] !== undefined) {
          result[category].push(challenge);
        }
      }
    });
  
  // Ensure we don't exceed limits for each category
  Object.keys(result).forEach(category => {
    const limit = CHALLENGE_LIMITS[category as keyof typeof CHALLENGE_LIMITS] || 0;
    if (result[category].length > limit) {
      console.warn(`Too many ${category} challenges (${result[category].length}/${limit}), limiting to ${limit}`);
      result[category] = result[category].slice(0, limit);
    }
  });
  
  // Log summary of what we found
  const counts = Object.entries(result).map(([key, arr]) => `${key}: ${arr.length}`).join(', ');
  console.log(`Found active challenges: ${counts}`);
  
  return result;
};

/**
 * Get all claimable challenges (completed but not claimed) - optimized
 */
export const getClaimableChallenges = async (): Promise<Challenge[]> => {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  
  // Group challenges by category to enforce limits
  const claimableByCategory: Record<string, Challenge[]> = {
    daily: [],
    weekly: [],
    monthly: [],
    special: []
  };
  
  // Filter and process in one pass
  Object.values(userProgress.challenges)
    .filter(challenge => {
      // Must be completed, not claimed, not expired
      if (!challenge.completed || 
          challenge.claimed || 
          challenge.status === CHALLENGE_STATUS.EXPIRED) {
        return false;
      }
      
      // Must be within redemption period
      if (!challenge.dateCompleted) return false;
      
      const completedDate = new Date(challenge.dateCompleted);
      const redemptionMs = REDEMPTION_PERIODS[challenge.category as keyof typeof REDEMPTION_PERIODS] * 60 * 60 * 1000;
      
      return now.getTime() - completedDate.getTime() <= redemptionMs;
    })
    .map(challenge => updateChallengeStatus(challenge))
    .filter(challenge => challenge.status === CHALLENGE_STATUS.COMPLETED)
    .forEach(challenge => {
      const category = challenge.category;
      if (category && claimableByCategory[category]) {
        claimableByCategory[category].push(challenge);
      }
    });
  
  // Enforce category limits for claimable challenges
  Object.keys(claimableByCategory).forEach(category => {
    const limit = CHALLENGE_LIMITS[category as keyof typeof CHALLENGE_LIMITS] || 0;
    
    // Sort by completion date (oldest first) to prioritize challenges about to expire
    claimableByCategory[category].sort((a, b) => {
      const dateA = new Date(a.dateCompleted || '').getTime();
      const dateB = new Date(b.dateCompleted || '').getTime();
      return dateA - dateB;
    });
    
    // Limit to appropriate number for category
    if (claimableByCategory[category].length > limit) {
      console.warn(`Too many claimable ${category} challenges (${claimableByCategory[category].length}/${limit}), limiting to ${limit}`);
      claimableByCategory[category] = claimableByCategory[category].slice(0, limit);
    }
  });
  
  // Merge all categories of claimable challenges
  const claimable = Object.values(claimableByCategory).flat();
  
  console.log(`Found ${claimable.length} claimable challenges after enforcing category limits`);
  return claimable;
};

export const claimChallenge = async (challengeId: string): Promise<{ 
  success: boolean; 
  xpEarned: number;
  message?: string;
  levelUp: boolean;
  newLevel: number;
}> => {
  let userProgress = await storageService.getUserProgress();
  userProgress = normalizeUserProgress(userProgress);
  const challenge = userProgress.challenges[challengeId];
  const now = new Date();
  const oldLevel = userProgress.level;

  if (!challenge || !challenge.completed || challenge.claimed) 
    return { 
      success: false, 
      xpEarned: 0, 
      message: 'Challenge not found or already claimed', 
      levelUp: false, 
      newLevel: oldLevel 
    };

  const completedDate = challenge.dateCompleted ? new Date(challenge.dateCompleted) : now;
  const redemptionMs = REDEMPTION_PERIODS[challenge.category as keyof typeof REDEMPTION_PERIODS] * 60 * 60 * 1000;
  if (now.getTime() - completedDate.getTime() > redemptionMs) 
    return { 
      success: false, 
      xpEarned: 0, 
      message: 'Challenge expired', 
      levelUp: false, 
      newLevel: oldLevel 
    };

  // Daily limits
  if (challenge.category === 'daily') {
    const today = dateUtils.today();
    const dailyClaims = Object.values(userProgress.challenges).filter(
      (c) => c.category === 'daily' && c.claimed && c.dateClaimed?.includes(today)
    ).length;
    const dailyXp = Object.values(userProgress.challenges)
      .filter((c) => c.category === 'daily' && c.claimed && c.dateClaimed?.includes(today))
      .reduce((sum, c) => sum + c.xp, 0);

    if (dailyClaims >= DAILY_LIMITS.MAX_CHALLENGES || dailyXp >= DAILY_LIMITS.MAX_XP) {
      return { 
        success: false, 
        xpEarned: 0, 
        message: 'Daily limit reached', 
        levelUp: false, 
        newLevel: oldLevel 
      };
    }
  }

  challenge.claimed = true;
  challenge.dateClaimed = now.toISOString();
  challenge.status = CHALLENGE_STATUS.CLAIMED;
  userProgress.totalXP += challenge.xp;
  const { level: newLevel } = calculateLevel(userProgress.totalXP);
  const levelUp = newLevel !== oldLevel;
  
  if (levelUp) {
    userProgress.level = newLevel;
    await rewardManager.updateRewards(userProgress);
  }
  
  // Log that a challenge was claimed - important for debugging
  console.log(`Challenge claimed: ${challenge.title} (${challenge.category}), XP earned: ${challenge.xp}`);
  
  // Update the lastDailyChallengeCheck timestamp to prevent immediate refresh
  // This ensures that new challenges aren't added until the next refresh cycle
  userProgress.lastDailyChallengeCheck = now.toISOString();
  
  // Do NOT add new challenges here - they should only be added during cycle reset
  // Just save user progress with the claimed challenge
  await storageService.saveUserProgress(userProgress);
  
  return { 
    success: true, 
    xpEarned: challenge.xp, 
    message: 'Challenge claimed successfully',
    levelUp, 
    newLevel 
  };
};

// Calculate XP rewards for completed routines
const calculateRoutineXp = async (routine: ProgressEntry, isFirstOfDay: boolean, isFirstEver: boolean) => {
  let totalXp = 0;
  const breakdown: Array<{ source: string; amount: number; description: string }> = [];
  const { isActive, data } = await xpBoostManager.checkXpBoostStatus();
  const xpMultiplier = isActive ? data.multiplier : 1;

  if (isFirstOfDay) {
    const duration = parseInt(routine.duration, 10);
    let baseXp = duration <= 5 ? 30 : duration <= 10 ? 60 : 90;
    const originalBaseXp = baseXp;
    baseXp = Math.floor(baseXp * xpMultiplier);
    console.log(`Base XP for ${duration}-minute routine: ${originalBaseXp} -> ${baseXp} (${xpMultiplier}x)`);
    
    breakdown.push({ 
      source: 'routine', 
      amount: baseXp, 
      description: `${duration}-Minute Routine${isActive ? ' (2x XP Boost)' : ''}` 
    });
    totalXp += baseXp;
  } else {
    console.log('Not first routine of day - no base XP awarded');
    breakdown.push({ 
      source: 'routine', 
      amount: 0, 
      description: 'Not the first routine today (XP already earned today)' 
    });
  }

  if (isFirstEver) {
    const welcomeBonus = 50;
    console.log(`First ever routine! Adding welcome bonus: ${welcomeBonus} XP`);
    breakdown.push({ 
      source: 'first_ever', 
      amount: welcomeBonus, 
      description: 'Welcome Bonus: First Ever Stretch!' 
    });
    totalXp += welcomeBonus;
  }

  breakdown.forEach((item, i) => {
    console.log(`  ${i+1}. ${item.source}: ${item.amount} XP - ${item.description}`);
  });

  return { xp: totalXp, breakdown };
};

/**
 * Normalize user progress object to ensure type consistency
 */
const normalizeUserProgress = (progress: UserProgress): UserProgress => {
  // Ensure all required fields exist
  if (!progress.statistics) {
    progress.statistics = INITIAL_USER_PROGRESS.statistics;
  }
  
  // Ensure totalMinutes exists and is a number
  if (progress.statistics.totalMinutes === undefined) {
    progress.statistics.totalMinutes = 0;
  } else {
    progress.statistics.totalMinutes = Number(progress.statistics.totalMinutes);
  }
  
  // Ensure other required fields exist
  progress.statistics.totalRoutines = progress.statistics.totalRoutines || 0;
  progress.statistics.currentStreak = progress.statistics.currentStreak || 0;
  progress.statistics.bestStreak = progress.statistics.bestStreak || 0;
  progress.statistics.uniqueAreas = progress.statistics.uniqueAreas || [];
  progress.statistics.routinesByArea = progress.statistics.routinesByArea || {};
  progress.statistics.lastUpdated = progress.statistics.lastUpdated || new Date().toISOString();
  
  return progress;
};

/**
 * Refresh challenges based on time periods and user progress
 */
export const refreshChallenges = async (userProgress: UserProgress): Promise<void> => {
  const now = new Date();
  const today = dateUtils.today();
  const lastCheck = userProgress.lastDailyChallengeCheck || '1970-01-01';
  const lastCheckDate = lastCheck.split('T')[0];
  
  console.log(`Refreshing challenges - last check: ${lastCheckDate}, today: ${today}`);

  await expireChallenges(userProgress);
  
  const activeCounts = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    special: 0
  };
  
  const completedCounts = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    special: 0
  };
  
  Object.values(userProgress.challenges).forEach(challenge => {
    if (challenge.status !== CHALLENGE_STATUS.EXPIRED && 
        challenge.status !== CHALLENGE_STATUS.CLAIMED) {
          
      const category = challenge.category as keyof typeof activeCounts;
      
      if (challenge.completed) {
        if (completedCounts[category] !== undefined) {
          completedCounts[category]++;
        }
      } else {
        if (activeCounts[category] !== undefined) {
          activeCounts[category]++;
        }
      }
    }
  });
  
  const resetDaily = today !== lastCheckDate;
  const resetWeekly = dateUtils.shouldResetWeekly(lastCheck);
  const resetMonthly = dateUtils.shouldResetMonthly(lastCheck);
  
  if (resetDaily && activeCounts.daily + completedCounts.daily === 0) {
    console.log('New day detected, refreshing daily challenges');
    const dailyIds = getChallengeIdsToReset(userProgress, 'daily', true);
    
    dailyIds.forEach(id => {
      const challenge = userProgress.challenges[id];
      if (!challenge.completed || challenge.claimed) {
        delete userProgress.challenges[id];
      }
    });
    
    console.log(`Removed ${dailyIds.length} old daily challenges`);
    activeCounts.daily = 0;
  }
  
  if (resetWeekly && activeCounts.weekly + completedCounts.weekly === 0) {
    console.log('New week detected, refreshing weekly challenges');
    const weeklyIds = getChallengeIdsToReset(userProgress, 'weekly', true);
    
    weeklyIds.forEach(id => {
      const challenge = userProgress.challenges[id];
      if (!challenge.completed || challenge.claimed) {
        delete userProgress.challenges[id];
      }
    });
    
    console.log(`Removed ${weeklyIds.length} old weekly challenges`);
    activeCounts.weekly = 0;
    recentChallenges.weekly = [];
  }
  
  if (resetMonthly && activeCounts.monthly + completedCounts.monthly === 0) {
    console.log('New month detected, refreshing monthly challenges');
    const monthlyIds = getChallengeIdsToReset(userProgress, 'monthly', true);
    
    monthlyIds.forEach(id => {
      const challenge = userProgress.challenges[id];
      if (!challenge.completed || challenge.claimed) {
        delete userProgress.challenges[id];
      }
    });
    
    console.log(`Removed ${monthlyIds.length} old monthly challenges`);
    activeCounts.monthly = 0;
  }

  await ensureChallengeCount(userProgress, CORE_CHALLENGES);
  
  for (const id of Object.keys(userProgress.challenges)) {
    try {
      const updatedChallenge = await updateChallengeProgress(userProgress, userProgress.challenges[id]);
      userProgress.challenges[id] = updateChallengeStatus(updatedChallenge);
    } catch (error) {
      console.error(`Error updating challenge ${id}:`, error);
    }
  }

  const finalCounts = {
    daily: { active: 0, completed: 0 },
    weekly: { active: 0, completed: 0 },
    monthly: { active: 0, completed: 0 },
    special: { active: 0, completed: 0 }
  };
  
  Object.values(userProgress.challenges).forEach(challenge => {
    if (challenge.status !== CHALLENGE_STATUS.EXPIRED && 
        challenge.status !== CHALLENGE_STATUS.CLAIMED) {
          
      const category = challenge.category as keyof typeof finalCounts;
      if (finalCounts[category]) {
        if (challenge.completed) {
          finalCounts[category].completed++;
        } else {
          finalCounts[category].active++;
        }
      }
    }
  });
  
  console.log('Challenge counts after refresh:', 
    Object.entries(finalCounts).map(([cat, counts]) => 
      `${cat}: ${counts.active} active + ${counts.completed} completed = ${counts.active + counts.completed} total`
    ).join(', ')
  );
  
  userProgress.lastDailyChallengeCheck = now.toISOString();
  await storageService.saveUserProgress(userProgress);
};