import { UserProgress } from '../types';
import * as storageService from '../../../services/storageService';
import * as dateUtils from './utils/dateUtils';

const STREAK_FREEZE_REWARD_ID = 'streak_freezes';
const WEEKLY_STREAK_FREEZE_AMOUNT = 1;

/**
 * Check if a streak freeze is available and can be used
 */
export const isStreakFreezeAvailable = async (): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if reward exists and is unlocked
  if (
    !userProgress.rewards || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID] || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID].unlocked
  ) {
    return false;
  }
  
  // Check if user has streak freezes available
  const freezes = (userProgress.rewards[STREAK_FREEZE_REWARD_ID] as any).uses || 0;
  return freezes > 0;
};

/**
 * Use a streak freeze to prevent streak loss
 */
export const useStreakFreeze = async (): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if reward exists and is unlocked
  if (
    !userProgress.rewards || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID] || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID].unlocked
  ) {
    console.log('Streak freeze reward not available');
    return false;
  }
  
  const freezeReward = userProgress.rewards[STREAK_FREEZE_REWARD_ID] as any;
  
  // Check if user has streak freezes available
  if (!freezeReward.uses || freezeReward.uses <= 0) {
    console.log('No streak freezes available');
    return false;
  }
  
  // Consume one streak freeze
  freezeReward.uses -= 1;
  console.log(`Used streak freeze. ${freezeReward.uses} remaining.`);
  
  // Mark the last updated to today to maintain streak
  userProgress.statistics.lastUpdated = new Date().toISOString();
  
  // Save updated progress
  await storageService.saveUserProgress(userProgress);
  
  return true;
};

/**
 * Grant a streak freeze to the user
 */
export const grantStreakFreeze = async (amount: number = 1): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if reward exists and is unlocked
  if (
    !userProgress.rewards || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID] || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID].unlocked
  ) {
    console.log('Streak freeze reward not available');
    return false;
  }
  
  const freezeReward = userProgress.rewards[STREAK_FREEZE_REWARD_ID] as any;
  
  // Add streak freezes
  freezeReward.uses = (freezeReward.uses || 0) + amount;
  freezeReward.lastRefill = new Date().toISOString();
  
  console.log(`Granted ${amount} streak freeze(s). Now has ${freezeReward.uses} total.`);
  
  // Save updated progress
  await storageService.saveUserProgress(userProgress);
  
  return true;
};

/**
 * Check and grant weekly streak freeze if eligible
 */
export const checkAndGrantWeeklyStreakFreeze = async (): Promise<void> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if reward exists and is unlocked
  if (
    !userProgress.rewards || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID] || 
    !userProgress.rewards[STREAK_FREEZE_REWARD_ID].unlocked
  ) {
    return;
  }
  
  const freezeReward = userProgress.rewards[STREAK_FREEZE_REWARD_ID] as any;
  
  // Check if it's been a week since last refill
  const lastRefill = freezeReward.lastRefill ? new Date(freezeReward.lastRefill) : null;
  
  if (!lastRefill || dateUtils.daysBetween(lastRefill, new Date()) >= 7) {
    await grantStreakFreeze(WEEKLY_STREAK_FREEZE_AMOUNT);
  }
}; 