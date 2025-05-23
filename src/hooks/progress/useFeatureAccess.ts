import { useState, useEffect, useCallback } from 'react';
import { useGamification, gamificationEvents, LEVEL_UP_EVENT, REWARD_UNLOCKED_EVENT } from './useGamification';
import { usePremium } from '../../context/PremiumContext';
import * as rewardManager from '../../utils/progress/modules/rewardManager';
import * as storageService from '../../services/storageService';

// Custom event for premium status change
export const PREMIUM_STATUS_CHANGED = 'premium_status_changed';

/**
 * Hook to check if features are accessible based on user level and premium status
 */
export function useFeatureAccess() {
  const { isPremium } = usePremium();
  const { level, isLoading: isGamificationLoading } = useGamification();
  const [isLoading, setIsLoading] = useState(true);
  
  // Features state
  const [features, setFeatures] = useState({
    darkTheme: false,
    customReminders: false,
    xpBoost: false,
    customRoutines: false,
    flexSaves: false,
    premiumStretches: false,
    deskBreakBoost: false,
    focusAreaMastery: false
  });
  
  // Load feature access status
  const loadFeatureAccess = useCallback(async () => {
    if (!isPremium) {
      // If not premium, no features are accessible
      console.log('User is not premium, setting all features to false');
      setFeatures({
        darkTheme: false,
        customReminders: false,
        xpBoost: false,
        customRoutines: false,
        flexSaves: false,
        premiumStretches: false,
        deskBreakBoost: false,
        focusAreaMastery: false
      });
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('User is premium, checking reward unlocks');
      // Check each feature
      const darkThemeAccess = await rewardManager.isRewardUnlocked('dark_theme');
      const customRemindersAccess = await rewardManager.isRewardUnlocked('custom_reminders');
      const xpBoostAccess = await rewardManager.isRewardUnlocked('xp_boost');
      const customRoutinesAccess = await rewardManager.isRewardUnlocked('custom_routines');
      const flexSavesAccess = await rewardManager.isRewardUnlocked('flex_saves');
      const premiumStretchesAccess = await rewardManager.isRewardUnlocked('premium_stretches');
      const deskBreakBoostAccess = await rewardManager.isRewardUnlocked('desk_break_boost');
      const focusAreaMasteryAccess = await rewardManager.isRewardUnlocked('focus_area_mastery');
      
      console.log('Feature access check results:', {
        darkTheme: darkThemeAccess,
        customReminders: customRemindersAccess,
        xpBoost: xpBoostAccess,
        customRoutines: customRoutinesAccess,
        flexSaves: flexSavesAccess,
        premiumStretches: premiumStretchesAccess,
        deskBreakBoost: deskBreakBoostAccess,
        focusAreaMastery: focusAreaMasteryAccess
      });
      
      setFeatures({
        darkTheme: darkThemeAccess,
        customReminders: customRemindersAccess,
        xpBoost: xpBoostAccess,
        customRoutines: customRoutinesAccess,
        flexSaves: flexSavesAccess,
        premiumStretches: premiumStretchesAccess,
        deskBreakBoost: deskBreakBoostAccess,
        focusAreaMastery: focusAreaMasteryAccess
      });
    } catch (error) {
      console.error('Error loading feature access:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isPremium]);
  
  // Load feature access when premium status or level changes
  useEffect(() => {
    console.log('Premium status or level changed, refreshing feature access', { isPremium, level });
    if (!isGamificationLoading) {
      loadFeatureAccess();
    }
  }, [isPremium, level, isGamificationLoading, loadFeatureAccess]);
  
  // Listen for level-up and reward unlocked events
  useEffect(() => {
    const handleLevelUp = () => {
      console.log('Level-up event received in useFeatureAccess, refreshing access...');
      loadFeatureAccess();
    };
    
    const handleRewardUnlocked = () => {
      console.log('Reward unlocked event received in useFeatureAccess, refreshing access...');
      loadFeatureAccess();
    };
    
    const handlePremiumStatusChanged = () => {
      console.log('Premium status changed event received in useFeatureAccess, refreshing access...');
      loadFeatureAccess();
    };
    
    // Add event listeners
    gamificationEvents.on(LEVEL_UP_EVENT, handleLevelUp);
    gamificationEvents.on(REWARD_UNLOCKED_EVENT, handleRewardUnlocked);
    gamificationEvents.on(PREMIUM_STATUS_CHANGED, handlePremiumStatusChanged);
    
    // Clean up event listeners
    return () => {
      gamificationEvents.off(LEVEL_UP_EVENT, handleLevelUp);
      gamificationEvents.off(REWARD_UNLOCKED_EVENT, handleRewardUnlocked);
      gamificationEvents.off(PREMIUM_STATUS_CHANGED, handlePremiumStatusChanged);
    };
  }, [loadFeatureAccess]);
  
  // Function to get the required level for a feature
  const getRequiredLevel = useCallback((featureId: string): number => {
    switch (featureId) {
      case 'dark_theme':
        return 2;
      case 'custom_reminders':
        return 3;
      case 'xp_boost':
        return 4;
      case 'custom_routines':
        return 5;
      case 'flex_saves':
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
  }, []);
  
  // Check if user meets level requirement for a feature
  const meetsLevelRequirement = useCallback((featureId: string): boolean => {
    const requiredLevel = getRequiredLevel(featureId);
    return level >= requiredLevel;
  }, [level, getRequiredLevel]);
  
  // Function to check if a feature is accessible
  const canAccessFeature = useCallback((featureId: string): boolean => {
    if (!isPremium) return false;
    
    switch (featureId) {
      case 'dark_theme':
        // Dark theme is accessible if:
        // 1. The reward is specifically unlocked in the rewards system
        // 2. OR the user has reached level 2 or higher
        const hasDarkThemeReward = features.darkTheme;
        const hasRequiredLevel = meetsLevelRequirement('dark_theme');
        
        console.log(`Dark theme access check - Has reward: ${hasDarkThemeReward}, Meets level req: ${hasRequiredLevel}`);
        return hasDarkThemeReward || hasRequiredLevel;
        
      case 'custom_reminders':
        return features.customReminders || meetsLevelRequirement('custom_reminders');
        
      case 'xp_boost':
        return features.xpBoost || meetsLevelRequirement('xp_boost');
        
      case 'custom_routines':
        return features.customRoutines || meetsLevelRequirement('custom_routines');
        
      case 'flex_saves':
        return features.flexSaves || meetsLevelRequirement('flex_saves');
        
      case 'premium_stretches':
        return features.premiumStretches || meetsLevelRequirement('premium_stretches');
        
      case 'desk_break_boost':
        return features.deskBreakBoost || meetsLevelRequirement('desk_break_boost');
        
      case 'focus_area_mastery':
        return features.focusAreaMastery || meetsLevelRequirement('focus_area_mastery');
        
      default:
        return false;
    }
  }, [features, isPremium, meetsLevelRequirement]);
  
  /**
   * Get the current user's level
   * @returns Promise<number> - The user's current level
   */
  const getUserLevel = async (): Promise<number> => {
    try {
      // Get the user progress from storage service
      const userProgress = await storageService.getUserProgress();
      
      // Return the level from user progress
      return userProgress?.level || 1;
    } catch (error) {
      console.error('Error getting user level:', error);
      return 1; // Default to level 1 on error
    }
  };
  
  return {
    isLoading,
    canAccessFeature,
    meetsLevelRequirement,
    getRequiredLevel,
    features,
    refreshAccess: loadFeatureAccess,
    getUserLevel
  };
} 