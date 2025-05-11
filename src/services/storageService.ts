import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ProgressEntry, RoutineParams, BodyArea, Duration, StretchLevel } from '../types';
import { UserProgress } from '../utils/progress/types';
import { INITIAL_USER_PROGRESS } from '../utils/progress/constants';
import { streakEvents, STREAK_UPDATED_EVENT } from '../utils/progress/modules/streakManager';
// ========== STORAGE KEYS ==========
export const KEYS = {
  USER: {
    PREMIUM: '@user_premium',
    TESTING_PREMIUM: '@flexbreak:testing_premium_access',
    SUBSCRIPTION_DETAILS: '@user_subscription_details',
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
  return setData(KEYS.USER.PREMIUM, isPremium);
};

/**
 * Get premium status, including testing premium if available
 * @returns Premium status boolean
 */
export const getIsPremium = async (): Promise<boolean> => {
  try {
    // FORCE CHECK ALL POSSIBLE PREMIUM KEYS DIRECTLY
    const directKeys = [
      KEYS.USER.PREMIUM,
      KEYS.USER.TESTING_PREMIUM,
      '@flexbreak:testing_premium_access',
      '@user_premium',
      '@premium',
      '@isPremium',
      '@premium_access',
      'premium_status',
      'isPremium',
      'premium_access',
      'premiumAccess',
      'premium_unlocked',
      'premium_user'
    ];
    
    // First check normal premium status
    const isPremium = await getData<boolean>(KEYS.USER.PREMIUM, false);
    
    // Then check testing premium status (direct access, not through getData)
    const testingPremium = await AsyncStorage.getItem(KEYS.USER.TESTING_PREMIUM);
    const testingPremiumAccess = await AsyncStorage.getItem('@flexbreak:testing_premium_access');
    
    // User has premium if ANY premium flag is true
    const hasPremium = 
      isPremium || 
      testingPremium === 'true' || 
      testingPremiumAccess === 'true';
    
    return hasPremium;
  } catch (error) {
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
    
    return migratedProgress;
  } catch (error) {
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
    return result;
  } catch (error) {
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
    return { ...INITIAL_USER_PROGRESS };
  } catch (error) {
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
      migratedProgress.hasReceivedWelcomeBonus = true;
    } else {
      // New user, initialize the flag to false
      migratedProgress.hasReceivedWelcomeBonus = false;
    }
  }
  
  return migratedProgress;
};

// ========== ROUTINE METHODS ==========

// Debug helper function for timezone logging
const logTimezone = (functionName: string, message: string) => {
  console.log(`[STORAGE TIMEZONE DEBUG] ${functionName} - ${message}`);
};

/**
 * Get recent routines
 * @returns Array of recent routines
 */
export const getRecentRoutines = async (): Promise<ProgressEntry[]> => {
  try {
    logTimezone('getRecentRoutines', `Current date/time: ${new Date().toISOString()}`);
    logTimezone('getRecentRoutines', `Local time components: Y=${new Date().getFullYear()} M=${new Date().getMonth()+1} D=${new Date().getDate()}`);
    logTimezone('getRecentRoutines', `Timezone offset: ${new Date().getTimezoneOffset() / -60}h`);
    
    const routines = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_HISTORY, []);
    logTimezone('getRecentRoutines', `Found ${routines.length} total routines`);
    
    if (routines.length > 0) {
      logTimezone('getRecentRoutines', `First routine date: ${routines[0].date}`);
      
      // Check date parsing
      const firstDate = new Date(routines[0].date);
      logTimezone('getRecentRoutines', `First routine parsed ISO: ${firstDate.toISOString()}`);
      logTimezone('getRecentRoutines', `First routine local components: Y=${firstDate.getFullYear()} M=${firstDate.getMonth()+1} D=${firstDate.getDate()}`);
    }
    
    // Filter out hidden routines
    const visibleRoutines = routines.filter(routine => !routine.hidden);
    logTimezone('getRecentRoutines', `Returning ${visibleRoutines.length} visible routines`);
    
    return visibleRoutines;
  } catch (error) {
    logTimezone('getRecentRoutines', `Error: ${error}`);
    return [];
  }
};

