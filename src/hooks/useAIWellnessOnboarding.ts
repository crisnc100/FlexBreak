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
  
  // Add another effect to log when shouldShowOnboarding changes
  useEffect(() => {
    console.log('[AI Wellness Onboarding] shouldShowOnboarding changed to:', shouldShowOnboarding);
  }, [shouldShowOnboarding]);

  const checkOnboardingEligibility = async () => {
    console.log('[AI Wellness Onboarding] checkOnboardingEligibility called');
    try {
      // Check if AI wellness is already enabled
      const aiEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED) === 'true';
      console.log('[AI Wellness Onboarding] AI enabled:', aiEnabled);
      if (aiEnabled) {
        setIsLoading(false);
        return;
      }

      // Check if user has seen or dismissed onboarding
      const hasSeenOnboarding = await AsyncStorage.getItem('@ai_wellness_onboarding_seen') === 'true';
      const hasDismissedOnboarding = await AsyncStorage.getItem('@ai_wellness_onboarding_dismissed') === 'true';
      console.log('[AI Wellness Onboarding] Has seen:', hasSeenOnboarding, 'Has dismissed:', hasDismissedOnboarding);
      
      if (hasSeenOnboarding || hasDismissedOnboarding) {
        setIsLoading(false);
        return;
      }

      // FOR TESTING: Show immediately after splash screen
      const showImmediately = false; // Set to false for production
      
      if (showImmediately) {
        // Add small delay to ensure splash screen completes
        setTimeout(() => {
          setShouldShowOnboarding(true);
        }, 500);
        setIsLoading(false);
        return;
      }

      // Check if user has completed their first routine
      // Note: Routines are stored in PROGRESS_HISTORY, not ROUTINE_HISTORY
      const recentRoutines = await AsyncStorage.getItem(KEYS.PROGRESS.PROGRESS_HISTORY);
      const routineHistory = recentRoutines ? JSON.parse(recentRoutines) : [];
      const hasCompletedFirstRoutine = routineHistory.length === 1;
      
      console.log('[AI Wellness Onboarding] Routine count:', routineHistory.length);
      
      if (hasCompletedFirstRoutine) {
        // Show onboarding immediately after first routine completion
        console.log('[AI Wellness Onboarding] First routine detected - showing onboarding');
        setShouldShowOnboarding(true);
        setIsLoading(false);
        return;
      }

      // PRODUCTION LOGIC: Show after 3-7 days as fallback
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
        const hasCompletedRoutine = routineHistory.length > 0;
        
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

  // Method to re-check eligibility (useful after routine completion)
  const recheckEligibility = async () => {
    console.log('[AI Wellness Onboarding] recheckEligibility called');
    setIsLoading(true); // Reset loading state to force re-check
    await checkOnboardingEligibility();
  };

  return {
    shouldShowOnboarding,
    isLoading,
    markOnboardingSeen,
    dismissOnboarding,
    forceShowOnboarding,
    recheckEligibility
  };
};