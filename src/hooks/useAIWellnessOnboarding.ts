import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../services/storageService';

/**
 * Hook to determine when to show AI Wellness onboarding
 * Shows after 3-7 days of app usage, or after completing first routine
 */
export const useAIWellnessOnboarding = () => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingEligibility();
  }, []);

  const checkOnboardingEligibility = async () => {
    try {
      // Check if AI wellness is already enabled
      const aiEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED) === 'true';
      if (aiEnabled) {
        setIsLoading(false);
        return;
      }

      // Check if user has seen or dismissed onboarding
      const hasSeenOnboarding = await AsyncStorage.getItem('@ai_wellness_onboarding_seen') === 'true';
      const hasDismissedOnboarding = await AsyncStorage.getItem('@ai_wellness_onboarding_dismissed') === 'true';
      
      if (hasSeenOnboarding || hasDismissedOnboarding) {
        setIsLoading(false);
        return;
      }

      // FOR TESTING: Show immediately after splash screen
      const showImmediately = true; // Change to false for production
      
      if (showImmediately) {
        // Add small delay to ensure splash screen completes
        setTimeout(() => {
          setShouldShowOnboarding(true);
        }, 500);
        setIsLoading(false);
        return;
      }

      // PRODUCTION LOGIC: Show after 3-7 days
      const firstLaunchDate = await AsyncStorage.getItem('@first_launch_date');
      if (!firstLaunchDate) {
        // Set first launch date if not set
        await AsyncStorage.setItem('@first_launch_date', new Date().toISOString());
        setIsLoading(false);
        return;
      }

      const daysSinceFirstLaunch = Math.floor(
        (Date.now() - new Date(firstLaunchDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Show after 3-7 days
      if (daysSinceFirstLaunch >= 3 && daysSinceFirstLaunch <= 14) {
        // Additional trigger: Check if user has completed at least one routine
        const routineHistory = await AsyncStorage.getItem(KEYS.CUSTOM.ROUTINE_HISTORY);
        const hasCompletedRoutine = routineHistory && JSON.parse(routineHistory).length > 0;
        
        if (hasCompletedRoutine || daysSinceFirstLaunch >= 5) {
          setShouldShowOnboarding(true);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error checking onboarding eligibility:', error);
      setIsLoading(false);
    }
  };

  const markOnboardingSeen = async () => {
    await AsyncStorage.setItem('@ai_wellness_onboarding_seen', 'true');
    setShouldShowOnboarding(false);
  };

  const dismissOnboarding = async () => {
    await AsyncStorage.setItem('@ai_wellness_onboarding_dismissed', 'true');
    setShouldShowOnboarding(false);
  };

  // Force show for testing
  const forceShowOnboarding = () => {
    setShouldShowOnboarding(true);
  };

  return {
    shouldShowOnboarding,
    isLoading,
    markOnboardingSeen,
    dismissOnboarding,
    forceShowOnboarding
  };
};