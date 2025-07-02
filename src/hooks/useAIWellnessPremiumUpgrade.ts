import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../services/storageService';
import { usePremium } from '../context/PremiumContext';

/**
 * Hook to handle showing AI Wellness premium upgrade flow
 * Shows when user upgrades to premium and has AI wellness enabled
 */
export const useAIWellnessPremiumUpgrade = () => {
  const [shouldShowUpgrade, setShouldShowUpgrade] = useState(false);
  const { isPremium } = usePremium();
  const [lastPremiumStatus, setLastPremiumStatus] = useState<boolean | null>(null);

  useEffect(() => {
    checkUpgradeEligibility();
  }, [isPremium]);


  const checkUpgradeEligibility = async () => {
    try {
      // First check if we should show upgrade on this app open (from Settings upgrade)
      const shouldShowOnNextOpen = await AsyncStorage.getItem('@ai_wellness_show_upgrade_on_next_open');
      if (shouldShowOnNextOpen === 'true' && isPremium) {
        await AsyncStorage.removeItem('@ai_wellness_show_upgrade_on_next_open');
        console.log('[AI Wellness] Showing upgrade modal from Settings upgrade');
        // Show immediately since app just opened
        setTimeout(() => {
          setShouldShowUpgrade(true);
        }, 1000);
        return;
      }
      
      // Get stored premium status
      const storedPremiumStatus = await AsyncStorage.getItem('@last_premium_status');
      const wasNotPremium = storedPremiumStatus === 'false';
      
      // Check if user has already seen premium upgrade
      const hasSeenPremiumUpgrade = await AsyncStorage.getItem('@ai_wellness_premium_upgrade_seen') === 'true';
      
      // Show upgrade modal if:
      // 1. User is premium 
      // 2. User hasn't seen the upgrade modal yet
      // 3. Either they just upgraded OR they're an existing premium user
      if (isPremium && !hasSeenPremiumUpgrade) {
        // Case 1: User just upgraded to premium (was not premium before)
        if (wasNotPremium && storedPremiumStatus !== null) {
          console.log('[AI Wellness] User upgraded to premium - showing upgrade modal');
          // Delay showing the modal to avoid conflicts with subscription modal
          setTimeout(() => {
            setShouldShowUpgrade(true);
          }, 2000);
        }
        // Case 2: Existing premium user who hasn't seen the modal
        else if (storedPremiumStatus === null || storedPremiumStatus === 'true') {
          console.log('[AI Wellness] Premium user - showing AI wellness upgrade modal');
          setTimeout(() => {
            setShouldShowUpgrade(true);
          }, 1000);
        }
      }

      // Update stored status
      await AsyncStorage.setItem('@last_premium_status', isPremium.toString());
      setLastPremiumStatus(isPremium);

    } catch (error) {
      console.error('Error checking premium upgrade eligibility:', error);
    }
  };

  const markUpgradeSeen = async () => {
    await AsyncStorage.setItem('@ai_wellness_premium_upgrade_seen', 'true');
    setShouldShowUpgrade(false);
  };

  // Force show for testing
  const forceShowUpgrade = () => {
    setShouldShowUpgrade(true);
  };

  // Reset upgrade seen status (for testing)
  const resetUpgradeSeen = async () => {
    await AsyncStorage.removeItem('@ai_wellness_premium_upgrade_seen');
    await AsyncStorage.removeItem('@last_premium_status');
    console.log('[AI Wellness] Reset premium upgrade status');
  };

  return {
    shouldShowUpgrade,
    markUpgradeSeen,
    forceShowUpgrade,
    resetUpgradeSeen
  };
};