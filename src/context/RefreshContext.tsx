import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import { useRoutineStorage } from '../hooks/routines/useRoutineStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { measureAsyncOperation } from '../utils/performance';
import { debounce } from '../utils/debounce';
import { ProgressEntry } from '../types';

interface RefreshContextType {
  isRefreshing: boolean;
  refreshTimestamp: number;
  triggerRefresh: () => void;
  refreshApp: () => Promise<void>;
  refreshProgress: () => Promise<ProgressEntry[]>;
  refreshHome: () => Promise<ProgressEntry[]>;
  refreshSettings: () => Promise<any>;
  refreshFavorites: () => Promise<any[]>;
  refreshRoutine: () => Promise<ProgressEntry[]>;
  debouncedRefreshProgress: () => Promise<void>;
  debouncedRefreshHome: () => Promise<void>;
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

// Define a proper type for the debounced functions
type DebouncedFunction = (() => void) | null;
interface DebouncedFunctions {
  progress: DebouncedFunction;
  home: DebouncedFunction;
  settings: DebouncedFunction;
  favorites: DebouncedFunction;
  routine: DebouncedFunction;
}

export const RefreshProvider: React.FC<RefreshProviderProps> = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const { 
    synchronizeProgressData, 
    getRecentRoutines, 
    saveRoutineProgress,
    getAllRoutines
  } = useRoutineStorage();
  
  // Create debounced versions of refresh functions with proper typing
  const debouncedRefreshRef = useRef<DebouncedFunctions>({
    progress: null,
    home: null,
    settings: null,
    favorites: null,
    routine: null
  });
  
  // Force reload all data from storage with performance monitoring
  const forceReloadData = async () => {
    console.log('Force reloading all data from storage...');
    
    return await measureAsyncOperation('forceReloadData', async () => {
      // Get all keys in AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      console.log('Found', keys.length, 'keys in AsyncStorage');
      
      // Get all data
      const result = await AsyncStorage.multiGet(keys);
      
      // Log the keys and their sizes
      result.forEach(([key, value]) => {
        if (value) {
          console.log(`Key: ${key}, Size: ${value.length} characters`);
        } else {
          console.log(`Key: ${key}, Value: null or undefined`);
        }
      });
      
      return result;
    });
  };
  
  // Clear any in-memory caches
  const clearCaches = () => {
    console.log('Clearing in-memory caches...');
    
    // Clear any React state caches here
    // This is app-specific and would need to be implemented
    // based on what caches your app maintains
    
    // For example, you might want to clear image caches,
    // network request caches, etc.
    
    // We can't directly access component state from here,
    // but we can set a flag that components can check
    
    console.log('In-memory caches cleared');
  };
  
