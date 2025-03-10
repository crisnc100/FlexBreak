import React, { createContext, useState, useContext, useEffect } from 'react';
import { getIsPremium, saveIsPremium } from '../utils/storage';
import { ActivityIndicator, Text, View } from 'react-native';

type PremiumContextType = {
  isPremium: boolean;
  setPremiumStatus: (status: boolean) => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

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
  const refreshPremiumStatus = async () => {
    try {
      console.log('Refreshing premium status from storage');
      const premiumStatus = await getIsPremium();
      console.log('Premium status from storage:', premiumStatus);
      setIsPremium(premiumStatus);
      return premiumStatus;
    } catch (error) {
      console.error('Error loading premium status:', error);
      return false;
    }
  };

  // Function to update premium status
  const setPremiumStatus = async (status: boolean) => {
    try {
      console.log('Setting premium status to:', status);
      await saveIsPremium(status);
      setIsPremium(status);
      console.log('Premium status updated globally:', status);
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