import { LEVELS } from '../constants';
import { UserProgress } from '../types';
import * as storageService from '../../../services/storageService';
import * as rewardManager from './rewardManager';
import * as streakFreezeManager from './streakFreezeManager';

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
export const calculateLevel = (xp: number) => {
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
 * Add XP to user progress and handle level ups
 */
export const addXp = async (userProgress: UserProgress, amount: number, source: string = 'generic'): Promise<{
  newXp: number,
  oldLevel: number,
  newLevel: number,
  levelUp: boolean
}> => {
  const oldXp = userProgress.totalXP;
  const oldLevel = userProgress.level;
  
  // Add XP
  userProgress.totalXP += amount;
  
  // Calculate new level
  const { level: newLevel } = calculateLevel(userProgress.totalXP);
  const levelUp = newLevel !== oldLevel;
  
  if (levelUp) {
    console.log(`Level up! ${oldLevel} -> ${newLevel} (${oldXp} -> ${userProgress.totalXP} XP)`);
    userProgress.level = newLevel;
    
    // Update rewards for new level
    await rewardManager.updateRewards(userProgress);
    
    // Check for streak freeze eligibility at certain levels
    if (userProgress.rewards['streak_freezes']?.unlocked) {
      await streakFreezeManager.refillMonthlyStreakFreezes();
    }
  }
  
  // Save the updated progress
  await storageService.saveUserProgress(userProgress);
  
  return {
    newXp: userProgress.totalXP,
    oldLevel,
    newLevel,
    levelUp
  };
};

/**
 * Calculate XP rewards for completed routines
 */
export const calculateRoutineXp = async (
  routine: any,
  isFirstOfDay: boolean,
  isFirstEver: boolean, 
  xpBoostInfo?: { isActive: boolean, multiplier: number }
) => {
  let totalXp = 0;
  const breakdown: Array<{ source: string; amount: number; description: string }> = [];
  
  // Use provided XP boost info or default to no boost
  const xpMultiplier = xpBoostInfo?.isActive ? xpBoostInfo.multiplier : 1;

  if (isFirstOfDay) {
    const duration = parseInt(routine.duration, 10);
    let baseXp = duration <= 5 ? 30 : duration <= 10 ? 60 : 90;
    const originalBaseXp = baseXp;
    baseXp = Math.floor(baseXp * xpMultiplier);
    console.log(`Base XP for ${duration}-minute routine: ${originalBaseXp} -> ${baseXp} (${xpMultiplier}x)`);
    
    breakdown.push({ 
      source: 'routine', 
      amount: baseXp, 
      description: `${duration}-Minute Routine${xpBoostInfo?.isActive ? ' (2x XP Boost)' : ''}` 
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