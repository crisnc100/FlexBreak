import { ProgressEntry, UserProgress, Challenge, Reward, Achievement } from './types';
import * as storageService from '../../services/storageService';
import * as xpManager from './xpManager';
import * as achievementManager from './achievementManager';
import * as challengeManager from './challengeManager';
import * as rewardManager from './rewardManager';

/**
 * Main interface for the gamification system
 * Handles coordination between different aspects of the gamification system
 */

/**
 * Initialize a new user's gamification data
 * @returns Initialized user progress
 */
export const initializeUserProgress = async (): Promise<UserProgress> => {
  // Create initial user progress structure
  const initialProgress: UserProgress = {
    totalXP: 0,
    level: 1,
    achievements: achievementManager.initializeAchievements(),
    challenges: {},
    rewards: rewardManager.initializeRewards(),
    statistics: {
      totalRoutines: 0,
      currentStreak: 0,
      bestStreak: 0,
      uniqueAreas: [],
      routinesByArea: {},
      lastUpdated: new Date().toISOString(),
      totalMinutes: 0
    },
    lastUpdated: new Date().toISOString(),
    xpHistory: []
  };
  
  // Generate initial challenges
  const withChallenges = await challengeManager.generateChallenges('all');
  
  // Save and return
  await storageService.saveUserProgress(withChallenges);
  return withChallenges;
};

/**
 * Process a completed routine through the gamification system
 * @param routine The completed routine
 * @returns Process results including XP earned, achievements, challenges
 */
export const processCompletedRoutine = async (
  routine: ProgressEntry
): Promise<{
  xpEarned: number;
  levelUp: boolean;
  newLevel: number;
  unlockedAchievements: Achievement[];
  completedChallenges: Challenge[];
  newlyUnlockedRewards: Reward[];
}> => {
  console.log('Processing completed routine in gamification system:', routine);
  
  try {
    // Check if this is the first routine of the day (only first earns XP)
    const { xpEarned, updatedProgress: afterXP } = await xpManager.processRoutineForXP(routine);
    
    // Get all routines to calculate streak
    const allRoutines = await storageService.getAllRoutines();
    
    // Calculate streak from all routines including the newly added one
    const { calculateStreak } = require('../progressUtils');
    const calculatedStreak = calculateStreak(allRoutines);
    
    // Update the streak in statistics to reflect actual calculated value
    if (calculatedStreak > 0) {
      console.log(`Updating streak from ${afterXP.statistics.currentStreak} to calculated ${calculatedStreak}`);
      afterXP.statistics.currentStreak = calculatedStreak;
      
      // Update best streak if needed
      if (calculatedStreak > afterXP.statistics.bestStreak) {
        afterXP.statistics.bestStreak = calculatedStreak;
      }
    }
    
    // Make sure total routines count is accurate
    afterXP.statistics.totalRoutines = allRoutines.length;
    
    // Save the progress with updated statistics
    await storageService.saveUserProgress(afterXP);
    
    // Now update achievements with the properly updated statistics
    const achievementResult = await achievementManager.updateAchievements(afterXP);
    
    // Create array of routines to update challenges with
    const routinesForChallenges = [routine];
    
    // Update challenges (single routine)
    const challengeResult = await challengeManager.handleExpiredChallenges();
    
    // Get updated challenges after handling expirations
    const updatedProgress = challengeResult;
    
    // Check and update rewards based on level
    const rewardResult = await rewardManager.updateRewards(updatedProgress);
    
    // Determine if level up occurred
    const levelUp = afterXP.level > (await storageService.getUserProgress()).level;
    
    // Get newly completed challenges (those that are completed but not claimed)
    const completedChallenges = await challengeManager.getClaimableChallenges();
    
    // Return combined results
    return {
      xpEarned,
      levelUp,
      newLevel: updatedProgress.level,
      unlockedAchievements: achievementResult.unlockedAchievements,
      completedChallenges,
      newlyUnlockedRewards: rewardResult.newlyUnlocked
    };
  } catch (error) {
    console.error('Error processing routine in gamification system:', error);
    
    // Return empty results in case of error
    return {
      xpEarned: 0,
      levelUp: false,
      newLevel: 1,
      unlockedAchievements: [],
      completedChallenges: [],
      newlyUnlockedRewards: []
    };
  }
};

/**
 * Get a comprehensive gamification summary for the user
 * @returns Summary of all gamification aspects
 */
