import { Reward, UserProgress } from './types';
import * as storageService from '../../services/storageService';

/**
 * Core reward definitions
 */
const CORE_REWARDS = {
  dark_theme: {
    id: 'dark_theme',
    title: 'Dark Theme',
    description: 'Enable a sleek dark mode for comfortable evening stretching',
    icon: 'moon',
    unlocked: false,
    levelRequired: 2,
    type: 'app_feature'
  },
  custom_reminders: {
    id: 'custom_reminders',
    title: 'Custom Reminders',
    description: 'Set personalized reminders with custom messages',
    icon: 'notifications',
    unlocked: false,
    levelRequired: 3,
    type: 'app_feature'
  },
  xp_boost: {
    id: 'xp_boost',
    title: 'XP Boost',
    description: 'Get a 2x boost in XP for your daily streak',
    icon: 'flash',
    unlocked: false,
    levelRequired: 4,
    type: 'app_feature'
  },
  custom_routines: {
    id: 'custom_routines',
    title: 'Custom Routines',
    description: 'Create and save your own personalized stretching routines',
    icon: 'create',
    unlocked: false,
    levelRequired: 5,
    type: 'app_feature'
  },
  streak_freezes: {
    id: 'streak_freezes',
    title: 'Streak Freezes',
    description: 'Miss a day, keep your streak—perfect for busy schedules',
    icon: 'snow',
    unlocked: false,
    levelRequired: 6,
    type: 'app_feature'
  },
  premium_stretches: {
    id: 'premium_stretches',
    title: 'Premium Stretches',
    description: 'Access to 15+ premium stretching exercises',
    icon: 'fitness',
    unlocked: false,
    levelRequired: 7,
    type: 'app_feature'
  },
  desk_break_boost: {
    id: 'desk_break_boost',
    title: 'Desk Break Boost',
    description: 'Stretch in quick 15-sec bursts—3 fast routines!',
    icon: 'desktop',
    unlocked: false,
    levelRequired: 8,
    type: 'app_feature'
  },
  focus_area_mastery: {
    id: 'focus_area_mastery',
    title: 'Focus Area Mastery',
    description: 'Get ultimate focus badges for your favorite areas',
    icon: 'star',
    unlocked: false,
    levelRequired: 9,
    type: 'app_feature'
  }
};

/**
 * Initialize rewards for a new user
 * @returns Initial rewards object
 */
export const initializeRewards = (): Record<string, Reward> => {
  return { ...CORE_REWARDS };
};

/**
 * Get all rewards
 * @returns All rewards
 */
export const getAllRewards = async (): Promise<Reward[]> => {
  const userProgress = await storageService.getUserProgress();
  return Object.values(userProgress.rewards || {});
};

/**
 * Get unlocked rewards
 * @returns Unlocked rewards
 */
export const getUnlockedRewards = async (): Promise<Reward[]> => {
  const userProgress = await storageService.getUserProgress();
  return Object.values(userProgress.rewards || {})
    .filter(reward => reward.unlocked);
};

/**
 * Get locked rewards
 * @returns Locked rewards
 */
export const getLockedRewards = async (): Promise<Reward[]> => {
  const userProgress = await storageService.getUserProgress();
  return Object.values(userProgress.rewards || {})
    .filter(reward => !reward.unlocked);
};

/**
 * Check if a reward is unlocked
 * @param rewardId The ID of the reward to check
 * @returns Whether the reward is unlocked
 */
export const isRewardUnlocked = async (rewardId: string): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  const reward = userProgress.rewards && userProgress.rewards[rewardId];
  return reward ? reward.unlocked : false;
};

/**
 * Update rewards based on user level
 * @param userProgress Current user progress
 * @returns Updated progress with newly unlocked rewards
 */
export const updateRewards = async (
  userProgress: UserProgress
): Promise<{ updatedProgress: UserProgress; newlyUnlocked: Reward[] }> => {
  // Get the user's current level
  const currentLevel = userProgress.level || 1;
  
  // Create a copy of the user's rewards
  let rewards = { ...userProgress.rewards };
  
  // Initialize rewards if needed
  if (!rewards || Object.keys(rewards).length === 0) {
    rewards = initializeRewards();
  }
  
  // Track newly unlocked rewards
  const newlyUnlocked: Reward[] = [];
  
  // Check each reward to see if it should be unlocked
  for (const rewardId in rewards) {
    const reward = rewards[rewardId];
    
    // If reward is already unlocked, skip it
    if (reward.unlocked) continue;
    
    // Check if the user's level is high enough to unlock this reward
    if (currentLevel >= reward.levelRequired) {
      // Unlock the reward
      rewards[rewardId] = {
        ...reward,
        unlocked: true
      };
      
      // Add to newly unlocked list
      newlyUnlocked.push(rewards[rewardId]);
      
      console.log(`Reward unlocked: ${reward.title} (Level ${reward.levelRequired})`);
    }
  }
  
  // Update progress with updated rewards
  const updatedProgress = {
    ...userProgress,
    rewards
  };
  
  // Save updated progress
  if (newlyUnlocked.length > 0) {
    await storageService.saveUserProgress(updatedProgress);
  }
  
  return { updatedProgress, newlyUnlocked };
};

/**
 * Manually unlock a specific reward (for testing/admin purposes)
 * @param rewardId The ID of the reward to unlock
 * @returns Success status and updated progress
 */
export const unlockReward = async (
  rewardId: string
): Promise<{ success: boolean; message: string; progress: UserProgress }> => {
  try {
    const userProgress = await storageService.getUserProgress();
    const rewards = { ...userProgress.rewards };
    
    // Check if reward exists
    if (!rewards[rewardId]) {
      return {
        success: false,
        message: `Reward with ID '${rewardId}' not found`,
        progress: userProgress
      };
    }
    
    // Check if already unlocked
    if (rewards[rewardId].unlocked) {
      return {
        success: false,
        message: `Reward '${rewards[rewardId].title}' is already unlocked`,
        progress: userProgress
      };
    }
    
    // Unlock the reward
    rewards[rewardId] = {
      ...rewards[rewardId],
      unlocked: true
    };
    
    // Update progress
    const updatedProgress = {
      ...userProgress,
      rewards
    };
    
    // Save updated progress
    await storageService.saveUserProgress(updatedProgress);
    
    return {
      success: true,
      message: `Reward '${rewards[rewardId].title}' manually unlocked`,
      progress: updatedProgress
    };
  } catch (error) {
    console.error('Error unlocking reward:', error);
    return {
      success: false,
      message: 'Error unlocking reward',
      progress: await storageService.getUserProgress()
    };
  }
}; 