import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressEntry, RoutineParams } from '../types';

// Premium status
export const saveIsPremium = async (isPremium: boolean) => {
  try {
    await AsyncStorage.setItem('isPremium', JSON.stringify(isPremium));
    return true;
  } catch (error) {
    console.error('Error saving premium status:', error);
    return false;
  }
};

export const getIsPremium = async () => {
  try {
    const value = await AsyncStorage.getItem('isPremium');
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('Error getting premium status:', error);
    return false;
  }
};

// Favorites
export const saveFavorite = async (stretchId: number) => {
  try {
    const favorites = await getFavorites();
    if (!favorites.includes(stretchId)) {
      favorites.push(stretchId);
      await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
    }
    return true;
  } catch (error) {
    console.error('Error saving favorite:', error);
    return false;
  }
};

export const removeFavorite = async (stretchId: number) => {
  try {
    const favorites = await getFavorites();
    const updatedFavorites = favorites.filter(id => id !== stretchId);
    await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    return true;
  } catch (error) {
    console.error('Error removing favorite:', error);
    return false;
  }
};

export const getFavorites = async (): Promise<number[]> => {
  try {
    const value = await AsyncStorage.getItem('favorites');
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

// Progress
export const saveProgress = async (entry: ProgressEntry) => {
  try {
    const progress = await getProgress();
    progress.push(entry);
    await AsyncStorage.setItem('progress', JSON.stringify(progress));
    return true;
  } catch (error) {
    console.error('Error saving progress:', error);
    return false;
  }
};

export const getProgress = async (): Promise<ProgressEntry[]> => {
  try {
    const value = await AsyncStorage.getItem('progress');
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Error getting progress:', error);
    return [];
  }
};

// Reminders
export const saveReminderEnabled = async (enabled: boolean) => {
  try {
    await AsyncStorage.setItem('reminderEnabled', JSON.stringify(enabled));
    return true;
  } catch (error) {
    console.error('Error saving reminder enabled:', error);
    return false;
  }
};

export const getReminderEnabled = async () => {
  try {
    const value = await AsyncStorage.getItem('reminderEnabled');
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('Error getting reminder enabled:', error);
    return false;
  }
};

export const saveReminderTime = async (time: string) => {
  try {
    await AsyncStorage.setItem('reminderTime', time);
    return true;
  } catch (error) {
    console.error('Error saving reminder time:', error);
    return false;
  }
};

export const getReminderTime = async () => {
  try {
    return await AsyncStorage.getItem('reminderTime');
  } catch (error) {
    console.error('Error getting reminder time:', error);
    return null;
  }
};

/**
 * Get recent routines from storage
 */
export const getRecentRoutines = async (): Promise<ProgressEntry[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem('@progress');
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return []; // Return empty array if no data
  } catch (e) {
    console.error('Error getting recent routines:', e);
    return []; // Return empty array on error
  }
};

/**
 * Save a routine to favorites
 */
export const saveFavoriteRoutine = async (routine: RoutineParams): Promise<boolean> => {
  try {
    // Get existing favorites
    const jsonValue = await AsyncStorage.getItem('@favoriteRoutines');
    let favorites = jsonValue !== null ? JSON.parse(jsonValue) : [];
    
    // Add new favorite with timestamp
    favorites.push({
      ...routine,
      timestamp: new Date().toISOString()
    });
    
    // Save back to storage
    await AsyncStorage.setItem('@favoriteRoutines', JSON.stringify(favorites));
    return true;
  } catch (e) {
    console.error('Error saving favorite routine:', e);
    return false;
  }
};

/**
 * Save a completed routine to progress history
 */
export const saveCompletedRoutine = async (routine: RoutineParams): Promise<boolean> => {
  try {
    // Create progress entry
    const entry: ProgressEntry = {
      area: routine.area,
      duration: routine.duration,
      date: new Date().toISOString(),
      stretchCount: 0, // This would normally be filled with actual count
    };
    
    // Save to progress
    await saveProgress(entry);
    
    // Also save to recent routines for the routine tab
    const recentRoutines = await getRecentRoutines();
    recentRoutines.unshift(entry); // Add to beginning of array
    
    // Save back to storage
    await AsyncStorage.setItem('@progress', JSON.stringify(recentRoutines));
    
    return true;
  } catch (e) {
    console.error('Error saving completed routine:', e);
    return false;
  }
};

/**
 * Clear all app data (for testing purposes)
 */
export const clearAllData = async (): Promise<boolean> => {
  try {
    // List of all keys used in the app
    const keys = [
      'isPremium',
      'favorites',
      'progress',
      'reminderEnabled',
      'reminderTime',
      '@progress',
      '@favoriteRoutines'
    ];
    
    // Clear all keys
    await AsyncStorage.multiRemove(keys);
    console.log('All app data cleared successfully');
    return true;
  } catch (e) {
    console.error('Error clearing app data:', e);
    return false;
  }
}; 