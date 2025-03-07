import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressEntry } from '../types';

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