/**
 * Get all routines (including hidden)
 * @returns Array of all routines
 */
export const getAllRoutines = async (): Promise<ProgressEntry[]> => {
  try {
    logTimezone('getAllRoutines', `Current date/time: ${new Date().toISOString()}`);
    
    const allRoutines = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    logTimezone('getAllRoutines', `Found ${allRoutines.length} total routines`);
    
    if (allRoutines.length > 0) {
      // Log sorted dates to help debug streak calculation issues
      const sortedDates = [...allRoutines]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(r => r.date);
      
      logTimezone('getAllRoutines', `First few sorted dates: ${sortedDates.slice(0, 5).join(', ')}`);
      
      // Check date parsing for the most recent routine
      if (sortedDates.length > 0) {
        const mostRecentDate = new Date(sortedDates[0]);
        logTimezone('getAllRoutines', `Most recent date parsed: ${mostRecentDate.toISOString()}`);
        logTimezone('getAllRoutines', `Most recent local components: Y=${mostRecentDate.getFullYear()} M=${mostRecentDate.getMonth()+1} D=${mostRecentDate.getDate()}`);
      }
    }
    
    return allRoutines;
  } catch (error) {
    logTimezone('getAllRoutines', `Error: ${error}`);
    return [];
  }
};

/**
 * Save routine progress
 * @param entry Progress entry to save
 * @returns Success boolean
 */
export const saveRoutineProgress = async (entry: ProgressEntry): Promise<boolean> => {
  try {
    logTimezone('saveRoutineProgress', `Current date/time: ${new Date().toISOString()}`);
    logTimezone('saveRoutineProgress', `Entry date: ${entry.date}`);
    
    // Parse and log entry date for debugging
    const entryDate = new Date(entry.date);
    logTimezone('saveRoutineProgress', `Entry date parsed: ${entryDate.toISOString()}`);
    logTimezone('saveRoutineProgress', `Entry local components: Y=${entryDate.getFullYear()} M=${entryDate.getMonth()+1} D=${entryDate.getDate()}`);
    
    // Get existing routines
    const existingRoutines = await getRecentRoutines();
    
    // Add to beginning of array
    const updatedRoutines = [entry, ...existingRoutines];
    
    // Limit to 20 most recent routines to prevent excessive growth
    const limitedRoutines = updatedRoutines.slice(0, 20);
    
    // Save to storage for recent routines
    const saveRecentResult = await setData(KEYS.PROGRESS.PROGRESS_HISTORY, limitedRoutines);
    
    // Also save to progress key for statistics
    const allRoutines = await getAllRoutines();
    allRoutines.push(entry);
    const saveAllResult = await setData(KEYS.PROGRESS.PROGRESS_ENTRIES, allRoutines);
    
    streakEvents.emit(STREAK_UPDATED_EVENT);    
    return saveRecentResult && saveAllResult;
  } catch (error) {
    logTimezone('saveRoutineProgress', `Error: ${error}`);
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
    logTimezone('saveCompletedRoutine', `Current date/time: ${new Date().toISOString()}`);
    
    // Create progress entry
    const now = new Date();
    const formattedDate = now.toISOString();
    const cleanDate = formattedDate.split('T')[0];
    
    logTimezone('saveCompletedRoutine', `Formatted date: ${formattedDate}`);
    logTimezone('saveCompletedRoutine', `Clean date: ${cleanDate}`);
    logTimezone('saveCompletedRoutine', `Local components: Y=${now.getFullYear()} M=${now.getMonth()+1} D=${now.getDate()}`);
    
    const entry: ProgressEntry = {
      area: routine.area,
      duration: routine.duration,
      date: formattedDate,
      stretchCount: stretchCount,
      level: routine.level,
      savedStretches: routine.customStretches || []
    };
    
    return await saveRoutineProgress(entry);
  } catch (error) {
    logTimezone('saveCompletedRoutine', `Error: ${error}`);
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
    // Get existing routines
    const existingRoutines = await getRecentRoutines();
    
    // Find the routine to hide
    const routineToHide = existingRoutines.find(routine => routine.date === routineDate);
    
    if (!routineToHide) {
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
  duration: Duration,
  level?: StretchLevel,
  savedStretches?: any[]
}): Promise<{success: boolean, limitReached?: boolean, message?: string}> => {
  try {
    // Get existing favorites
    const favorites = await getData<any[]>(KEYS.ROUTINES.FAVORITE_ROUTINES, []);
    
    // Check if we've reached the maximum number of favorites (15)
    if (favorites.length >= 15) {
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
    return favorites;
  } catch (error) {
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
      return false;
    }
    
    // Save updated favorites
    const success = await setData(KEYS.ROUTINES.FAVORITE_ROUTINES, updatedFavorites);
    return success;
  } catch (error) {
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
    // Get data from all storage locations
    const recentRoutinesData = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_HISTORY, []);
    const progressData = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    const hiddenRoutinesData = await getData<ProgressEntry[]>(KEYS.PROGRESS.HIDDEN_ROUTINES, []);
    
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
    
    return true;
  } catch (error) {
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
      a.download = 'flexbreak_progress.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
    }
  } else {
  }
};

