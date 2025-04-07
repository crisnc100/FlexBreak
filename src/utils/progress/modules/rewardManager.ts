import { Reward, UserProgress } from '../types';
import * as storageService from '../../../services/storageService';
import * as xpBoostManager from './xpBoostManager';
import CORE_REWARDS from '../../../data/rewards.json';
import { getRandomPremiumStretches } from '../../routineGenerator';
import { Stretch } from '../../../types';

// Extend the Reward interface to include additional properties for management
interface ExtendedReward extends Reward {
  uses?: number;
  lastRefill?: string | null;
  initialUses?: number;
  unlockLevel?: number;
}

/**
 * Initialize the core rewards structure for a new user
 * @returns Initialized rewards object
 */
export const initializeRewards = (coreRewards = CORE_REWARDS): Record<string, Reward> => {
  // Convert array to object with id as keys
  return Object.fromEntries(
    coreRewards.map(reward => [reward.id, { ...reward, unlocked: false }])
  );
};

/**
 * Get all rewards
 * @returns All rewards
 */
export const getAllRewards = async (): Promise<Reward[]> => {
  const userProgress = await storageService.getUserProgress();
  
  // If no rewards in user progress, initialize from core rewards
  if (!userProgress.rewards || Object.keys(userProgress.rewards).length === 0) {
    return CORE_REWARDS.map(reward => ({
      ...reward,
      unlocked: userProgress.level >= reward.levelRequired
    }));
  }
  
  // Create a map of all rewards from user progress
  const rewardsMap = { ...userProgress.rewards };
  
  // Check for and remove any 'streak_freeze' (singular) entries - this fixes the duplicate streak freeze issue
  if (rewardsMap['streak_freeze']) {
    console.log('Found duplicate streak_freeze entry, removing it in favor of streak_freezes (plural)');
    delete rewardsMap['streak_freeze'];
  }
  
  // Ensure all core rewards are included by checking against CORE_REWARDS
  CORE_REWARDS.forEach(coreReward => {
    if (!rewardsMap[coreReward.id]) {
      // Add missing reward
      rewardsMap[coreReward.id] = {
        ...coreReward,
        unlocked: userProgress.level >= coreReward.levelRequired
      };
    }
  });
  
  // Convert rewards map to array
  const allRewards = Object.values(rewardsMap);
  
  // Deduplicate any rewards with the same ID to prevent multiple cards
  const uniqueRewards: Reward[] = [];
  const rewardIds = new Set<string>();
  
  allRewards.forEach(reward => {
    if (!rewardIds.has(reward.id)) {
      rewardIds.add(reward.id);
      uniqueRewards.push(reward);
    }
  });
  
  // Sort rewards by level required
  return uniqueRewards.sort((a, b) => a.levelRequired - b.levelRequired);
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
 * Check if rewards should be unlocked based on user level and other conditions
 */
export const updateRewards = async (userProgress: UserProgress) => {
  const updatedProgress = { ...userProgress };
  let changed = false;
  
  // Initialize rewards if they don't exist
  if (!updatedProgress.rewards) {
    updatedProgress.rewards = {};
    changed = true;
  }
  
  // Special handling for dark theme - ensure it's always unlocked at level 2 or above
  if (updatedProgress.level >= 2) {
    if (!updatedProgress.rewards['dark_theme']) {
      // If dark theme reward doesn't exist yet, create it
      const darkThemeReward = CORE_REWARDS.find(r => r.id === 'dark_theme');
      if (darkThemeReward) {
        updatedProgress.rewards['dark_theme'] = {
          ...darkThemeReward,
          unlocked: true
        };
        console.log(`Auto-unlocking dark theme reward at level ${updatedProgress.level}`);
        changed = true;
      }
    } else if (!updatedProgress.rewards['dark_theme'].unlocked) {
      // If it exists but isn't unlocked, unlock it
      updatedProgress.rewards['dark_theme'].unlocked = true;
      console.log(`Unlocking existing dark theme reward at level ${updatedProgress.level}`);
      changed = true;
    }
  }
  
  // Check each reward to see if it should be unlocked
  CORE_REWARDS.forEach((rewardInfo: any) => {
    // Skip if reward ID is 'dark_theme' since we already handled it specially
    if (rewardInfo.id === 'dark_theme') {
      return;
    }
    
    // Skip already unlocked rewards
    if (updatedProgress.rewards[rewardInfo.id]?.unlocked) {
      return;
    }
    
    // Check if level requirement is met
    const levelRequirement = rewardInfo.levelRequired || 0;
    
    if (updatedProgress.level >= levelRequirement) {
      console.log(`Unlocking reward ${rewardInfo.id} at level ${updatedProgress.level}`);
      
      // Initialize reward if needed
      if (!updatedProgress.rewards[rewardInfo.id]) {
        updatedProgress.rewards[rewardInfo.id] = {
          id: rewardInfo.id,
          title: rewardInfo.title,
          description: rewardInfo.description,
          icon: rewardInfo.icon,
          unlocked: false,
          levelRequired: levelRequirement,
          type: rewardInfo.type
        };
      }
      
      // Unlock the reward
      updatedProgress.rewards[rewardInfo.id].unlocked = true;
      
      // Add extended properties
      const extendedReward = updatedProgress.rewards[rewardInfo.id] as ExtendedReward;
      
      // Grant initial uses if specified
      if (rewardInfo.initialUses && rewardInfo.initialUses > 0) {
        extendedReward.uses = rewardInfo.initialUses;
        extendedReward.lastRefill = new Date().toISOString();
      }
      
      changed = true;
    }
  });
  
  // Save changes if needed
  if (changed) {
    await storageService.saveUserProgress(updatedProgress);
    console.log('Saved updated user rewards');
  }
  
  return updatedProgress;
};

/**
 * Get all rewards available to the user
 */
export const getAvailableRewards = async () => {
  const userProgress = await storageService.getUserProgress();
  
  if (!userProgress.rewards) {
    return [];
  }
  
  const availableRewards = Object.entries(userProgress.rewards)
    .filter(([_, rewardData]) => rewardData.unlocked)
    .map(([rewardId, rewardData]) => {
      const extendedReward = rewardData as ExtendedReward;
      const rewardInfo = CORE_REWARDS[rewardId] as ExtendedReward;
      
      return {
        id: rewardId,
        name: rewardData.title,
        description: rewardData.description,
        iconName: rewardData.icon,
        uses: extendedReward.uses || 0,
        unlocked: rewardData.unlocked,
        lastRefill: extendedReward.lastRefill || null
      };
    });
  
  return availableRewards;
};

/**
 * Use a reward if available
 */
export const useReward = async (rewardId: string): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if reward exists and is unlocked
  if (!userProgress.rewards || !userProgress.rewards[rewardId]?.unlocked) {
    console.log(`Reward ${rewardId} is not available`);
    return false;
  }
  
  // Cast to extended reward type
  const extendedReward = userProgress.rewards[rewardId] as ExtendedReward;
  
  // Check if reward has uses left
  if (!extendedReward.uses || extendedReward.uses <= 0) {
    console.log(`No uses left for reward ${rewardId}`);
    return false;
  }
  
  // Consume one use
  extendedReward.uses -= 1;
  console.log(`Used reward ${rewardId}, ${extendedReward.uses} uses remaining`);
  
  // Save updated progress
  await storageService.saveUserProgress(userProgress);
  
  return true;
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

/**
 * Clean up duplicate rewards in storage
 * This function removes any duplicated streak freeze rewards that might 
 * exist from the old 'streak_freeze' ID to ensure only the proper 'streak_freezes' ID is used
 * @returns Whether changes were made
 */
export const cleanupDuplicateRewards = async (): Promise<boolean> => {
  try {
    const userProgress = await storageService.getUserProgress();
    
    if (!userProgress.rewards) {
      console.log('No rewards to clean up');
      return false;
    }
    
    let changesMade = false;
    
    // Check for the singular streak_freeze entry (old/incorrect ID)
    if (userProgress.rewards['streak_freeze']) {
      console.log('Found duplicate streak_freeze entry during cleanup');
      
      // Make sure the proper streak_freezes (plural) exists
      if (!userProgress.rewards['streak_freezes']) {
        console.log('Creating proper streak_freezes entry from the duplicate');
        
        // Copy data from the old entry to the new one
        const oldEntry = userProgress.rewards['streak_freeze'];
        userProgress.rewards['streak_freezes'] = {
          ...oldEntry,
          id: 'streak_freezes',
          title: 'Streak Freezes',
          description: 'Miss a day, keep your streak—perfect for busy schedules',
          icon: 'snow',
          unlocked: oldEntry.unlocked,
          levelRequired: 6,
          type: 'app_feature'
        };
        
        // Copy any extended properties like uses, lastRefill, etc.
        if ((oldEntry as any).uses !== undefined) {
          (userProgress.rewards['streak_freezes'] as any).uses = (oldEntry as any).uses;
        }
        
        if ((oldEntry as any).lastUsed) {
          (userProgress.rewards['streak_freezes'] as any).lastUsed = (oldEntry as any).lastUsed;
        }
        
        if ((oldEntry as any).lastRefill) {
          (userProgress.rewards['streak_freezes'] as any).lastRefill = (oldEntry as any).lastRefill;
        }
      } else {
        console.log('Both streak_freeze and streak_freezes exist, merging data');
        
        // Both entries exist, make sure uses and last used date are preserved
        const oldEntry = userProgress.rewards['streak_freeze'] as any;
        const newEntry = userProgress.rewards['streak_freezes'] as any;
        
        // Always use the most recent lastUsed date
        if (oldEntry.lastUsed && (!newEntry.lastUsed || new Date(oldEntry.lastUsed) > new Date(newEntry.lastUsed))) {
          newEntry.lastUsed = oldEntry.lastUsed;
        }
        
        // For uses, take the minimum of the two to prevent abuse
        // (user shouldn't get more freezes from a bug)
        if (oldEntry.uses !== undefined && newEntry.uses !== undefined) {
          newEntry.uses = Math.min(oldEntry.uses, newEntry.uses);
        }
      }
      
      // Delete the old entry
      delete userProgress.rewards['streak_freeze'];
      console.log('Removed duplicate streak_freeze entry');
      changesMade = true;
    }
    
    if (changesMade) {
      await storageService.saveUserProgress(userProgress);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error cleaning up duplicate rewards:', error);
    return false;
  }
};

/**
 * Get a sample of premium stretches to preview
 * This can be used to let users try premium stretches before unlocking
 * @param count Number of premium stretches to get
 * @returns Array of premium stretches
 */
export const getSamplePremiumStretches = async (count: number = 5): Promise<Stretch[]> => {
  try {
    // Check if premium stretches are already unlocked
    const isPremiumUnlocked = await isRewardUnlocked('premium_stretches');
    
    if (isPremiumUnlocked) {
      console.log('Premium stretches already unlocked, returning full set of premium stretches');
      // If premium is already unlocked, let them see all premium stretches
      return getRandomPremiumStretches(count);
    }
    
    // Get a sample of premium stretches to preview
    console.log(`Getting ${count} premium stretches to preview`);
    return getRandomPremiumStretches(count);
  } catch (error) {
    console.error('Error getting sample premium stretches:', error);
    return [];
  }
}; 