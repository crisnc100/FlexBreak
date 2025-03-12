import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressEntry, BodyArea, Duration } from '../types';

interface UseRoutineStorageReturn {
  recentRoutines: ProgressEntry[];
  isLoading: boolean;
  hasSynchronized: boolean;
  saveRoutineProgress: (entry: { area: BodyArea; duration: Duration; date: string }) => Promise<void>;
  getRecentRoutines: () => Promise<ProgressEntry[]>;
  getAllRoutines: () => Promise<ProgressEntry[]>;
  hideRoutine: (routineDate: string) => Promise<void>;
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
  const synchronizeProgressData = useCallback(async () => {
    try {
      // Get data from all storage locations
      const recentRoutinesJson = await AsyncStorage.getItem('@progress');
      const progressJson = await AsyncStorage.getItem('progress');
      const hiddenRoutinesJson = await AsyncStorage.getItem('@hiddenRoutines');
      
      const recentRoutinesData = recentRoutinesJson ? JSON.parse(recentRoutinesJson) : [];
      const progressData = progressJson ? JSON.parse(progressJson) : [];
      const hiddenRoutinesData = hiddenRoutinesJson ? JSON.parse(hiddenRoutinesJson) : [];
      
      console.log('Synchronizing data from multiple sources:');
      console.log('- Visible routines:', recentRoutinesData.length);
      console.log('- Progress data:', progressData.length);
      console.log('- Hidden routines:', hiddenRoutinesData.length);
      
      // Create a merged set of unique entries based on date
      const mergedEntries: { [key: string]: ProgressEntry } = {};
      
      // Add entries from @progress (visible routines)
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
      
      // Add entries from hidden routines
      hiddenRoutinesData.forEach((entry: ProgressEntry) => {
        if (entry.date) {
          // Preserve the hidden flag
          if (!mergedEntries[entry.date]) {
            mergedEntries[entry.date] = entry;
          } else {
            // If entry exists but isn't marked as hidden, update it
            mergedEntries[entry.date] = {
              ...mergedEntries[entry.date],
              hidden: entry.hidden || false
            };
          }
        }
      });
      
      // Convert back to arrays
      const mergedRecentRoutines = Object.values(mergedEntries);
      
      // Sort by date (newest first)
      mergedRecentRoutines.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Split into visible and hidden routines
      const visibleRoutines = mergedRecentRoutines.filter(routine => !routine.hidden);
      const hiddenRoutines = mergedRecentRoutines.filter(routine => routine.hidden);
      
      // Save synchronized data back to storage
      await AsyncStorage.setItem('@progress', JSON.stringify(visibleRoutines));
      await AsyncStorage.setItem('@hiddenRoutines', JSON.stringify(hiddenRoutines));
      
      // Save ALL routines (both visible and hidden) to progress for statistics
      await AsyncStorage.setItem('progress', JSON.stringify(mergedRecentRoutines));
      
      console.log('Progress data synchronized successfully:');
      console.log('- Total entries:', mergedRecentRoutines.length);
      console.log('- Visible entries:', visibleRoutines.length);
      console.log('- Hidden entries:', hiddenRoutines.length);
      
      // Update state with visible routines only
      setRecentRoutines(visibleRoutines);
    } catch (error) {
      console.error('Error synchronizing progress data:', error);
    }
  }, []);

  // Save routine progress
  const saveRoutineProgress = useCallback(async (entry: { area: BodyArea; duration: Duration; date: string }) => {
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
  }, []);

  // Get recent routines (only visible ones)
  const getRecentRoutines = useCallback(async (): Promise<ProgressEntry[]> => {
    try {
      const routinesJson = await AsyncStorage.getItem('@progress');
      if (routinesJson) {
        const routines = JSON.parse(routinesJson) as ProgressEntry[];
        // Filter out any routines that might have a hidden flag
        const visibleRoutines = routines.filter(routine => !routine.hidden);
        console.log('Retrieved visible routines from storage:', visibleRoutines.length);
        return visibleRoutines;
      }
      console.log('No routines found in storage');
      return [];
    } catch (error) {
      console.error('Error getting recent routines:', error);
      return [];
    }
  }, []);

