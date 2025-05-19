import React, { createContext, useState, useContext, useEffect } from 'react';
import { getIsPremium, saveIsPremium, getSubscriptionDetails, saveSubscriptionDetails, clearSubscriptionDetails } from '../services/storageService';
import { ActivityIndicator, Text, View } from 'react-native';
import { gamificationEvents } from '../hooks/progress/useGamification';
import { PREMIUM_STATUS_CHANGED } from '../hooks/progress/useFeatureAccess';
import * as rewardManager from '../utils/progress/modules/rewardManager';
import * as storageService from '../services/storageService';

export type SubscriptionDetails = {
  productId: string;
  purchaseDate: string;
  expiryDate?: string;
  isActive: boolean;
  autoRenewing?: boolean;
  platform: 'ios' | 'android';
  purchaseToken?: string;
};

export type PremiumContextType = {
  isPremium: boolean;
  setPremiumStatus: (status: boolean) => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  subscriptionDetails: SubscriptionDetails | null;
  updateSubscription: (details: SubscriptionDetails) => Promise<void>;
  cancelSubscription: () => Promise<void>;
};

export const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);

  // Load premium status and subscription details on initial render
  useEffect(() => {
    console.log('PremiumProvider mounted, loading premium status');
    
    // Add a timeout to ensure initialization completes even if there's an issue
    const timeoutId = setTimeout(() => {
      console.log('PremiumProvider: Timeout check for initialization');
      if (!isInitialized) {
        console.log('PremiumProvider: Timeout reached, forcing initialization');
        setIsInitialized(true);
      }
    }, 2000);
    
    // Load premium status and subscription details
    const initializeProvider = async () => {
      try {
        await refreshPremiumStatus();
        await loadSubscriptionDetails();
        console.log('Premium status and subscription details loaded successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during initialization:', error);
        setIsInitialized(true); // Still mark as initialized even if there's an error
      }
    };
    
    initializeProvider();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Remove isInitialized from the dependency array to avoid circular dependency

  // Function to load subscription details
  const loadSubscriptionDetails = async (): Promise<void> => {
    try {
      console.log('Loading subscription details from storage');
      const details = await getSubscriptionDetails();
      console.log('Subscription details from storage:', details);
      setSubscriptionDetails(details);
    } catch (error) {
      console.error('Error loading subscription details:', error);
    }
  };

  // Function to refresh premium status from storage
  const refreshPremiumStatus = async (): Promise<void> => {
    try {
      console.log('Refreshing premium status from storage');
      const premiumStatus = await getIsPremium();
      console.log('Premium status from storage:', premiumStatus);
      setIsPremium(premiumStatus);
    } catch (error) {
      console.error('Error loading premium status:', error);
    }
  };

  // Function to update subscription details
  const updateSubscription = async (details: SubscriptionDetails): Promise<void> => {
    try {
      console.log('Updating subscription details:', details);
      await saveSubscriptionDetails(details);
      setSubscriptionDetails(details);
      
      // Update premium status based on subscription activity
      if (details.isActive && !isPremium) {
        await setPremiumStatus(true);
      } else if (!details.isActive && isPremium) {
        await setPremiumStatus(false);
      }
    } catch (error) {
      console.error('Error updating subscription details:', error);
    }
  };

  // Function to cancel subscription (locally)
  const cancelSubscription = async (): Promise<void> => {
    try {
      console.log('Canceling subscription locally');
      await clearSubscriptionDetails();
      setSubscriptionDetails(null);
      await setPremiumStatus(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  // Add a new function to refresh rewards when premium status changes
  const updateRewardsAfterPremiumChange = async (isPremium: boolean) => {
    if (isPremium) {
      try {
        // Get current user progress
        const userProgress = await storageService.getUserProgress();
        console.log(`Updating rewards after premium change. User level: ${userProgress.level}`);
        
        // Force update rewards based on current level
        await rewardManager.updateRewards(userProgress);
        
        // Explicitly check dark theme eligibility
        if (userProgress.level >= 2) {
          console.log(`User is level ${userProgress.level}, ensuring dark theme is unlocked`);
          if (!userProgress.rewards?.dark_theme?.unlocked) {
            const newProgress = { ...userProgress };
            
            // Make sure rewards and dark theme objects exist
            if (!newProgress.rewards) newProgress.rewards = {};
            if (!newProgress.rewards.dark_theme) {
              // Find the dark theme reward in CORE_REWARDS
              const darkThemeReward = await rewardManager.getAllRewards()
                .then(rewards => rewards.find(r => r.id === 'dark_theme'));
                
              if (darkThemeReward) {
                newProgress.rewards.dark_theme = darkThemeReward;
              } else {
                // Fallback if not found
                newProgress.rewards.dark_theme = {
                  id: 'dark_theme',
                  title: 'Dark Theme',
                  description: 'Switch to a dark theme to reduce eye strain',
                  icon: 'moon-outline',
                  levelRequired: 2,
                  unlocked: true,
                  type: 'theme'
                };
              }
            }
            
            // Ensure it's unlocked
            newProgress.rewards.dark_theme.unlocked = true;
            
            // Save the changes
            await storageService.saveUserProgress(newProgress);
            console.log('Dark theme manually unlocked after premium status change');
          }
        }
        
        // Explicitly check and ensure streak flexSave availability for premium users
        const requiredLevel = 6; // Level requirement for streak flexSaves
        if (userProgress.level >= requiredLevel) {
          console.log(`User is level ${userProgress.level}, ensuring streak flexSaves are available`);
          
          // Ensure rewards object exists
          if (!userProgress.rewards) userProgress.rewards = {};
          
          // Check if flex_saves reward exists and is properly configured
          if (!userProgress.rewards.flex_saves || 
              typeof userProgress.rewards.flex_saves.uses === 'undefined') {
            
            console.log('Initializing streak flexSaves reward for premium user');
            
            // Find streak flexSaves reward in all rewards
            const flexSaveReward = await rewardManager.getAllRewards()
              .then(rewards => rewards.find(r => r.id === 'flex_saves'));
            
            if (flexSaveReward) {
              // Use the reward template
              userProgress.rewards.flex_saves = {
                ...flexSaveReward,
                unlocked: true,
                uses: 2, // Start with 2 flexSaves
                lastRefill: new Date().toISOString()
              };
            } else {
              // Fallback if reward not found
              userProgress.rewards.flex_saves = {
                id: 'flex_saves',
                title: 'Flex Saves',
                description: 'Protect your streak when you miss a day',
                icon: 'snow-outline',
                levelRequired: requiredLevel,
                unlocked: true,
                uses: 2,
                lastRefill: new Date().toISOString(),
                type: 'consumable'
              };
            }
            
            // Save the updated user progress
            await storageService.saveUserProgress(userProgress);
            console.log('Flex saves initialized to 2 uses for premium user');
          } else if (userProgress.rewards.flex_saves.uses < 2) {
            // If user has fewer than 2 flexSaves, top up to 2
            console.log(`User only has ${userProgress.rewards.flex_saves.uses} flexSaves, topping up to 2`);
            userProgress.rewards.flex_saves.uses = 2;
            userProgress.rewards.flex_saves.lastRefill = new Date().toISOString();
            
            // Save the updated user progress
            await storageService.saveUserProgress(userProgress);
            console.log('Flex saves topped up to 2 uses for premium user');
          }
        }
      } catch (error) {
        console.error('Error updating rewards after premium change:', error);
      }
    }
  };

  // Function to update premium status
  const setPremiumStatus = async (status: boolean): Promise<void> => {
    try {
      console.log('Setting premium status to:', status);
      await saveIsPremium(status);
      setIsPremium(status);
      console.log('Premium status updated globally:', status);
      
      // Emit event for premium status change
      if (gamificationEvents) {
        gamificationEvents.emit(PREMIUM_STATUS_CHANGED);
        console.log('Premium status changed event emitted from context');
      }

      // Update rewards after premium status changes
      await updateRewardsAfterPremiumChange(status);
    } catch (error) {
      console.error('Error saving premium status:', error);
    }
  };

  // Add a log when isPremium changes
  useEffect(() => {
    console.log('PremiumContext isPremium changed:', isPremium);
  }, [isPremium]);

  // Show a loading indicator while initializing
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10 }}>Loading app settings...</Text>
      </View>
    );
  }

  return (
    <PremiumContext.Provider 
      value={{ 
        isPremium, 
        setPremiumStatus, 
        refreshPremiumStatus,
        subscriptionDetails,
        updateSubscription,
        cancelSubscription
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};

// Custom hook to use the premium context
export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}; 