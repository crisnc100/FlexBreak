import * as storageService from '../../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const XP_BOOST_STORAGE_KEY = '@xp_boost_data';
const XP_BOOST_MULTIPLIER = 2;
const XP_BOOST_DURATION_HOURS = 72; // Updated to 72 hours (3 days)

// Interface for XP Boost data
interface XpBoostData {
  active: boolean;
  startTime: string | null;
  endTime: string | null;
  multiplier: number;
  availableBoosts: number; // Track available boost stacks
}

// Default boost data
const DEFAULT_BOOST_DATA: XpBoostData = {
  active: false,
  startTime: null,
  endTime: null,
  multiplier: XP_BOOST_MULTIPLIER,
  availableBoosts: 0
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
 * Get the number of available XP boost stacks
 * @returns Number of available boost stacks
 */
export const getAvailableBoosts = async (): Promise<number> => {
  const boostData = await getXpBoostData();
  return boostData.availableBoosts;
};

/**
 * Add XP boost stacks to the user's account
 * @param count Number of boost stacks to add
 * @returns Updated boost data
 */
export const addXpBoosts = async (count: number): Promise<XpBoostData> => {
  const boostData = await getXpBoostData();
  
  const updatedData = {
    ...boostData,
    availableBoosts: boostData.availableBoosts + count
  };
  
  await saveXpBoostData(updatedData);
  console.log(`Added ${count} XP boost stack(s). Total available: ${updatedData.availableBoosts}`);
  
  return updatedData;
};

/**
 * Check if the XP boost reward is unlocked and ensure boosts are granted
 * This helps recover if there was any issue during the reward unlocking process
 * @returns Updated boost data
 */
export const validateXpBoostReward = async (): Promise<{ 
  isUnlocked: boolean; 
  boostsAdded: number; 
  data: XpBoostData 
}> => {
  try {
    // Get user progress to check if the XP boost reward is unlocked
    const userProgress = await storageService.getUserProgress();
    const xpBoostReward = userProgress.rewards?.xp_boost;
    
    // Get current boost data
    const boostData = await getXpBoostData();
    
    // If the reward isn't unlocked, nothing to do
    if (!xpBoostReward || !xpBoostReward.unlocked) {
      return { isUnlocked: false, boostsAdded: 0, data: boostData };
    }
    
    // If the reward is unlocked but there are no boosts available and none active,
    // this might indicate the boosts weren't properly granted when unlocked
    if (boostData.availableBoosts === 0 && !boostData.active) {
      console.log('XP Boost reward is unlocked but no boosts available - adding 2 initial boosts');
      const updatedData = await addXpBoosts(2);
      return { isUnlocked: true, boostsAdded: 2, data: updatedData };
    }
    
    return { isUnlocked: true, boostsAdded: 0, data: boostData };
  } catch (error) {
    console.error('Error validating XP boost reward:', error);
    return { isUnlocked: false, boostsAdded: 0, data: await getXpBoostData() };
  }
};

/**
 * Activate an XP boost
 * @param durationHours Duration in hours (defaults to 72)
 * @param multiplier XP multiplier (defaults to 2)
 * @returns Result of activation attempt
 */
export const activateXpBoost = async (
  durationHours = XP_BOOST_DURATION_HOURS,
  multiplier = XP_BOOST_MULTIPLIER
): Promise<{ success: boolean; data: XpBoostData; message: string }> => {
  // Check if a boost is already active
  const { isActive } = await checkXpBoostStatus();
  if (isActive) {
    return { 
      success: false, 
      data: await getXpBoostData(),
      message: "An XP boost is already active."
    };
  }
  
  // Validate the XP boost reward before activating
  await validateXpBoostReward();
  
  // Check if user has available boosts
  const boostData = await getXpBoostData();
  if (boostData.availableBoosts <= 0) {
    return { 
      success: false, 
      data: boostData,
      message: "No XP boosts available."
    };
  }
  
  // Consume a boost stack
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
  
  const updatedBoostData: XpBoostData = {
    ...boostData,
    active: true,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    multiplier,
    availableBoosts: boostData.availableBoosts - 1
  };
  
  await saveXpBoostData(updatedBoostData);
  console.log(`XP Boost activated! ${multiplier}x XP for ${durationHours} hours. Remaining boosts: ${updatedBoostData.availableBoosts}`);
  
  return { 
    success: true, 
    data: updatedBoostData,
    message: `XP Boost activated! You now earn ${multiplier}x XP for ${durationHours} hours.`
  };
};

/**
 * Deactivate the current XP boost
 * @returns Updated boost data
 */
export const deactivateXpBoost = async (): Promise<XpBoostData> => {
  const boostData = await getXpBoostData();
  
  const updatedData = {
    ...boostData,
    active: false,
    startTime: null,
    endTime: null
  };
  
  await saveXpBoostData(updatedData);
  return updatedData;
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