  // Refresh progress data with performance monitoring
  const refreshProgress = useCallback(async () => {
    try {
      console.log('Refreshing progress data...');
      setIsRefreshing(true);
      setRefreshTimestamp(Date.now());
      
      return await measureAsyncOperation('refreshProgress', async () => {
        // First, force a synchronization of storage data only, without reprocessing
        await synchronizeProgressData();
        
        // Then get the latest data without triggering gamification processing
        const routines = await getAllRoutines();
        console.log('Progress refresh complete with', routines.length, 'routines');
        
        // Note: We're purposely not updating challenges/achievements here
        // to avoid duplicate XP awards during refresh
        
        return routines;
      });
    } catch (error) {
      console.error('Error refreshing progress data:', error);
      // Return empty array instead of throwing to ensure UI doesn't break
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [synchronizeProgressData, getAllRoutines]);
  
  // Refresh home screen data
  const refreshHome = useCallback(async () => {
    try {
      console.log('Refreshing home data...');
      setIsRefreshing(true);
      
      // Get the latest routines
      const routines = await getRecentRoutines();
      console.log('Home refresh complete with', routines.length, 'routines');
      
      // Reload any other home screen data here
      // For example, daily tips, user preferences, etc.
      
      return routines;
    } catch (error) {
      console.error('Error refreshing home data:', error);
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [getRecentRoutines]);
  
  // Refresh settings data
  const refreshSettings = useCallback(async () => {
    try {
      console.log('Refreshing settings data...');
      setIsRefreshing(true);
      
      // Reload user preferences
      const userPrefs = await AsyncStorage.getItem('userPreferences');
      console.log('Settings refresh complete');
      
      return userPrefs ? JSON.parse(userPrefs) : {};
    } catch (error) {
      console.error('Error refreshing settings data:', error);
      return {};
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  
  // Refresh favorites data
  const refreshFavorites = useCallback(async () => {
    try {
      console.log('Refreshing favorites data...');
      setIsRefreshing(true);
      
      // Get favorites from storage
      const favoritesJson = await AsyncStorage.getItem('@favorites');
      const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];
      console.log('Favorites refresh complete with', favorites.length, 'favorites');
      
      return favorites;
    } catch (error) {
      console.error('Error refreshing favorites:', error);
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  
  // Refresh routine data
  const refreshRoutine = useCallback(async () => {
    try {
      console.log('Refreshing routine data...');
      setIsRefreshing(true);
      
      // First synchronize to ensure data consistency without reprocessing routines
      await synchronizeProgressData();
      
      // Then get the latest routines
      const routines = await getRecentRoutines();
      console.log('Routine refresh complete with', routines.length, 'routines');
      
      // Note: We're purposely not updating the gamification system here
      // to avoid duplicate XP awards during refresh
      
      return routines;
    } catch (error) {
      console.error('Error refreshing routine data:', error);
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [synchronizeProgressData, getRecentRoutines]);
  
  // Refresh the entire app with performance monitoring - placed after other refresh functions
  const refreshApp = useCallback(async () => {
    try {
      if (isRefreshing) {
        console.log('Refresh already in progress, skipping...');
        return;
      }
      
      setIsRefreshing(true);
      console.log('Starting comprehensive app refresh...');
      
      await measureAsyncOperation('refreshApp', async () => {
        // Clear any in-memory caches
        clearCaches();
        
        // Force reload all data first
        await forceReloadData();
        
        // Refresh all data sources in sequence for more reliability
        await refreshProgress();
        await refreshHome();
        await refreshSettings();
        await refreshFavorites();
        await refreshRoutine();
        
        console.log('Comprehensive app refresh complete');
        return Promise.resolve();
      });
    } catch (error) {
      console.error('Error during comprehensive app refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshProgress, refreshHome, refreshSettings, refreshFavorites, refreshRoutine]);
  
  // Expose debounced versions of refresh functions
  const debouncedRefreshProgress = useCallback(async () => {
    if (debouncedRefreshRef.current.progress) {
      debouncedRefreshRef.current.progress();
      return Promise.resolve();
    }
  }, []);
  
  const debouncedRefreshHome = useCallback(async () => {
    if (debouncedRefreshRef.current.home) {
      debouncedRefreshRef.current.home();
      return Promise.resolve();
    }
  }, []);
  
  // Initialize debounced functions after all refresh functions are defined
  useEffect(() => {
    // Create debounced versions of all refresh functions
    debouncedRefreshRef.current = {
      progress: debounce(async () => await refreshProgress(), 500),
      home: debounce(async () => await refreshHome(), 500),
      settings: debounce(async () => await refreshSettings(), 500),
      favorites: debounce(async () => await refreshFavorites(), 500),
      routine: debounce(async () => await refreshRoutine(), 500)
    };
    
    return () => {
      // Clean up
      debouncedRefreshRef.current = {
        progress: null,
        home: null,
        settings: null,
        favorites: null,
        routine: null
      };
    };
  }, [refreshProgress, refreshHome, refreshSettings, refreshFavorites, refreshRoutine]);
  
  // Simple trigger to notify components that data might have changed
  // without actually refreshing the data
  const triggerRefresh = () => {
    console.log('Refresh triggered (notification only)');
    setRefreshTimestamp(Date.now());
  };
  
  const value = {
    isRefreshing,
    refreshTimestamp,
    triggerRefresh,
    refreshApp,
    refreshProgress,
    refreshHome,
    refreshSettings,
    refreshFavorites,
    refreshRoutine,
    debouncedRefreshProgress,
    debouncedRefreshHome
  };
  
  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};

export default RefreshContext; 