import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ProgressEntry, RoutineParams, BodyArea, Duration } from '../types';
import { UserProgress } from '../utils/progress/types';
import { INITIAL_USER_PROGRESS } from '../utils/progress/constants';

// ========== STORAGE KEYS ==========
export const KEYS = {
  USER: {
    PREMIUM: '@user_premium',
    TESTING_PREMIUM: '@deskstretch:testing_premium_access',
  },
  PROGRESS: {
    USER_PROGRESS: '@user_progress',
    PROGRESS_ENTRIES: 'progress',
    PROGRESS_HISTORY: '@progress',
    HIDDEN_ROUTINES: '@hiddenRoutines',
  },
  ROUTINES: {
    FAVORITE_ROUTINES: '@favoriteRoutines',
    FAVORITES: 'favorites',
    RECENT: '@recentRoutines',
    ALL: '@allRoutines',
  },
  SETTINGS: {
    REMINDER_ENABLED: 'reminderEnabled',
    REMINDER_TIME: 'reminderTime',
    SHOW_DASHBOARD: '@shouldShowDashboard',
  },
  UI: {
    COMPLETED_CHALLENGES: '@completedChallenges',
    ACHIEVEMENTS: '@achievements',
    REWARDS: '@rewards',
    LAST_REFRESH_TIME: '@lastRefreshTime',
    SYNC_TIMESTAMP: '@syncTimestamp',
  },
  CUSTOM: {
    USER_SETTINGS: '@userSettings',
    CUSTOM_ROUTINES: '@customRoutines',
    ROUTINE_HISTORY: '@routineHistory',
  },
  USER_AGREEMENTS: {
    FITNESS_DISCLAIMER_ACCEPTED: 'fitness_disclaimer_accepted',
    NON_MEDICAL_NOTICE_SHOWN: 'non_medical_notice_shown',
  }
};

// ========== INITIAL STATE VALUES ==========
export const INITIAL_STATE = {
  USER_PROGRESS: { ...INITIAL_USER_PROGRESS },
  FAVORITES: [],
  RECENT_ROUTINES: [],
  SETTINGS: {
    reminderEnabled: false,
    reminderTime: null,
    showDashboard: false
  }
};

// ========== GENERIC STORAGE METHODS ==========

/**
 * Generic method to get data from AsyncStorage
 * @param key Storage key
 * @param defaultValue Default value if key doesn't exist
 * @returns The stored value or default value
 */
