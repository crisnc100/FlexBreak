import * as storageService from '../../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_FREEZE_STORAGE_KEY = '@streak_freezes';
const MAX_STREAK_FREEZES = 3;

/**
 * Interface for streak freeze data
 */
interface StreakFreezeData {
  available: number;
  used: number;
  lastGranted: string | null;
  history: StreakFreezeUsage[];
}

/**
 * Interface for streak freeze usage entry
 */
interface StreakFreezeUsage {
  date: string;
  streakLength: number;
}

/**
 * Default streak freeze data
 */
const DEFAULT_STREAK_FREEZE_DATA: StreakFreezeData = {
  available: 0,
  used: 0,
  lastGranted: null,
  history: []
};

/**
 * Get streak freeze data from storage
 * @returns Streak freeze data
 */
export const getStreakFreezeData = async (): Promise<StreakFreezeData> => {
  try {
    const data = await AsyncStorage.getItem(STREAK_FREEZE_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Initialize with default data if none exists
    await AsyncStorage.setItem(
      STREAK_FREEZE_STORAGE_KEY,
      JSON.stringify(DEFAULT_STREAK_FREEZE_DATA)
    );
    return DEFAULT_STREAK_FREEZE_DATA;
  } catch (error) {
    console.error('Error getting streak freeze data:', error);
    return DEFAULT_STREAK_FREEZE_DATA;
  }
};

/**
 * Save streak freeze data to storage
 * @param data Streak freeze data to save
 * @returns Success status
 */
export const saveStreakFreezeData = async (data: StreakFreezeData): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(
      STREAK_FREEZE_STORAGE_KEY,
      JSON.stringify(data)
    );
    return true;
  } catch (error) {
    console.error('Error saving streak freeze data:', error);
    return false;
  }
};

/**
 * Grant a streak freeze to the user (called weekly)
 * @returns Updated streak freeze data
 */
export const grantStreakFreeze = async (): Promise<StreakFreezeData> => {
  const data = await getStreakFreezeData();
  
  // Check if we're already at the maximum
  if (data.available >= MAX_STREAK_FREEZES) {
    return data;
  }
  
  // Grant a new streak freeze
  const updatedData: StreakFreezeData = {
    ...data,
    available: data.available + 1,
    lastGranted: new Date().toISOString()
  };
  
  await saveStreakFreezeData(updatedData);
  return updatedData;
};

/**
 * Check and grant a weekly streak freeze if needed
 * @returns Updated streak freeze data
 */
export const checkAndGrantWeeklyStreakFreeze = async (): Promise<StreakFreezeData> => {
  const data = await getStreakFreezeData();
  
  // If already at max, no need to check
  if (data.available >= MAX_STREAK_FREEZES) {
    return data;
  }
  
  // Check if one week has passed since the last granted freeze
  if (data.lastGranted) {
    const lastGranted = new Date(data.lastGranted);
    const now = new Date();
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    
    if (now.getTime() - lastGranted.getTime() >= oneWeekInMs) {
      // One week has passed, grant a new streak freeze
      return await grantStreakFreeze();
    }
  } else {
    // No freezes granted yet, grant the first one
    return await grantStreakFreeze();
  }
  
  return data;
};

/**
 * Use a streak freeze to preserve a streak
 * @param currentStreak Current streak length
 * @returns Success status and updated streak freeze data
 */
export const useStreakFreeze = async (
  currentStreak: number
): Promise<{ success: boolean; data: StreakFreezeData }> => {
  const data = await getStreakFreezeData();
  
  // Check if any freezes are available
  if (data.available <= 0) {
    return { success: false, data };
  }
  
  // Use a streak freeze
  const updatedData: StreakFreezeData = {
    ...data,
    available: data.available - 1,
    used: data.used + 1,
    history: [
      ...data.history,
      {
        date: new Date().toISOString(),
        streakLength: currentStreak
      }
    ]
  };
  
  await saveStreakFreezeData(updatedData);
  return { success: true, data: updatedData };
};

/**
 * Check if a streak freeze should be auto-applied
 * (This would be called during the routine completion flow)
 * @param currentStreak Current streak length
 * @param missedYesterday Whether the user missed yesterday
 * @returns Whether a streak freeze was applied and updated data
 */
export const checkAndAutoUseStreakFreeze = async (
  currentStreak: number,
  missedYesterday: boolean
): Promise<{ applied: boolean; data: StreakFreezeData }> => {
  // Only apply if streak is broken
  if (!missedYesterday) {
    return { applied: false, data: await getStreakFreezeData() };
  }
  
  // Only apply if streak is significant (3+ days)
  if (currentStreak < 3) {
    return { applied: false, data: await getStreakFreezeData() };
  }
  
  // Try to use a streak freeze
  const { success, data } = await useStreakFreeze(currentStreak);
  return { applied: success, data };
}; 