/**
 * Clear all app data
 * @param resetTestingData Optional parameter to also clear testing-related data
 * @returns Success boolean
 */
export const clearAllData = async (resetTestingData: boolean = false): Promise<boolean> => {
  try {
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
      '@flexbreak:testing_phase',
      '@flexbreak:testing_access',
      '@flexbreak:bob_simulator_access',
      '@flexbreak:testing_return_phase',
      '@flexbreak:simulator_scenario',
      '@flexbreak:testing_feedback',
      'testing_access_granted',
      'testing_current_stage',
    ];
    
    // Explicitly ensure premium keys are included for removal
    const premiumKeys = [
      KEYS.USER.PREMIUM,
      KEYS.USER.TESTING_PREMIUM,
      '@flexbreak:testing_premium_access',
      '@user_premium',
      '@premium',
      '@isPremium'
    ];
    
    // Add premium keys to known keys to ensure they get cleared
    knownKeys.push(...premiumKeys);
    
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Merge with our known keys list
    const uniqueKeys = [...new Set([...knownKeys, ...allKeys])] as string[];
    
    // Filter out testing keys if needed
    const keysToRemove = resetTestingData 
      ? uniqueKeys 
      : uniqueKeys.filter(key => !testingKeys.includes(key));
    
    // Remove the keys in batches to avoid potential issues
    await AsyncStorage.multiRemove(keysToRemove);
    
    // If testing data was preserved, restore basic testing access
    if (!resetTestingData) {
      await restoreTestingAccess();
    }
    
    // Explicitly clear premium status to ensure it's reset
    await AsyncStorage.setItem(KEYS.USER.PREMIUM, 'false');
    await AsyncStorage.setItem(KEYS.USER.TESTING_PREMIUM, 'false');
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Restore basic testing access after a complete reset
 * This ensures the user can still access testing features
 */
export const restoreTestingAccess = async (): Promise<void> => {
  try {
    // Set minimum testing keys to ensure access
    await AsyncStorage.setItem('@flexbreak:testing_access', 'true');
    await AsyncStorage.setItem('@flexbreak:testing_phase', '1');
  } catch (error) {
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
  customStretches?: { id: number | string; isRest?: boolean; bilateral?: boolean; }[];
}): Promise<boolean> => {
  try {
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
      const defaultProgress = INITIAL_USER_PROGRESS;
      await saveUserProgress(defaultProgress);
      return defaultProgress;
    }
    
    return progress;
  } catch (error) {
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
    // Clear routine data from storage
    await setData(KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    await setData(KEYS.PROGRESS.PROGRESS_HISTORY, []);
    
    // Verify the routines were cleared
    const routines = await getAllRoutines();
    
    return true;
  } catch (error) {
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
      '@flexbreak:testing_phase',
      '@flexbreak:testing_access',
      '@flexbreak:bob_simulator_access',
      '@flexbreak:testing_return_phase',
      '@flexbreak:simulator_scenario',
      '@flexbreak:testing_feedback',
      '@flexbreak:testing_checklist_progress',
      '@flexbreak:testing_checklist_p2_progress',
      '@flexbreak:testing_feedback_submitted',
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
    
    // Safety check - restore premium status if somehow lost
    if (testingPremium === 'true' || regularPremium) {
      await AsyncStorage.setItem(KEYS.USER.TESTING_PREMIUM, testingPremium || 'false');
      await setData(KEYS.USER.PREMIUM, regularPremium);
    }
    
    // Re-initialize user progress with defaults
    await initializeUserProgressIfEmpty();
    
    // Additionally, clear custom reminder messages from all possible storage locations
    await AsyncStorage.removeItem('@flexbreak:custom_reminder_message');
    await AsyncStorage.removeItem('reminder_message');
    await AsyncStorage.removeItem('firebase_reminder_message');
    
    console.log('Simulation data reset and custom reminder messages cleared');
    
    return true;
  } catch (e) {
    console.error('Error resetting simulation data:', e);
    return false;
  }
};

/**
 * Aggressively clear all premium status from any possible location
 * @returns Whether the premium status was successfully cleared
 */
export const clearAllPremiumStatus = async (): Promise<boolean> => {
  // Define all possible premium-related keys that might exist
  const premiumKeys = [
    KEYS.USER.PREMIUM,
    KEYS.USER.TESTING_PREMIUM,
    '@flexbreak:testing_premium_access',
    '@user_premium',
    '@premium',
    '@isPremium',
    '@premium_access',
    'premium_status',
    'isPremium',
    'premium_access',
    'premiumAccess',
    'premium_unlocked',
    'premium_user'
  ];
  
  try {
    // First get current status for debugging
    for (const key of premiumKeys) {
      const value = await AsyncStorage.getItem(key);
    }
    
    // Different removal techniques
    
    // Method 1: Direct removal
    for (const key of premiumKeys) {
      await AsyncStorage.removeItem(key);
    }
    
    // Method 2: Set to false then remove
    for (const key of premiumKeys) {
      await AsyncStorage.setItem(key, 'false');
      await AsyncStorage.removeItem(key);
    }
    
    // Method 3: Use multiRemove
    await AsyncStorage.multiRemove(premiumKeys);
    
    // Verification after all methods
    let stillExists = false;
    for (const key of premiumKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value !== null && value !== '') {
        stillExists = true;
      }
    }
    
    if (stillExists) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    return false;
  }
};

