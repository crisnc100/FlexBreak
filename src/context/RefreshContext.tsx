import React, { createContext, useState, useContext, useCallback } from 'react';
import { useRoutineStorage } from '../hooks/useRoutineStorage';

interface RefreshContextType {
  isRefreshing: boolean;
  refreshApp: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  refreshHome: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  refreshRoutine: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};

interface RefreshProviderProps {
  children: React.ReactNode;
}

export const RefreshProvider: React.FC<RefreshProviderProps> = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { synchronizeProgressData, fetchRecentRoutines, loadCompletedRoutines } = useRoutineStorage();
  
  // Refresh the entire app
  const refreshApp = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Refresh all data sources
      await Promise.all([
        refreshProgress(),
        refreshHome(),
        refreshSettings(),
        refreshFavorites(),
        refreshRoutine()
      ]);
      
      console.log('App refresh complete');
    } catch (error) {
      console.error('Error refreshing app:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshProgress, refreshHome, refreshSettings, refreshFavorites, refreshRoutine]);
  
  // Refresh progress data
  const refreshProgress = useCallback(async () => {
    try {
      console.log('Refreshing progress data...');
      await loadCompletedRoutines();
    } catch (error) {
      console.error('Error refreshing progress data:', error);
      throw error;
    }
  }, [loadCompletedRoutines]);
  
  // Refresh home screen data
  const refreshHome = useCallback(async () => {
    try {
      console.log('Refreshing home data...');
      await fetchRecentRoutines();
      // Add any other home screen data refresh logic here
    } catch (error) {
      console.error('Error refreshing home data:', error);
      throw error;
    }
  }, [fetchRecentRoutines]);
  
  // Refresh settings data
  const refreshSettings = useCallback(async () => {
    try {
      console.log('Refreshing settings data...');
      // Add settings refresh logic here
      // For example, refreshing user preferences, subscription status, etc.
      await new Promise(resolve => setTimeout(resolve, 500)); // Placeholder
    } catch (error) {
      console.error('Error refreshing settings data:', error);
      throw error;
    }
  }, []);
  
  const refreshFavorites = useCallback(async () => {
    console.log('Refreshing favorites data...');
    setIsRefreshing(true);
    
    try {
      // Refresh favorites data
      // This will be implemented in the FavoritesScreen
      
      console.log('Favorites refresh complete');
    } catch (error) {
      console.error('Error refreshing favorites:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  
  // Refresh routine data
  const refreshRoutine = useCallback(async () => {
    try {
      console.log('Refreshing routine data...');
      await fetchRecentRoutines();
    } catch (error) {
      console.error('Error refreshing routine data:', error);
      throw error;
    }
  }, [fetchRecentRoutines]);
  
  const value = {
    isRefreshing,
    refreshApp,
    refreshProgress,
    refreshHome,
    refreshSettings,
    refreshFavorites,
    refreshRoutine
  };
  
  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};

export default RefreshContext; 