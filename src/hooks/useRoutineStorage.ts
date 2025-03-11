import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressEntry, BodyArea, Duration } from '../types';

interface UseRoutineStorageReturn {
  recentRoutines: ProgressEntry[];
  isLoading: boolean;
  hasSynchronized: boolean;
  saveRoutineProgress: (entry: { area: BodyArea; duration: Duration; date: string }) => Promise<void>;
  getRecentRoutines: () => Promise<ProgressEntry[]>;
  deleteRoutine: (routineDate: string) => Promise<void>;
  saveFavoriteRoutine: (routine: { name: string; area: BodyArea; duration: Duration }) => Promise<void>;
  setDashboardFlag: (value: boolean) => Promise<void>;
  getDashboardFlag: () => Promise<boolean>;
  clearAllFlags: () => Promise<void>;
  synchronizeProgressData: () => Promise<void>;
}

export function useRoutineStorage(): UseRoutineStorageReturn {
  const [recentRoutines, setRecentRoutines] = useState<ProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSynchronized, setHasSynchronized] = useState(false);

  // Load recent routines on mount
  useEffect(() => {
    const loadRoutines = async () => {
      try {
        const routines = await getRecentRoutines();
        setRecentRoutines(routines);
        console.log('Loaded routines:', routines.length);
        
        // Synchronize data between storage locations (only once)
        if (!hasSynchronized) {
          await synchronizeProgressData();
          setHasSynchronized(true);
        }
      } catch (error) {
        console.error('Error loading routines:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoutines();
  }, [hasSynchronized]);

  // Synchronize data between @progress and progress
  const synchronizeProgressData = async () => {
    try {
      // Get data from both storage locations
      const recentRoutinesJson = await AsyncStorage.getItem('@progress');
      const progressJson = await AsyncStorage.getItem('progress');
      
      const recentRoutinesData = recentRoutinesJson ? JSON.parse(recentRoutinesJson) : [];
      const progressData = progressJson ? JSON.parse(progressJson) : [];
      
      // Check if synchronization is needed
      if (recentRoutinesData.length === 0 && progressData.length === 0) {
        console.log('No data to synchronize');
        return;
      }
      
      // If both arrays are empty or identical, no need to synchronize
      if (JSON.stringify(recentRoutinesData) === JSON.stringify(progressData)) {
        console.log('Data already synchronized');
        return;
      }
      
      console.log('Synchronizing progress data between storage locations');
      
      // Create a merged set of unique entries based on date
      const mergedEntries: { [key: string]: ProgressEntry } = {};
      
      // Add entries from @progress
      recentRoutinesData.forEach((entry: ProgressEntry) => {
        if (entry.date) {
          mergedEntries[entry.date] = entry;
        }
      });
      
      // Add entries from progress
      progressData.forEach((entry: ProgressEntry) => {
        if (entry.date) {
          mergedEntries[entry.date] = entry;
        }
      });
      
      // Convert back to arrays
      const mergedRecentRoutines = Object.values(mergedEntries);
      
      // Sort by date (newest first)
      mergedRecentRoutines.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Save synchronized data back to both storage locations
      await AsyncStorage.setItem('@progress', JSON.stringify(mergedRecentRoutines));
      await AsyncStorage.setItem('progress', JSON.stringify(mergedRecentRoutines));
      
      console.log('Progress data synchronized successfully, total entries:', mergedRecentRoutines.length);
      
      // Update state
      setRecentRoutines(mergedRecentRoutines);
    } catch (error) {
      console.error('Error synchronizing progress data:', error);
    }
  };

  // Save routine progress
  const saveRoutineProgress = async (entry: { area: BodyArea; duration: Duration; date: string }) => {
    try {
      console.log('Saving routine progress:', entry);
      
      // Get existing routines
      const existingRoutines = await getRecentRoutines();
      
      // Create new entry
      const newEntry: ProgressEntry = {
        area: entry.area,
        duration: entry.duration,
        date: entry.date
      };
      
      // Add to beginning of array
      const updatedRoutines = [newEntry, ...existingRoutines];
      
      // Save to storage for recent routines
      await AsyncStorage.setItem('@progress', JSON.stringify(updatedRoutines));
      console.log('Saved routine progress to @progress, total routines:', updatedRoutines.length);
      
      // ALSO save to 'progress' key for the ProgressScreen
      try {
        // Get existing progress data
        const progressJson = await AsyncStorage.getItem('progress');
        const progressData = progressJson ? JSON.parse(progressJson) : [];
        
        // Add new entry to progress data
        progressData.push(newEntry);
        
        // Save updated progress data
        await AsyncStorage.setItem('progress', JSON.stringify(progressData));
        console.log('Also saved routine progress to progress key for ProgressScreen');
      } catch (progressError) {
        console.error('Error saving to progress key:', progressError);
      }
      
      // Update state
      setRecentRoutines(updatedRoutines);
    } catch (error) {
      console.error('Error saving routine progress:', error);
      throw error;
    }
  };

  // Get recent routines
  const getRecentRoutines = async (): Promise<ProgressEntry[]> => {
    try {
      const routinesJson = await AsyncStorage.getItem('@progress');
      if (routinesJson) {
        const routines = JSON.parse(routinesJson) as ProgressEntry[];
        console.log('Retrieved routines from storage:', routines.length);
        return routines;
      }
      console.log('No routines found in storage');
      return [];
    } catch (error) {
      console.error('Error getting recent routines:', error);
      return [];
    }
  };

  // Delete a routine
  const deleteRoutine = async (routineDate: string) => {
    try {
      console.log('Deleting routine with date:', routineDate);
      
      // Delete from @progress (recent routines)
      const existingRoutines = await getRecentRoutines();
      const updatedRoutines = existingRoutines.filter(
        routine => routine.date !== routineDate
      );
      
      await AsyncStorage.setItem('@progress', JSON.stringify(updatedRoutines));
      console.log('Deleted routine from @progress, remaining routines:', updatedRoutines.length);
      
      // ALSO delete from 'progress' key for the ProgressScreen
      try {
        const progressJson = await AsyncStorage.getItem('progress');
        if (progressJson) {
          const progressData = JSON.parse(progressJson);
          const updatedProgressData = progressData.filter(
            (routine: ProgressEntry) => routine.date !== routineDate
          );
          
          await AsyncStorage.setItem('progress', JSON.stringify(updatedProgressData));
          console.log('Also deleted routine from progress key for ProgressScreen');
        }
      } catch (progressError) {
        console.error('Error deleting from progress key:', progressError);
      }
      
      setRecentRoutines(updatedRoutines);
    } catch (error) {
      console.error('Error deleting routine:', error);
      throw error;
    }
  };

  // Save a favorite routine
  const saveFavoriteRoutine = async (routine: { name: string; area: BodyArea; duration: Duration }) => {
    try {
      console.log('Saving favorite routine:', routine);
      
      // Get existing favorites
      const favoritesJson = await AsyncStorage.getItem('@favorites');
      const favorites = favoritesJson ? JSON.parse(favoritesJson) : [];
      
      // Add new favorite
      const newFavorite = {
        ...routine,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };
      
      // Add to beginning of array
      const updatedFavorites = [newFavorite, ...favorites];
      
      // Save to storage
      await AsyncStorage.setItem('@favorites', JSON.stringify(updatedFavorites));
      console.log('Saved favorite routine, total favorites:', updatedFavorites.length);
    } catch (error) {
      console.error('Error saving favorite routine:', error);
      throw error;
    }
  };

  // Set dashboard flag
  const setDashboardFlag = async (value: boolean) => {
    try {
      console.log('Setting dashboard flag to:', value);
      await AsyncStorage.setItem('@shouldShowDashboard', value ? 'true' : 'false');
      console.log('Dashboard flag set successfully');
    } catch (error) {
      console.error('Error setting dashboard flag:', error);
      throw error;
    }
  };

  // Get dashboard flag
  const getDashboardFlag = async (): Promise<boolean> => {
    try {
      const flag = await AsyncStorage.getItem('@shouldShowDashboard');
      const shouldShow = flag === 'true';
      console.log('Retrieved dashboard flag:', flag, 'Parsed value:', shouldShow);
      return shouldShow;
    } catch (error) {
      console.error('Error getting dashboard flag:', error);
      return false;
    }
  };

  // Clear all flags (for debugging)
  const clearAllFlags = async () => {
    try {
      console.log('Clearing all flags');
      await AsyncStorage.removeItem('@shouldShowDashboard');
      console.log('All flags cleared successfully');
    } catch (error) {
      console.error('Error clearing flags:', error);
      throw error;
    }
  };

  return {
    recentRoutines,
    isLoading,
    hasSynchronized,
    saveRoutineProgress,
    getRecentRoutines,
    deleteRoutine,
    saveFavoriteRoutine,
    setDashboardFlag,
    getDashboardFlag,
    clearAllFlags,
    synchronizeProgressData
  };
}