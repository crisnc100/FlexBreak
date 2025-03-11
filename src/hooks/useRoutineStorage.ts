import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressEntry, BodyArea, Duration } from '../types';

interface UseRoutineStorageReturn {
  recentRoutines: ProgressEntry[];
  isLoading: boolean;
  saveRoutineProgress: (entry: { area: BodyArea; duration: Duration; date: string }) => Promise<void>;
  getRecentRoutines: () => Promise<ProgressEntry[]>;
  deleteRoutine: (routineDate: string) => Promise<void>;
  saveFavoriteRoutine: (routine: { name: string; area: BodyArea; duration: Duration }) => Promise<void>;
  setDashboardFlag: (value: boolean) => Promise<void>;
  getDashboardFlag: () => Promise<boolean>;
  clearAllFlags: () => Promise<void>;
}

export function useRoutineStorage(): UseRoutineStorageReturn {
  const [recentRoutines, setRecentRoutines] = useState<ProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load recent routines on mount
  useEffect(() => {
    const loadRoutines = async () => {
      try {
        const routines = await getRecentRoutines();
        setRecentRoutines(routines);
        console.log('Loaded routines:', routines.length);
      } catch (error) {
        console.error('Error loading routines:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoutines();
  }, []);

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
      
      // Save to storage
      await AsyncStorage.setItem('@progress', JSON.stringify(updatedRoutines));
      console.log('Saved routine progress, total routines:', updatedRoutines.length);
      
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
      
      const existingRoutines = await getRecentRoutines();
      const updatedRoutines = existingRoutines.filter(
        routine => routine.date !== routineDate
      );
      
      await AsyncStorage.setItem('@progress', JSON.stringify(updatedRoutines));
      console.log('Deleted routine, remaining routines:', updatedRoutines.length);
      
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
    saveRoutineProgress,
    getRecentRoutines,
    deleteRoutine,
    saveFavoriteRoutine,
    setDashboardFlag,
    getDashboardFlag,
    clearAllFlags
  };
}