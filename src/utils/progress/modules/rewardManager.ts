import { Reward, UserProgress } from '../types';
import * as storageService from '../../../services/storageService';
import * as xpBoostManager from './xpBoostManager';
import CORE_REWARDS from '../../../data/rewards.json';

/**
 * Core reward definitions
 */


/**
 * Initialize rewards for a new user
 * @returns Initial rewards object
 */
export const initializeRewards = (): Record<string, Reward> => {
  // Convert array to object with id as keys
  return Object.fromEntries(
    CORE_REWARDS.map(reward => [reward.id, reward])
  );
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
  console.log('Starting reward update process...');

  // Get the user's current level
  const currentLevel = userProgress.level || 1;
  console.log(`Current level: ${currentLevel}`);

  // Create a copy of the user's rewards or initialize if needed
  let rewards = userProgress.rewards && Object.keys(userProgress.rewards).length > 0
    ? { ...userProgress.rewards }
    : initializeRewards();

  // Track newly unlocked rewards
  const newlyUnlocked: Reward[] = [];

  // Check each reward to see if it should be unlocked
  for (const rewardId in CORE_REWARDS) {
    // Ensure the reward exists in the user's rewards
    if (!rewards[rewardId]) {
      rewards[rewardId] = { ...CORE_REWARDS[rewardId] };
    }

    const reward = rewards[rewardId];

    // If reward is already unlocked, skip it
    if (reward.unlocked) {
      console.log(`Reward ${reward.title} is already unlocked`);
      continue;
    }

    // Check if the user's level is high enough to unlock this reward
    if (currentLevel >= reward.levelRequired) {
      console.log(`Unlocking reward ${reward.title} for level ${currentLevel} (required: ${reward.levelRequired})`);

      // Unlock the reward
      rewards[rewardId] = {
        ...reward,
        unlocked: true
      };

      // Special case: Grant XP boost stacks when unlocking the xp_boost reward
      if (rewardId === 'xp_boost') {
        console.log('Unlocked XP Boost reward - adding 2 XP boost stacks (72 hours each)');
        await xpBoostManager.addXpBoosts(2);
      }

      // Add to newly unlocked list
      newlyUnlocked.push(rewards[rewardId]);

      console.log(`Reward unlocked: ${reward.title} (Level ${reward.levelRequired})`);
    } else {
      console.log(`Reward ${reward.title} not unlocked - requires level ${reward.levelRequired}`);
    }
  }

  // Update progress with updated rewards
  const updatedProgress = {
    ...userProgress,
    rewards
  };

  // Always save the progress to ensure rewards are properly initialized
  await storageService.saveUserProgress(updatedProgress);

  console.log(`Reward update complete. Unlocked ${newlyUnlocked.length} new rewards.`);
  if (newlyUnlocked.length > 0) {
    console.log('Newly unlocked rewards:', newlyUnlocked.map(r => r.title).join(', '));
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