  // Hide a routine (instead of deleting it)
  const hideRoutine = useCallback(async (routineDate: string) => {
    try {
      console.log('Hiding routine with date:', routineDate);
      
      // Get existing routines
      const existingRoutines = await getRecentRoutines();
      
      // Find the routine to hide
      const routineToHide = existingRoutines.find(routine => routine.date === routineDate);
      
      if (!routineToHide) {
        console.log('Routine not found, nothing to hide');
        return;
      }
      
      // Remove from visible routines
      const updatedRoutines = existingRoutines.filter(
        routine => routine.date !== routineDate
      );
      
      // Save updated visible routines
      await AsyncStorage.setItem('@progress', JSON.stringify(updatedRoutines));
      console.log('Removed routine from visible list, remaining routines:', updatedRoutines.length);
      
      // Add to hidden routines
      const hiddenRoutinesJson = await AsyncStorage.getItem('@hiddenRoutines');
      const hiddenRoutines = hiddenRoutinesJson ? JSON.parse(hiddenRoutinesJson) : [];
      
      // Mark the routine as hidden
      const hiddenRoutine = {
        ...routineToHide,
        hidden: true
      };
      
      hiddenRoutines.push(hiddenRoutine);
      await AsyncStorage.setItem('@hiddenRoutines', JSON.stringify(hiddenRoutines));
      console.log('Added routine to hidden list, total hidden routines:', hiddenRoutines.length);
      
      // Update state
      setRecentRoutines(updatedRoutines);
    } catch (error) {
      console.error('Error hiding routine:', error);
      throw error;
    }
  }, []);
  
  // For backward compatibility - now just calls hideRoutine
  const deleteRoutine = useCallback(async (routineDate: string) => {
    console.log('deleteRoutine is deprecated, using hideRoutine instead');
    return hideRoutine(routineDate);
  }, [hideRoutine]);

  // Save a favorite routine
  const saveFavoriteRoutine = useCallback(async (routine: { name: string; area: BodyArea; duration: Duration }) => {
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
  }, []);

  // Set dashboard flag
  const setDashboardFlag = useCallback(async (value: boolean) => {
    try {
      console.log('Setting dashboard flag to:', value);
      await AsyncStorage.setItem('@shouldShowDashboard', value ? 'true' : 'false');
      console.log('Dashboard flag set successfully');
    } catch (error) {
      console.error('Error setting dashboard flag:', error);
      throw error;
    }
  }, []);

  // Get dashboard flag
  const getDashboardFlag = useCallback(async (): Promise<boolean> => {
    try {
      const flag = await AsyncStorage.getItem('@shouldShowDashboard');
      const shouldShow = flag === 'true';
      console.log('Retrieved dashboard flag:', flag, 'Parsed value:', shouldShow);
      return shouldShow;
    } catch (error) {
      console.error('Error getting dashboard flag:', error);
      return false;
    }
  }, []);

  // Clear all flags (for debugging)
  const clearAllFlags = useCallback(async () => {
    try {
      console.log('Clearing all flags');
      await AsyncStorage.removeItem('@shouldShowDashboard');
      console.log('All flags cleared successfully');
    } catch (error) {
      console.error('Error clearing flags:', error);
      throw error;
    }
  }, []);

  // Get all routines (both visible and hidden) for statistics
  const getAllRoutines = useCallback(async (): Promise<ProgressEntry[]> => {
    try {
      const progressJson = await AsyncStorage.getItem('progress');
      if (progressJson) {
        const allRoutines = JSON.parse(progressJson) as ProgressEntry[];
        console.log('Retrieved all routines for statistics:', allRoutines.length);
        return allRoutines;
      }
      console.log('No progress data found in storage');
      return [];
    } catch (error) {
      console.error('Error getting all routines:', error);
      return [];
    }
  }, []);

  return {
    recentRoutines,
    isLoading,
    hasSynchronized,
    saveRoutineProgress,
    getRecentRoutines,
    getAllRoutines,
    hideRoutine,
    deleteRoutine,
    saveFavoriteRoutine,
    setDashboardFlag,
    getDashboardFlag,
    clearAllFlags,
    synchronizeProgressData
  };
}