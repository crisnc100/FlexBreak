import * as storageService from '../services/storageService';
import * as rewardManager from './progress/modules/rewardManager';

/**
 * Static utility for checking feature access outside of React components
 * This provides the same functionality as the useFeatureAccess hook
 * but can be used in non-React contexts
 */

/**
 * Get the required level for a feature
 * Mirrors the function in useFeatureAccess hook
 */
export const getRequiredLevel = (featureId: string): number => {
  switch (featureId) {
    case 'dark_theme':
      return 2;
    case 'custom_reminders':
      return 3;
    case 'xp_boost':
      return 4;
    case 'custom_routines':
      return 5;
    case 'streak_freezes':
      return 6;
    case 'premium_stretches':
      return 7;
    case 'desk_break_boost':
      return 8;
    case 'focus_area_mastery':
      return 9;
    default:
      return 99; // Very high level for unknown features
  }
};

/**
 * Check if user meets level requirement for a feature
 * @param featureId Feature identifier
 * @returns Promise resolving to boolean
 */
export const meetsLevelRequirement = async (featureId: string): Promise<boolean> => {
  const requiredLevel = getRequiredLevel(featureId);
  const userProgress = await storageService.getUserProgress();
  const userLevel = userProgress.level || 0;
  
  return userLevel >= requiredLevel;
};

/**
 * Check if a feature is accessible based on premium status, level, and unlock status
 * @param featureId Feature identifier
 * @returns Promise resolving to boolean
 */
export const canAccessFeature = async (featureId: string): Promise<boolean> => {
  // Check premium status first
  const isPremium = await storageService.getIsPremium();
  if (!isPremium) return false;
  
  // Check if reward is unlocked
  const isUnlocked = await rewardManager.isRewardUnlocked(featureId);
  
  // Check level requirement
  const hasRequiredLevel = await meetsLevelRequirement(featureId);
  
  // Feature is accessible if it's unlocked OR the user meets the level requirement
  return isUnlocked || hasRequiredLevel;
}; 