export const getGamificationSummary = async (): Promise<{
  level: number;
  totalXP: number;
  xpToNextLevel: number;
  achievements: {
    completed: Achievement[];
    inProgress: Achievement[];
    total: number;
  };
  challenges: {
    active: Challenge[];
    claimable: Challenge[];
    expired: Challenge[];
  };
  rewards: {
    unlocked: Reward[];
    nextUnlock: Reward | null;
  };
  statistics: {
    routinesCompleted: number;
    currentStreak: number;
    bestStreak: number;
    totalMinutes: number;
    favoriteArea: string | null;
  };
}> => {
  // Get user progress
  const userProgress = await storageService.getUserProgress();
  
  // Get XP thresholds
  const currentLevel = userProgress.level || 1;
  let xpForNextLevel = 0;
  
  // Import LEVELS from xpManager
  const { LEVELS } = require('./xpManager');
  
  // Calculate XP required for next level
  if (currentLevel < LEVELS.length) {
    // Use the next level's XP threshold from the LEVELS array
    xpForNextLevel = LEVELS[currentLevel].xpRequired - userProgress.totalXP;
  } else {
    // For levels beyond defined LEVELS, use a formula based on the last defined level
    const lastDefinedLevel = LEVELS[LEVELS.length - 1];
    const nextLevelXP = lastDefinedLevel.xpRequired + 1000; // Add 1000 XP for each level beyond defined
    xpForNextLevel = nextLevelXP - userProgress.totalXP;
  }
  
  // Get achievements
  const achievements = await achievementManager.getAllAchievements();
  const completedAchievements = achievements.filter(a => a.completed);
  const inProgressAchievements = achievements.filter(a => !a.completed && a.progress > 0);
  
  // Get challenges
  const activeCategories = await challengeManager.getActiveChallenges();
  const activeChallenges = [
    ...activeCategories.daily,
    ...activeCategories.weekly,
    ...activeCategories.monthly,
    ...activeCategories.special
  ];
  const claimableChallenges = await challengeManager.getClaimableChallenges();
  const expiredClaimableChallenges = await challengeManager.getExpiredClaimableChallenges();
  
  // Get rewards
  const unlockedRewards = await rewardManager.getUnlockedRewards();
  const lockedRewards = await rewardManager.getLockedRewards();
  
  // Find next reward to unlock
  let nextUnlock: Reward | null = null;
  if (lockedRewards.length > 0) {
    // Sort by level required (ascending)
    const sortedLocked = [...lockedRewards].sort((a, b) => a.levelRequired - b.levelRequired);
    nextUnlock = sortedLocked[0];
  }
  
  // Get favorite area
  let favoriteArea: string | null = null;
  const { routinesByArea } = userProgress.statistics;
  let maxCount = 0;
  
  for (const [area, count] of Object.entries(routinesByArea)) {
    if (count > maxCount) {
      maxCount = count;
      favoriteArea = area;
    }
  }
  
  // Build and return summary
  return {
    level: currentLevel,
    totalXP: userProgress.totalXP,
    xpToNextLevel: xpForNextLevel,
    achievements: {
      completed: completedAchievements,
      inProgress: inProgressAchievements,
      total: achievements.length
    },
    challenges: {
      active: activeChallenges,
      claimable: claimableChallenges,
      expired: expiredClaimableChallenges
    },
    rewards: {
      unlocked: unlockedRewards,
      nextUnlock
    },
    statistics: {
      routinesCompleted: userProgress.statistics.totalRoutines,
      currentStreak: userProgress.statistics.currentStreak,
      bestStreak: userProgress.statistics.bestStreak,
      totalMinutes: (userProgress.statistics as any).totalMinutes || 0,
      favoriteArea
    }
  };
};

/**
 * Claim a completed challenge to earn XP
 * @param challengeId ID of the challenge to claim
 * @returns Claim result
 */
export const claimChallenge = async (
  challengeId: string
): Promise<{
  success: boolean;
  message: string;
  xpEarned: number;
  levelUp: boolean;
  newLevel: number;
}> => {
  try {
    // Get current user level
    const userProgressBefore = await storageService.getUserProgress();
    const levelBefore = userProgressBefore.level;
    
    // Claim the challenge
    const result = await challengeManager.claimChallenge(challengeId);
    
    // Check for level up
    const levelUp = result.progress.level > levelBefore;
    
    return {
      success: result.success,
      message: result.message,
      xpEarned: result.xpEarned,
      levelUp,
      newLevel: result.progress.level
    };
  } catch (error) {
    console.error('Error claiming challenge:', error);
    return {
      success: false,
      message: 'Error claiming challenge',
      xpEarned: 0,
      levelUp: false,
      newLevel: 1
    };
  }
};

/**
 * Gets a user's current level and XP
 * @returns Level info
 */
export const getUserLevelInfo = async (): Promise<{
  level: number;
  totalXP: number;
  xpForCurrentLevel: number;
  xpToNextLevel: number;
  percentToNextLevel: number;
}> => {
  const userProgress = await storageService.getUserProgress();
  const currentLevel = userProgress.level || 1;
  const totalXP = userProgress.totalXP || 0;
  
  // Import LEVELS from xpManager
  const { LEVELS } = require('../progress/xpManager');
  
  // Function to get XP required for a specific level
  const xpForLevel = (level: number): number => {
    if (level <= LEVELS.length) {
      return LEVELS[level - 1].xpRequired;
    }
    // If level is beyond defined levels, use a formula (optional)
    return LEVELS[LEVELS.length - 1].xpRequired + 
           (level - LEVELS.length) * 1000; // Add 1000 XP per level beyond max defined
  };
  
  const xpForNextLevel = xpForLevel(currentLevel + 1);
  const xpForCurrentLevel = xpForLevel(currentLevel);
  const xpToNextLevel = xpForNextLevel - totalXP;
  
  // Calculate percentage progress to next level
  const levelRange = xpForNextLevel - xpForCurrentLevel;
  const xpIntoLevel = totalXP - xpForCurrentLevel;
  const percentToNextLevel = Math.min(100, Math.round((xpIntoLevel / levelRange) * 100));
  
  return {
    level: currentLevel,
    totalXP,
    xpForCurrentLevel,
    xpToNextLevel,
    percentToNextLevel
  };
}; 