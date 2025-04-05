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
import * as challengeManager from './modules/challengeManager';
import { calculateStreak } from './modules/progressTracker';
import * as dateUtils from './modules/utils/dateUtils';
import * as cacheUtils from './modules/utils/cacheUtils';

// Track recent challenges to avoid repetition
let recentChallenges: Record<string, string[]> = { daily: [], weekly: [] };


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

// Memoization cache for level calculations
const levelCache: Record<number, {
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number;
}> = {};

/**
 * Calculate user level based on XP with caching for performance
 */
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

// Core functions
export const initializeUserProgress = async (): Promise<UserProgress> => {
  const currentProgress = await storageService.getUserProgress();
  const resetProgress = { ...INITIAL_USER_PROGRESS, rewards: currentProgress.rewards };
  
  achievementManager.initializeAchievements(resetProgress);
  
  await storageService.saveUserProgress(resetProgress);
  return resetProgress;
};

export const processCompletedRoutine = async (routine: ProgressEntry): Promise<{ 
  userProgress: UserProgress; 
  xpBreakdown: any;
  completedChallenges: Challenge[];
}> => {
  let userProgress = await storageService.getUserProgress();
  userProgress = normalizeUserProgress(userProgress);
  await storageService.saveRoutineProgress(routine);
  
  cacheUtils.invalidateRoutineCache();
  const allRoutines = await cacheUtils.getCachedRoutines();
  
  updateUserStatistics(userProgress, routine, allRoutines);
  
  const { xp: routineXp, breakdown } = await calculateXpRewards(routine, allRoutines, userProgress);
  userProgress.totalXP += routineXp;
  
  handleStreakChanges(userProgress, allRoutines);
  
  // Update challenges and capture newly completed ones
  const completedChallenges = await challengeManager.updateUserChallenges(userProgress);
  console.log(`Found ${completedChallenges.length} newly completed challenges`);

  // Update achievements
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
  return { userProgress, xpBreakdown: breakdown, completedChallenges };
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
    const isAvailable = await streakFreezeManager.isStreakFreezeAvailable();
    if (isAvailable) {
      const success = await streakFreezeManager.useStreakFreeze();
      if (success) {
        userProgress.statistics.currentStreak = oldStreak;
      }
    }
  }
};

/**
 * Get user level information
 */
export const getUserLevelInfo = async () => {
  const userProgress = await storageService.getUserProgress();
  const { level, xpForCurrentLevel, xpForNextLevel, progress } = calculateLevel(userProgress.totalXP);
  
  // Calculate the actual XP needed to reach next level (the difference between user's current XP and next level requirement)
  const xpNeededToNextLevel = xpForNextLevel - userProgress.totalXP;
  
  return {
    level,
    totalXP: userProgress.totalXP,
    xpToNextLevel: xpForNextLevel === Infinity ? null : xpNeededToNextLevel,
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
  
  // Calculate the actual XP needed to reach next level
  const xpNeededToNextLevel = xpForNextLevel - userProgress.totalXP;
  
  return {
    user: {
      level,
      totalXP: userProgress.totalXP,
      xpToNextLevel: xpForNextLevel === Infinity ? null : xpNeededToNextLevel,
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
  const allRoutines = await cacheUtils.getCachedRoutines();
  
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
  achievementManager.resetStreakAchievements(userProgress);
      updatedAny = true;
  
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
  
  // Use the achievementManager to reset streak achievements
  achievementManager.resetStreakAchievements(userProgress);
  
  // Save user progress
    await storageService.saveUserProgress(userProgress);
    console.log('Saved user progress after resetting streak achievements');
  
  return userProgress;
};

/**
 * Get all active challenges grouped by category
 */
export const getActiveChallenges = async (): Promise<Record<string, Challenge[]>> => {
  return challengeManager.getActiveChallenges();
};

/**
 * Get all claimable challenges (completed but not claimed)
 */
export const getClaimableChallenges = async (): Promise<Challenge[]> => {
  return challengeManager.getClaimableChallenges();
};

export const claimChallenge = async (challengeId: string): Promise<{ 
  success: boolean; 
  xpEarned: number;
  message?: string;
  levelUp: boolean;
  newLevel: number;
}> => {
  return challengeManager.claimChallenge(challengeId);
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
export const normalizeUserProgress = (progress: UserProgress): UserProgress => {
  const normalizedProgress = { ...progress };
  
  // Ensure all required fields exist
  if (!normalizedProgress.statistics) {
    normalizedProgress.statistics = INITIAL_USER_PROGRESS.statistics;
  }
  
  // Ensure totalMinutes exists and is a number
  if (normalizedProgress.statistics.totalMinutes === undefined) {
    normalizedProgress.statistics.totalMinutes = 0;
  } else {
    normalizedProgress.statistics.totalMinutes = Number(normalizedProgress.statistics.totalMinutes);
  }
  
  // Ensure other required fields exist
  normalizedProgress.statistics.totalRoutines = normalizedProgress.statistics.totalRoutines || 0;
  normalizedProgress.statistics.currentStreak = normalizedProgress.statistics.currentStreak || 0;
  normalizedProgress.statistics.bestStreak = normalizedProgress.statistics.bestStreak || 0;
  normalizedProgress.statistics.uniqueAreas = normalizedProgress.statistics.uniqueAreas || [];
  normalizedProgress.statistics.routinesByArea = normalizedProgress.statistics.routinesByArea || {};
  normalizedProgress.statistics.lastUpdated = normalizedProgress.statistics.lastUpdated || new Date().toISOString();
  
  // Ensure other required top-level properties exist
  normalizedProgress.totalXP = normalizedProgress.totalXP || 0;
  normalizedProgress.level = normalizedProgress.level || 1;
  normalizedProgress.achievements = normalizedProgress.achievements || {};
  normalizedProgress.challenges = normalizedProgress.challenges || {};
  normalizedProgress.rewards = normalizedProgress.rewards || {};
  normalizedProgress.lastUpdated = normalizedProgress.lastUpdated || new Date().toISOString();
  
  return normalizedProgress;
};

// Export refreshChallenges for compatibility
export const refreshChallenges = challengeManager.refreshChallenges;