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
      // Check if AI wellness is enabled
      const aiEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED) === 'true';
      if (!aiEnabled) {
        return;
      }

      // Check if user has already seen premium upgrade
      const hasSeenPremiumUpgrade = await AsyncStorage.getItem('@ai_wellness_premium_upgrade_seen') === 'true';
      if (hasSeenPremiumUpgrade) {
        return;
      }

      // Get stored premium status
      const storedPremiumStatus = await AsyncStorage.getItem('@last_premium_status');
      const wasNotPremium = storedPremiumStatus === 'false';

      // User just upgraded to premium
      // Only check upgrade after we have a previous status stored (not on first app load)
      if (isPremium && wasNotPremium && storedPremiumStatus !== null) {
        console.log('[AI Wellness] User upgraded to premium - showing upgrade modal');
        // Delay showing the modal to avoid conflicts with subscription modal
        setTimeout(() => {
          setShouldShowUpgrade(true);
        }, 2000);
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

  return {
    shouldShowUpgrade,
    markUpgradeSeen,
    forceShowUpgrade
  };
};