import * as storageService from '../../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const XP_BOOST_STORAGE_KEY = '@xp_boost_data';
const XP_BOOST_MULTIPLIER = 2;
const XP_BOOST_DURATION_HOURS = 24; // 24 hours default duration

// Interface for XP Boost data
interface XpBoostData {
  active: boolean;
  startTime: string | null;
  endTime: string | null;
  multiplier: number;
}

// Default boost data
const DEFAULT_BOOST_DATA: XpBoostData = {
  active: false,
  startTime: null,
  endTime: null,
  multiplier: XP_BOOST_MULTIPLIER
};

/**
 * Get XP boost data from storage
 * @returns XP boost data
 */
export const getXpBoostData = async (): Promise<XpBoostData> => {
  try {
    const data = await AsyncStorage.getItem(XP_BOOST_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Initialize with default values if no data exists
    await AsyncStorage.setItem(XP_BOOST_STORAGE_KEY, JSON.stringify(DEFAULT_BOOST_DATA));
    return DEFAULT_BOOST_DATA;
  } catch (error) {
    console.error('Error getting XP boost data:', error);
    return DEFAULT_BOOST_DATA;
  }
};

/**
 * Save XP boost data to storage
 * @param data XP boost data
 * @returns Success status
 */
export const saveXpBoostData = async (data: XpBoostData): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(XP_BOOST_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving XP boost data:', error);
    return false;
  }
};

/**
 * Activate an XP boost
 * @param durationHours Duration in hours (defaults to 24)
 * @param multiplier XP multiplier (defaults to 2)
 * @returns Updated boost data
 */
export const activateXpBoost = async (
  durationHours = XP_BOOST_DURATION_HOURS,
  multiplier = XP_BOOST_MULTIPLIER
): Promise<XpBoostData> => {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000); // Convert hours to milliseconds
  
  const boostData: XpBoostData = {
    active: true,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    multiplier
  };
  
  await saveXpBoostData(boostData);
  return boostData;
};

/**
 * Deactivate the current XP boost
 * @returns Updated boost data
 */
export const deactivateXpBoost = async (): Promise<XpBoostData> => {
  const boostData: XpBoostData = {
    ...DEFAULT_BOOST_DATA
  };
  
  await saveXpBoostData(boostData);
  return boostData;
};

/**
 * Check if an XP boost is currently active
 * @returns Whether a boost is active and the current data
 */
export const checkXpBoostStatus = async (): Promise<{ isActive: boolean; data: XpBoostData }> => {
  const boostData = await getXpBoostData();
  
  // If not marked as active, return inactive
  if (!boostData.active) {
    return { isActive: false, data: boostData };
  }
  
  // Check if the boost has expired
  const now = new Date();
  const endTime = boostData.endTime ? new Date(boostData.endTime) : null;
  
  if (!endTime || now > endTime) {
    // Boost has expired, deactivate it
    const updatedData = await deactivateXpBoost();
    return { isActive: false, data: updatedData };
  }
  
  // Boost is active
  return { isActive: true, data: boostData };
};

/**
 * Get the current XP multiplier
 * @returns The current multiplier (1 if no boost is active)
 */
export const getCurrentXpMultiplier = async (): Promise<number> => {
  const { isActive, data } = await checkXpBoostStatus();
  return isActive ? data.multiplier : 1;
};

/**
 * Get the remaining time of the current XP boost in milliseconds
 * @returns Remaining time in milliseconds (0 if no boost is active)
 */
export const getXpBoostRemainingTime = async (): Promise<number> => {
  const { isActive, data } = await checkXpBoostStatus();
  
  if (!isActive || !data.endTime) {
    return 0;
  }
  
  const now = new Date();
  const endTime = new Date(data.endTime);
  const remainingTime = endTime.getTime() - now.getTime();
  
  return Math.max(0, remainingTime);
};

/**
 * Format remaining time in a human-readable format
 * @param remainingTimeMs Remaining time in milliseconds
 * @returns Formatted time string (e.g., "23h 59m")
 */
export const formatRemainingTime = (remainingTimeMs: number): string => {
  if (remainingTimeMs <= 0) {
    return '0h 0m';
  }
  
  const hours = Math.floor(remainingTimeMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingTimeMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}; 