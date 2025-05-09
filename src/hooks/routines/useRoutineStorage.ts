import { useState, useEffect, useCallback } from 'react';
import { ProgressEntry, BodyArea, Duration, StretchLevel } from '../../types';
import * as storageService from '../../services/storageService';

interface UseRoutineStorageReturn {
  recentRoutines: ProgressEntry[];
  isLoading: boolean;
  hasSynchronized: boolean;
  saveRoutineProgress: (entry: { area: BodyArea; duration: Duration; date: string; stretchCount?: number; level?: StretchLevel; savedStretches?: any[] }) => Promise<void>;
  getRecentRoutines: () => Promise<ProgressEntry[]>;
  getAllRoutines: () => Promise<ProgressEntry[]>;
  hideRoutine: (routineDate: string) => Promise<void>;
  deleteRoutine: (routineDate: string) => Promise<void>;
  saveFavoriteRoutine: (routine: { name?: string; area: BodyArea; duration: Duration; level?: StretchLevel; savedStretches?: any[] }) => Promise<void>;
  setDashboardFlag: (value: boolean) => Promise<void>;
  getDashboardFlag: () => Promise<boolean>;
  clearAllFlags: () => Promise<void>;
  synchronizeProgressData: () => Promise<boolean>;
}

export function useRoutineStorage(): UseRoutineStorageReturn {
  const [recentRoutines, setRecentRoutines] = useState<ProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSynchronized, setHasSynchronized] = useState(false);

  // Log routines when they change
  useEffect(() => {
    if (recentRoutines.length > 0) {
      
      // Log dates for all routines
      const sortedDates = recentRoutines
        .map(r => r.date?.split('T')[0])
        .filter(Boolean)
        .sort();
      
      
      // Log dates for routines in the current month
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      const thisMonthDates = recentRoutines
        .filter(r => {
          if (!r.date) return false;
          const routineDate = new Date(r.date);
          return routineDate.getMonth() === currentMonth && 
                 routineDate.getFullYear() === currentYear;
        })
        .map(r => r.date?.split('T')[0])
        .sort();
      
      console.log(`[HOOK DEBUG] Routines this month (${currentMonth + 1}/${currentYear}):`, 
                 thisMonthDates.length, JSON.stringify(thisMonthDates));
    }
  }, [recentRoutines]);

  // Load recent routines on mount
  useEffect(() => {
    const loadRoutines = async () => {
      try {
        console.log('[HOOK DEBUG] Loading routines from storage...');
        const routines = await getRecentRoutines();
        setRecentRoutines(routines);
        console.log('[HOOK DEBUG] Loaded routines:', routines.length);
        
        // Synchronize data between storage locations (only once)
        if (!hasSynchronized) {
          console.log('[HOOK DEBUG] Starting initial data synchronization...');
          await synchronizeProgressData();
          setHasSynchronized(true);
        }
      } catch (error) {
        console.error('[HOOK ERROR] Error loading routines:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoutines();
  }, [hasSynchronized]);

  // Synchronize data between storage locations
  const synchronizeProgressData = useCallback(async () => {
    try {
      
      // Use the centralized function from storageService
      const success = await storageService.synchronizeProgressData();
      
      if (success) {
        // Refresh recent routines after synchronization
        const updatedRoutines = await storageService.getRecentRoutines();
        setRecentRoutines(updatedRoutines);
        
        // Log dates for synced routines
        const syncedDates = updatedRoutines
          .map(r => r.date?.split('T')[0])
          .filter(Boolean)
          .sort();
        
        console.log('[HOOK DEBUG] Synced routine dates:', JSON.stringify(syncedDates));
      } else {
        console.log('[HOOK DEBUG] Synchronization failed or no changes made');
      }
      
      return success;
    } catch (error) {
      console.error('[HOOK ERROR] Error calling synchronizeProgressData:', error);
      return false;
    }
  }, []);

  // Save routine progress
  const saveRoutineProgress = useCallback(async (entry: { area: BodyArea; duration: Duration; date: string; stretchCount?: number; level?: StretchLevel; savedStretches?: any[] }) => {
    try {
      
      // Use storageService instead of direct AsyncStorage calls
      const success = await storageService.saveRoutineProgress(entry);
      
      if (success) {
        // Update local state
        const updatedRoutines = await storageService.getRecentRoutines();
        setRecentRoutines(updatedRoutines);
        
        // Log updated routine dates after save
        const updatedDates = updatedRoutines
          .map(r => r.date?.split('T')[0])
          .filter(Boolean)
          .sort();
        
        console.log('[HOOK DEBUG] Updated routine dates after save:', JSON.stringify(updatedDates));
      } else {
        console.log('[HOOK DEBUG] Failed to save routine progress');
      }
    } catch (error) {
      console.error('[HOOK ERROR] Error saving routine progress:', error);
      throw error;
    }
  }, []);

  // Get recent routines (only visible ones)
  const getRecentRoutines = useCallback(async (): Promise<ProgressEntry[]> => {
    try {
      console.log('[HOOK DEBUG] Fetching recent routines from storage...');
      
      // Use storageService instead of direct AsyncStorage calls
      const freshRoutines = await storageService.getRecentRoutines();
      
      // Log the retrieved routine dates
      const retrievedDates = freshRoutines
        .map(r => r.date?.split('T')[0])
        .filter(Boolean)
        .sort();
      
      console.log('[HOOK DEBUG] Retrieved routine dates:', JSON.stringify(retrievedDates));
      
      // Check for today and yesterday dates
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const hasToday = retrievedDates.includes(todayStr);
      const hasYesterday = retrievedDates.includes(yesterdayStr);
      
      console.log(`[HOOK DEBUG] Has routine for today (${todayStr}): ${hasToday}`);
      console.log(`[HOOK DEBUG] Has routine for yesterday (${yesterdayStr}): ${hasYesterday}`);
      
      // Update local state with fresh data
      setRecentRoutines(freshRoutines);
      
      return freshRoutines;
    } catch (error) {
      console.error('[HOOK ERROR] Error getting recent routines:', error);
      return [];
    }
  }, []);

  // Hide a routine (instead of deleting it)
  const hideRoutine = useCallback(async (routineDate: string) => {
    try {
      // Use storageService instead of direct AsyncStorage calls
      const success = await storageService.hideRoutine(routineDate);
      
      if (success) {
        // Update local state
        const updatedRoutines = await storageService.getRecentRoutines();
        setRecentRoutines(updatedRoutines);
      }
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
  const saveFavoriteRoutine = useCallback(async (routine: { name?: string; area: BodyArea; duration: Duration; level?: StretchLevel; savedStretches?: any[] }) => {
    try {
      // Use storageService instead of direct AsyncStorage calls
      await storageService.saveFavoriteRoutine(routine);
    } catch (error) {
      console.error('Error saving favorite routine:', error);
      throw error;
    }
  }, []);

  // Set dashboard flag
  const setDashboardFlag = useCallback(async (value: boolean) => {
    try {
      // Use storageService instead of direct AsyncStorage calls
      await storageService.setDashboardFlag(value);
    } catch (error) {
      console.error('Error setting dashboard flag:', error);
      throw error;
    }
  }, []);

  // Get dashboard flag
  const getDashboardFlag = useCallback(async (): Promise<boolean> => {
    try {
      // Use storageService instead of direct AsyncStorage calls
      return await storageService.getDashboardFlag();
    } catch (error) {
      console.error('Error getting dashboard flag:', error);
      return false;
    }
  }, []);

  // Clear all flags (for debugging)
  const clearAllFlags = useCallback(async () => {
    try {
      console.log('Clearing all flags');
      await storageService.removeData(storageService.KEYS.SETTINGS.SHOW_DASHBOARD);
      console.log('All flags cleared successfully');
    } catch (error) {
      console.error('Error clearing flags:', error);
      throw error;
    }
  }, []);

  // Get all routines (both visible and hidden) for statistics
  const getAllRoutines = useCallback(async (): Promise<ProgressEntry[]> => {
    try {
      console.log('[HOOK DEBUG] Fetching all routines from storage...');
      
      // Use storageService instead of direct AsyncStorage calls
      const allRoutines = await storageService.getAllRoutines();
      
      // Log all routine dates
      const allDates = allRoutines
        .map(r => r.date?.split('T')[0])
        .filter(Boolean)
        .sort();
      
      console.log('[HOOK DEBUG] All routine dates:', JSON.stringify(allDates));
      
      // Count routines by month for the current year
      const today = new Date();
      const currentYear = today.getFullYear();
      
      const routinesByMonth = Array(12).fill(0);
      
      allRoutines.forEach(routine => {
        if (routine.date) {
          const routineDate = new Date(routine.date);
          if (routineDate.getFullYear() === currentYear) {
            routinesByMonth[routineDate.getMonth()]++;
          }
        }
      });
      
      console.log(`[HOOK DEBUG] Routines by month for ${currentYear}:`, JSON.stringify(routinesByMonth));
      
      return allRoutines;
    } catch (error) {
      console.error('[HOOK ERROR] Error getting all routines:', error);
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