// ========== SUBSCRIPTION MANAGEMENT ==========

/**
 * Save subscription details to storage
 * @param details Subscription details object
 * @returns Success boolean
 */
export const saveSubscriptionDetails = async (details: {
  productId: string;
  purchaseDate: string;
  expiryDate?: string;
  isActive: boolean;
  autoRenewing?: boolean;
  platform: 'ios' | 'android';
  purchaseToken?: string;
}): Promise<boolean> => {
  try {
    return await setData(KEYS.USER.SUBSCRIPTION_DETAILS, details);
  } catch (error) {
    return false;
  }
};

/**
 * Get current subscription details
 * @returns Subscription details or null if not found
 */
export const getSubscriptionDetails = async (): Promise<any | null> => {
  try {
    return await getData(KEYS.USER.SUBSCRIPTION_DETAILS, null);
  } catch (error) {
    return null;
  }
};

/**
 * Clear subscription details (used when subscription is canceled)
 * @returns Success boolean
 */
export const clearSubscriptionDetails = async (): Promise<boolean> => {
  try {
    // Clear subscription details
    await removeData(KEYS.USER.SUBSCRIPTION_DETAILS);
    // Also update premium status
    await saveIsPremium(false);
    return true;
  } catch (error) {
    return false;
  }
}; 

