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
    streakFreezes: false
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
        streakFreezes: false
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
      const streakFreezesAccess = await rewardManager.isRewardUnlocked('streak_freezes');
      
      console.log('Feature access check results:', {
        darkTheme: darkThemeAccess,
        customReminders: customRemindersAccess,
        xpBoost: xpBoostAccess,
        customRoutines: customRoutinesAccess,
        streakFreezes: streakFreezesAccess
      });
      
      setFeatures({
        darkTheme: darkThemeAccess,
        customReminders: customRemindersAccess,
        xpBoost: xpBoostAccess,
        customRoutines: customRoutinesAccess,
        streakFreezes: streakFreezesAccess
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
  
  // Function to check if a feature is accessible
  const canAccessFeature = useCallback((featureId: string): boolean => {
    if (!isPremium) return false;
    
    switch (featureId) {
      case 'dark_theme':
        return features.darkTheme;
      case 'custom_reminders':
        return features.customReminders;
      case 'xp_boost':
        return features.xpBoost;
      case 'custom_routines':
        return features.customRoutines;
      case 'streak_freezes':
        return features.streakFreezes;
      default:
        return false;
    }
  }, [features, isPremium]);
  
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
      case 'streak_freezes':
        return 6;
      default:
        return 99; // Very high level for unknown features
    }
  }, []);
  
  // Check if user meets level requirement for a feature
  const meetsLevelRequirement = useCallback((featureId: string): boolean => {
    const requiredLevel = getRequiredLevel(featureId);
    return level >= requiredLevel;
  }, [level, getRequiredLevel]);
  
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