export const getData = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue === null) {
      return defaultValue;
    }
    return JSON.parse(jsonValue);
  } catch (error) {
    console.error(`Error getting data for key ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Generic method to set data in AsyncStorage
 * @param key Storage key
 * @param value Value to store
 * @returns Success boolean
 */
export const setData = async <T>(key: string, value: T): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`Error setting data for key ${key}:`, error);
    return false;
  }
};

/**
 * Generic method to remove data from AsyncStorage
 * @param key Storage key
 * @returns Success boolean
 */
export const removeData = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
    return false;
  }
};

/**
 * Get all keys in AsyncStorage
 * @returns Array of keys
 */
export const getAllKeys = async (): Promise<readonly string[]> => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('Error getting all keys:', error);
    return [];
  }
};

// ========== USER METHODS ==========

/**
 * Save premium status
 * @param isPremium Whether user has premium access
 * @returns Success boolean
 */
export const saveIsPremium = async (isPremium: boolean): Promise<boolean> => {
  console.log(`Saving premium status: ${isPremium}`);
  return setData(KEYS.USER.PREMIUM, isPremium);
};

/**
 * Get premium status, including testing premium if available
 * @returns Premium status boolean
 */
export const getIsPremium = async (): Promise<boolean> => {
  console.log('Getting premium status from AsyncStorage');
  try {
    // First check normal premium status
    const isPremium = await getData<boolean>(KEYS.USER.PREMIUM, false);
    
    // Then check testing premium status
    const testingPremium = await AsyncStorage.getItem(KEYS.USER.TESTING_PREMIUM);
    
    // User has premium if either regular premium or testing premium is active
    const hasPremium = isPremium || testingPremium === 'true';
    
    console.log(`Premium status: Regular=${isPremium}, Testing=${testingPremium === 'true'}, Combined=${hasPremium}`);
    return hasPremium;
  } catch (error) {
    console.error('Error getting premium status:', error);
    return false;
  }
};

// ========== PROGRESS METHODS ==========

/**
 * Get user progress data
 * @returns User progress object
 */
export const getUserProgress = async (): Promise<UserProgress> => {
  try {
    const progress = await getData<UserProgress>(
      KEYS.PROGRESS.USER_PROGRESS, 
      { ...INITIAL_USER_PROGRESS }
    );
    
    // Migrate progress if needed
    const migratedProgress = migrateUserProgress(progress);
    
    // If migration was performed, save the updated progress
    if (migratedProgress !== progress) {
      await saveUserProgress(migratedProgress);
    }
    
    console.log(`Retrieved user progress: Level ${migratedProgress.level}, XP: ${migratedProgress.totalXP}`);
    return migratedProgress;
  } catch (error) {
    console.error('Error retrieving user progress:', error);
    return { ...INITIAL_USER_PROGRESS };
  }
};

/**
 * Save user progress data
 * @param progress User progress object
 * @returns Success boolean
 */
export const saveUserProgress = async (progress: UserProgress): Promise<boolean> => {
  try {
    // Update the lastUpdated timestamp
    const updatedProgress = {
      ...progress,
      lastUpdated: new Date().toISOString()
    };
    
    const result = await setData(KEYS.PROGRESS.USER_PROGRESS, updatedProgress);
    console.log(`Saved user progress: Level ${progress.level}, XP: ${progress.totalXP}`);
    return result;
  } catch (error) {
    console.error('Error saving user progress:', error);
    return false;
  }
};

/**
 * Reset user progress to initial state
 * @returns Initial user progress
 */
export const resetUserProgress = async (): Promise<UserProgress> => {
  try {
    await removeData(KEYS.PROGRESS.USER_PROGRESS);
    console.log('User progress reset to initial state');
    return { ...INITIAL_USER_PROGRESS };
  } catch (error) {
    console.error('Error resetting user progress:', error);
    return { ...INITIAL_USER_PROGRESS };
  }
};

/**
 * Migrate user progress to the latest format if needed
 * @param progress The user progress to migrate
 * @returns The migrated user progress
 */
const migrateUserProgress = (progress: UserProgress): UserProgress => {
  const migratedProgress = { ...progress };
  
  // Ensure statistics object exists
  if (!migratedProgress.statistics) {
    migratedProgress.statistics = {
      totalRoutines: 0,
      currentStreak: 0,
      bestStreak: 0,
      uniqueAreas: [],
      totalMinutes: 0,
      routinesByArea: {},
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Ensure routinesByArea exists
  if (!migratedProgress.statistics.routinesByArea) {
    migratedProgress.statistics.routinesByArea = {};
  }
  
  // Ensure totalMinutes exists
  if (migratedProgress.statistics.totalMinutes === undefined) {
    migratedProgress.statistics.totalMinutes = 0;
  }
  
  // IMPORTANT: For existing users with routines, set the welcome bonus flag
  // This prevents users from getting a duplicate welcome bonus
  if (!migratedProgress.hasReceivedWelcomeBonus) {
    // If the user has any XP or completed routines, they should have the flag set to true
    if (migratedProgress.totalXP > 0 || migratedProgress.statistics.totalRoutines > 0) {
      console.log('Setting hasReceivedWelcomeBonus flag for existing user with XP or routines');
      migratedProgress.hasReceivedWelcomeBonus = true;
    } else {
      // New user, initialize the flag to false
      migratedProgress.hasReceivedWelcomeBonus = false;
    }
  }
  
  return migratedProgress;
};

// ========== ROUTINE METHODS ==========

/**
 * Get recent routines
 * @returns Array of recent routines
 */
export const getRecentRoutines = async (): Promise<ProgressEntry[]> => {
  try {
    const routines = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_HISTORY, []);
    // Filter out hidden routines
    const visibleRoutines = routines.filter(routine => !routine.hidden);
    console.log('Retrieved visible routines:', visibleRoutines.length);
    return visibleRoutines;
  } catch (error) {
    console.error('Error getting recent routines:', error);
    return [];
  }
};

/**
 * Get all routines (including hidden)
 * @returns Array of all routines
 */
export const getAllRoutines = async (): Promise<ProgressEntry[]> => {
  try {
    const allRoutines = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    console.log('Retrieved all routines:', allRoutines.length);
    return allRoutines;
  } catch (error) {
    console.error('Error getting all routines:', error);
    return [];
  }
};

/**
 * Save routine progress
 * @param entry Progress entry to save
 * @returns Success boolean
 */
export const saveRoutineProgress = async (entry: { 
  area: BodyArea; 
  duration: Duration; 
  date: string;
  stretchCount?: number;
}): Promise<boolean> => {
  try {
    console.log('Saving routine progress:', entry);
    
    // Get existing routines
    const existingRoutines = await getRecentRoutines();
    
    // Create new entry
    const newEntry: ProgressEntry = {
      area: entry.area,
      duration: entry.duration,
      date: entry.date,
      stretchCount: entry.stretchCount || 0
    };
    
    // Add to beginning of array
    const updatedRoutines = [newEntry, ...existingRoutines];
    
    // Save to storage for recent routines
    const saveRecentResult = await setData(KEYS.PROGRESS.PROGRESS_HISTORY, updatedRoutines);
    
    // Also save to progress key for statistics
    const allRoutines = await getAllRoutines();
    allRoutines.push(newEntry);
    const saveAllResult = await setData(KEYS.PROGRESS.PROGRESS_ENTRIES, allRoutines);
    
    return saveRecentResult && saveAllResult;
  } catch (error) {
    console.error('Error saving routine progress:', error);
    return false;
  }
};

/**
 * Save completed routine
 * @param routine Routine parameters
 * @param stretchCount Number of stretches completed
 * @returns Success boolean
 */
export const saveCompletedRoutine = async (
  routine: RoutineParams, 
  stretchCount: number = 0
): Promise<boolean> => {
  try {
    // Create progress entry
    const entry: ProgressEntry = {
      area: routine.area,
      duration: routine.duration,
      date: new Date().toISOString(),
      stretchCount: stretchCount
    };
    
    return await saveRoutineProgress(entry);
  } catch (error) {
    console.error('Error saving completed routine:', error);
    return false;
  }
};

/**
 * Hide a routine
 * @param routineDate Date of routine to hide
 * @returns Success boolean
 */
export const hideRoutine = async (routineDate: string): Promise<boolean> => {
  try {
    console.log('Hiding routine with date:', routineDate);
    
    // Get existing routines
    const existingRoutines = await getRecentRoutines();
    
    // Find the routine to hide
    const routineToHide = existingRoutines.find(routine => routine.date === routineDate);
    
    if (!routineToHide) {
      console.log('Routine not found, nothing to hide');
      return false;
    }
    
    // Remove from visible routines
    const updatedRoutines = existingRoutines.filter(
      routine => routine.date !== routineDate
    );
    
    // Save updated visible routines
    await setData(KEYS.PROGRESS.PROGRESS_HISTORY, updatedRoutines);
    
    // Add to hidden routines
    const hiddenRoutines = await getData<ProgressEntry[]>(KEYS.PROGRESS.HIDDEN_ROUTINES, []);
    
    // Mark the routine as hidden
    const hiddenRoutine = {
      ...routineToHide,
      hidden: true
    };
    
    hiddenRoutines.push(hiddenRoutine);
    await setData(KEYS.PROGRESS.HIDDEN_ROUTINES, hiddenRoutines);
    
    return true;
  } catch (error) {
    console.error('Error hiding routine:', error);
    return false;
  }
};

// ========== FAVORITES METHODS ==========

/**
 * Get favorite stretches
 * @returns Array of favorite stretch IDs
 */
export const getFavorites = async (): Promise<number[]> => {
  return getData<number[]>(KEYS.ROUTINES.FAVORITES, []);
};

/**
 * Save a stretch as favorite
 * @param stretchId ID of stretch to save
 * @returns Success boolean
 */
export const saveFavorite = async (stretchId: number): Promise<boolean> => {
  try {
    const favorites = await getFavorites();
    if (!favorites.includes(stretchId)) {
      favorites.push(stretchId);
      return await setData(KEYS.ROUTINES.FAVORITES, favorites);
    }
    return true;
  } catch (error) {
    console.error('Error saving favorite:', error);
    return false;
  }
};

/**
 * Remove a stretch from favorites
 * @param stretchId ID of stretch to remove
 * @returns Success boolean
 */
export const removeFavorite = async (stretchId: number): Promise<boolean> => {
  try {
    const favorites = await getFavorites();
    const updatedFavorites = favorites.filter(id => id !== stretchId);
    return await setData(KEYS.ROUTINES.FAVORITES, updatedFavorites);
  } catch (error) {
    console.error('Error removing favorite:', error);
    return false;
  }
};

/**
 * Save a routine to favorites
 * @param routine Routine to save
 * @returns Success boolean or object with status and message
 */
export const saveFavoriteRoutine = async (routine: { 
  name?: string; 
  area: BodyArea; 
  duration: Duration 
}): Promise<{success: boolean, limitReached?: boolean, message?: string}> => {
  try {
    console.log('Saving favorite routine:', routine);
    
    // Get existing favorites
    const favorites = await getData<any[]>(KEYS.ROUTINES.FAVORITE_ROUTINES, []);
    
    // Check if we've reached the maximum number of favorites (15)
    if (favorites.length >= 15) {
      console.log('Maximum number of favorites reached (15)');
      return {
        success: false,
        limitReached: true,
        message: 'You can save up to 15 favorite routines. Please remove some before adding more.'
      };
    }
    
    // Add new favorite
    const newFavorite = {
      ...routine,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    // Add to beginning of array
    const updatedFavorites = [newFavorite, ...favorites];
    
    // Save to storage
    const saveResult = await setData(KEYS.ROUTINES.FAVORITE_ROUTINES, updatedFavorites);
    
    return {
      success: saveResult,
      message: saveResult ? 'Routine saved to favorites!' : 'Failed to save routine'
    };
  } catch (error) {
    console.error('Error saving favorite routine:', error);
    return {
      success: false,
      message: 'An error occurred while saving the routine'
    };
  }
};

/**
 * Get favorite routines
 * @returns Array of favorite routines
 */
export const getFavoriteRoutines = async (): Promise<any[]> => {
  try {
    const favorites = await getData<any[]>(KEYS.ROUTINES.FAVORITE_ROUTINES, []);
    console.log(`Retrieved ${favorites.length} favorite routines`);
    return favorites;
  } catch (error) {
    console.error('Error getting favorite routines:', error);
    return [];
  }
};

/**
 * Delete a favorite routine by ID
 * @param routineId ID of the routine to delete
 * @returns Success boolean
 */
export const deleteFavoriteRoutine = async (routineId: string): Promise<boolean> => {
  try {
    // Get existing favorite routines
    const favorites = await getFavoriteRoutines();
    
    // Filter out the routine to delete
    const updatedFavorites = favorites.filter(routine => routine.id !== routineId);
    
    // If nothing was removed, return false
    if (updatedFavorites.length === favorites.length) {
      console.log('No favorite routine found with ID:', routineId);
      return false;
    }
    
    // Save updated favorites
    const success = await setData(KEYS.ROUTINES.FAVORITE_ROUTINES, updatedFavorites);
    console.log(`Deleted favorite routine with ID: ${routineId}, success: ${success}`);
    return success;
  } catch (error) {
    console.error('Error deleting favorite routine:', error);
    return false;
  }
};

// ========== SETTINGS METHODS ==========

/**
 * Save reminder enabled setting
 * @param enabled Whether reminders are enabled
 * @returns Success boolean
 */
export const saveReminderEnabled = async (enabled: boolean): Promise<boolean> => {
  return setData(KEYS.SETTINGS.REMINDER_ENABLED, enabled);
};

/**
 * Get reminder enabled setting
 * @returns Whether reminders are enabled
 */
export const getReminderEnabled = async (): Promise<boolean> => {
  return getData<boolean>(KEYS.SETTINGS.REMINDER_ENABLED, false);
};

/**
 * Save reminder time
 * @param time Time for reminders
 * @returns Success boolean
 */
export const saveReminderTime = async (time: string): Promise<boolean> => {
  return setData(KEYS.SETTINGS.REMINDER_TIME, time);
};

/**
 * Get reminder time
 * @returns Reminder time string or null
 */
export const getReminderTime = async (): Promise<string | null> => {
  try {
    // Direct AsyncStorage call for string value
    return await AsyncStorage.getItem(KEYS.SETTINGS.REMINDER_TIME);
  } catch (error) {
    console.error('Error getting reminder time:', error);
    return null;
  }
};

/**
 * Set dashboard display flag
 * @param value Whether to show dashboard
 * @returns Success boolean
 */
export const setDashboardFlag = async (value: boolean): Promise<boolean> => {
  return setData(KEYS.SETTINGS.SHOW_DASHBOARD, value);
};

/**
 * Get dashboard display flag
 * @returns Whether to show dashboard
 */
export const getDashboardFlag = async (): Promise<boolean> => {
  return getData<boolean>(KEYS.SETTINGS.SHOW_DASHBOARD, false);
};

// ========== DATA MANAGEMENT METHODS ==========

/**
 * Synchronize progress data between different storage keys
 * @returns Success boolean
 */
export const synchronizeProgressData = async (): Promise<boolean> => {
  try {
    console.log('Starting progress data synchronization...');
    
    // Get data from all storage locations
    const recentRoutinesData = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_HISTORY, []);
    const progressData = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    const hiddenRoutinesData = await getData<ProgressEntry[]>(KEYS.PROGRESS.HIDDEN_ROUTINES, []);
    
    console.log('Synchronizing data from multiple sources:');
    console.log('- Visible routines:', recentRoutinesData.length);
    console.log('- Progress data:', progressData.length);
    console.log('- Hidden routines:', hiddenRoutinesData.length);
    
    // Create a merged set of unique entries based on date
    const mergedEntries: { [key: string]: ProgressEntry } = {};
    
    // We'll process data in the following order to ensure precedence:
    // 1. Progress data (source of truth)
    // 2. Hidden routines (to maintain hidden status)
    // 3. Recent visible routines
    
    // First add entries from progress data (core source of truth)
    progressData.forEach((entry: ProgressEntry) => {
      if (entry.date) {
        mergedEntries[entry.date] = entry;
      }
    });
    
    // Then add entries from hidden routines (to maintain hidden status)
    hiddenRoutinesData.forEach((entry: ProgressEntry) => {
      if (entry.date) {
        if (!mergedEntries[entry.date]) {
          // If the entry doesn't exist in merged entries, add it
          mergedEntries[entry.date] = entry;
        } else {
          // If it exists, ensure hidden flag is preserved
          mergedEntries[entry.date] = {
            ...mergedEntries[entry.date],
            hidden: true
          };
        }
      }
    });
    
    // Finally add entries from visible routines (but don't overwrite hidden status)
    recentRoutinesData.forEach((entry: ProgressEntry) => {
      if (entry.date) {
        if (!mergedEntries[entry.date]) {
          // If entry doesn't exist, add it
          mergedEntries[entry.date] = entry;
        } else if (!mergedEntries[entry.date].hidden) {
          // If entry exists but isn't marked as hidden, update it
          // This preserves hidden status if it was set in hiddenRoutinesData
          mergedEntries[entry.date] = {
            ...entry,
            hidden: mergedEntries[entry.date].hidden || false
          };
        }
      }
    });
    
    // Convert back to arrays
    const mergedRoutines = Object.values(mergedEntries);
    
    // Sort by date (newest first)
    mergedRoutines.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Split into visible and hidden routines
    const visibleRoutines = mergedRoutines.filter(routine => !routine.hidden);
    const hiddenRoutines = mergedRoutines.filter(routine => routine.hidden);
    
    // Save synchronized data back to storage
    await setData(KEYS.PROGRESS.PROGRESS_HISTORY, visibleRoutines);
    await setData(KEYS.PROGRESS.HIDDEN_ROUTINES, hiddenRoutines);
    
    // Save ALL routines (both visible and hidden) to progress entries for statistics
    await setData(KEYS.PROGRESS.PROGRESS_ENTRIES, mergedRoutines);
    
    // Update timestamp of synchronization
    await setData(KEYS.UI.SYNC_TIMESTAMP, new Date().toISOString());
    
    console.log('Progress data synchronized successfully:');
    console.log('- Total entries:', mergedRoutines.length);
    console.log('- Visible entries:', visibleRoutines.length);
    console.log('- Hidden entries:', hiddenRoutines.length);
    
    return true;
  } catch (error) {
    console.error('Error synchronizing progress data:', error);
    return false;
  }
};

/**
 * Export user progress data to a file (for web platforms)
 * @param progress The user progress data to export
 */
export const exportUserProgress = (progress: UserProgress): void => {
  if (Platform.OS === 'web') {
    try {
      const jsonString = JSON.stringify(progress, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'deskstretch_progress.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('User progress exported successfully');
    } catch (error) {
      console.error('Error exporting user progress:', error);
    }
  } else {
    console.log('Export functionality is only available on web platform');
  }
};

/**
 * Clear all app data
 * @returns Success boolean
 */
export const clearAllData = async (): Promise<boolean> => {
  try {
    console.log('Starting to clear all app data...');
    
    // Get all known keys from our KEYS object
    const knownKeys = [
      ...Object.values(KEYS.USER),
      ...Object.values(KEYS.PROGRESS),
      ...Object.values(KEYS.ROUTINES),
      ...Object.values(KEYS.SETTINGS),
      ...Object.values(KEYS.UI),
      ...Object.values(KEYS.CUSTOM),
      ...Object.values(KEYS.USER_AGREEMENTS)
    ];
    
    // Explicitly add routine data keys to ensure they get cleared
    knownKeys.push(
      '@user_routines', 
      '@all_routines', 
      '@visible_routines',
      '@user_progress',
      '@gamification',
      '@achievements',
      '@challenges'
    );
    
    // Define testing-related keys to preserve
    const testingKeys = [
      '@deskstretch:testing_phase',
      '@deskstretch:testing_access',
      '@deskstretch:bob_simulator_access',
      '@deskstretch:testing_return_phase',
      '@deskstretch:simulator_scenario',
      '@deskstretch:testing_feedback',
      'testing_access_granted',
      'testing_current_stage',
      KEYS.USER.TESTING_PREMIUM // Preserve premium testing status
    ];
    
    // Get all keys from AsyncStorage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('All AsyncStorage keys found:', allKeys);
      
      // Merge with our known keys list
      const uniqueKeys = [...new Set([...knownKeys, ...allKeys])] as string[];
      
      // Filter out testing keys
      const keysToRemove = uniqueKeys.filter(key => !testingKeys.includes(key));
      
      // Clear all keys except testing keys
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('App data cleared successfully, preserving testing data. Cleared keys:', keysToRemove);
      
      // Additional check - verify data has been cleared
      const routines = await getAllRoutines();
      const progress = await getUserProgress();
      
      console.log('After clearing - routines length:', routines?.length || 0);
      console.log('After clearing - progress XP:', progress?.totalXP || 0);
    } catch (innerError) {
      // If getAllKeys fails, fall back to our predefined list
      console.warn('Error getting all keys, falling back to predefined list:', innerError);
      const keysToRemove = knownKeys.filter(key => !testingKeys.includes(key));
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('Cleared predefined keys (preserving testing data):', keysToRemove);
    }
    
    // Re-initialize user progress with defaults
    await initializeUserProgressIfEmpty();
    console.log('Re-initialized user progress with defaults');
    
    return true;
  } catch (e) {
    console.error('Error clearing app data:', e);
    return false;
  }
};

// ========== CUSTOM ROUTINES METHODS ==========

/**
 * Save a custom routine
 * @param routine Custom routine to save
 * @returns Success boolean
 */
export const saveCustomRoutine = async (routine: { 
  name: string; 
  area: BodyArea; 
  duration: Duration;
  customStretches?: { id: number }[];
}): Promise<boolean> => {
  try {
    console.log('Saving custom routine:', routine);
    
    // Get existing custom routines
    const customRoutines = await getCustomRoutines();
    
    // Add new custom routine
    const newRoutine = {
      ...routine,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    // Add to beginning of array
    const updatedRoutines = [newRoutine, ...customRoutines];
    
    // Save to storage
    return await setData(KEYS.CUSTOM.CUSTOM_ROUTINES, updatedRoutines);
  } catch (error) {
    console.error('Error saving custom routine:', error);
    return false;
  }
};

/**
 * Get all custom routines
 * @returns Array of custom routines
 */
export const getCustomRoutines = async (): Promise<any[]> => {
  return getData<any[]>(KEYS.CUSTOM.CUSTOM_ROUTINES, []);
};

/**
 * Delete a custom routine by ID
 * @param routineId ID of routine to delete
 * @returns Success boolean
 */
export const deleteCustomRoutine = async (routineId: string): Promise<boolean> => {
  try {
    // Get existing custom routines
    const customRoutines = await getCustomRoutines();
    
    // Remove the routine with the specified ID
    const updatedRoutines = customRoutines.filter(routine => routine.id !== routineId);
    
    // Save to storage
    return await setData(KEYS.CUSTOM.CUSTOM_ROUTINES, updatedRoutines);
  } catch (error) {
    console.error('Error deleting custom routine:', error);
    return false;
  }
};

/**
 * Initializes user progress data if it doesn't exist
 * @returns The initialized or existing user progress
 */
export const initializeUserProgressIfEmpty = async (): Promise<UserProgress> => {
  try {
    const progress = await getUserProgress();
    
    // If progress is empty or has no totalXP property, initialize it
    if (!progress || progress.totalXP === undefined) {
      console.log('User progress is empty, initializing with defaults');
      const defaultProgress = INITIAL_USER_PROGRESS;
      await saveUserProgress(defaultProgress);
      return defaultProgress;
    }
    
    return progress;
  } catch (error) {
    console.error('Error initializing user progress:', error);
    // Return default progress if there was an error
    return INITIAL_USER_PROGRESS;
  }
};

/**
 * Clear all saved routines but maintain other user data
 * @returns Success boolean
 */
export const clearRoutines = async (): Promise<boolean> => {
  try {
    console.log('Clearing all routines from storage...');
    
    // Clear routine data from storage
    await setData(KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    await setData(KEYS.PROGRESS.PROGRESS_HISTORY, []);
    
    // Verify the routines were cleared
    const routines = await getAllRoutines();
    console.log('After clearing - routines length:', routines?.length || 0);
    
    return true;
  } catch (error) {
    console.error('Error clearing routines:', error);
    return false;
  }
};

/**
 * Reset simulation data for testers
 * This is similar to clearAllData but with extra precautions to preserve tester status and premium access
 * @returns Success boolean
 */
export const resetSimulationData = async (): Promise<boolean> => {
  try {
    console.log('Starting to reset simulation data...');
    
    // First, backup premium and testing status
    const testingPremium = await AsyncStorage.getItem(KEYS.USER.TESTING_PREMIUM);
    const regularPremium = await getData<boolean>(KEYS.USER.PREMIUM, false);
    
    // Get all keys for simulation data
    const simulationKeys = [
      ...Object.values(KEYS.PROGRESS),
      ...Object.values(KEYS.ROUTINES),
      ...Object.values(KEYS.UI),
      '@user_routines', 
      '@all_routines', 
      '@visible_routines',
      '@user_progress',
      '@gamification',
      '@achievements',
      '@challenges'
    ];
    
    // Define keys to preserve (testing and premium related)
    const keysToPreserve = [
      KEYS.USER.PREMIUM,
      KEYS.USER.TESTING_PREMIUM,
      '@deskstretch:testing_phase',
      '@deskstretch:testing_access',
      '@deskstretch:bob_simulator_access',
      '@deskstretch:testing_return_phase',
      '@deskstretch:simulator_scenario',
      '@deskstretch:testing_feedback',
      '@deskstretch:testing_checklist_progress',
      '@deskstretch:testing_checklist_p2_progress',
      '@deskstretch:testing_feedback_submitted',
      'testing_access_granted',
      'testing_current_stage'
    ];
    
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter to get just the keys we want to remove (simulation data)
    const keysToRemove = allKeys.filter(key => 
      simulationKeys.includes(key) && !keysToPreserve.includes(key)
    );
    
    // Clear simulation keys except preserved ones
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('Simulation data cleared, preserving testing and premium status. Cleared keys:', keysToRemove);
    
    // Safety check - restore premium status if somehow lost
    if (testingPremium === 'true' || regularPremium) {
      await AsyncStorage.setItem(KEYS.USER.TESTING_PREMIUM, testingPremium || 'false');
      await setData(KEYS.USER.PREMIUM, regularPremium);
      console.log('Restored premium status:', { testingPremium, regularPremium });
    }
    
    // Re-initialize user progress with defaults
    await initializeUserProgressIfEmpty();
    console.log('Re-initialized user progress with defaults');
    
    return true;
  } catch (e) {
    console.error('Error resetting simulation data:', e);
    return false;
  }
}; 

