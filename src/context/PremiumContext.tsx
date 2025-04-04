import React, { createContext, useState, useContext, useEffect } from 'react';
import { getIsPremium, saveIsPremium } from '../services/storageService';
import { ActivityIndicator, Text, View } from 'react-native';
import { gamificationEvents } from '../hooks/progress/useGamification';
import { PREMIUM_STATUS_CHANGED } from '../hooks/progress/useFeatureAccess';
import * as rewardManager from '../utils/progress/modules/rewardManager';
import * as storageService from '../services/storageService';

export type PremiumContextType = {
  isPremium: boolean;
  setPremiumStatus: (status: boolean) => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
};

export const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load premium status on initial render
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
    
    // Load premium status
    refreshPremiumStatus()
      .then(() => {
        console.log('Premium status loaded successfully');
        setIsInitialized(true);
      })
      .catch(error => {
        console.error('Error loading premium status:', error);
        setIsInitialized(true); // Still mark as initialized even if there's an error
      });
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Remove isInitialized from the dependency array to avoid circular dependency

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
    <PremiumContext.Provider value={{ isPremium, setPremiumStatus, refreshPremiumStatus }}>
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