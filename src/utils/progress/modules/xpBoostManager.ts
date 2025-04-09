import * as storageService from '../../../services/storageService';
import { UserProgress } from '../types';
import * as dateUtils from './utils/dateUtils';
import * as soundEffects from '../../../utils/soundEffects';

// Constants
const XP_BOOST_REWARD_ID = 'xp_boost';
const DEFAULT_BOOST_MULTIPLIER = 2;
const DEFAULT_BOOST_DURATION_HOURS = 72; // 3 days (72 hours)

/**
 * Check if an XP boost is currently active
 */
export const checkXpBoostStatus = async (): Promise<{ 
  isActive: boolean, 
  data: {
    multiplier: number,
    expiresAt: string | null,
    timeRemaining: number | null
  } 
}> => {
  const userProgress = await storageService.getUserProgress();
  
  // Default return data
  const returnData = {
    isActive: false,
    data: {
      multiplier: 1,
      expiresAt: null,
      timeRemaining: null
    }
  };
  
  // Check if boost exists
  if (
    !userProgress.rewards || 
    !userProgress.rewards[XP_BOOST_REWARD_ID] || 
    !userProgress.rewards[XP_BOOST_REWARD_ID].unlocked
  ) {
    return returnData;
  }
  
  // Check for active boost in extended data
  const boostReward = userProgress.rewards[XP_BOOST_REWARD_ID] as any;
  
  if (!boostReward.xpBoostExpiry) {
    return returnData;
  }
  
  const expiryDate = new Date(boostReward.xpBoostExpiry);
  const now = new Date();
  
  // Check if boost is still active
  if (expiryDate > now) {
    const timeRemainingMs = expiryDate.getTime() - now.getTime();
    const hoursRemaining = Math.floor(timeRemainingMs / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`XP Boost active! Expires in ${hoursRemaining}h ${minutesRemaining}m`);
    
    return {
      isActive: true,
      data: {
        multiplier: boostReward.xpBoostMultiplier || DEFAULT_BOOST_MULTIPLIER,
        expiresAt: boostReward.xpBoostExpiry,
        timeRemaining: timeRemainingMs
      }
    };
  } else {
    console.log('XP Boost expired');
    
    // Clean up expired boost
    delete boostReward.xpBoostExpiry;
    delete boostReward.xpBoostMultiplier;
    await storageService.saveUserProgress(userProgress);
    
    return returnData;
  }
};

/**
 * Activate an XP boost
 */
export const activateXpBoost = async (
  hours: number = DEFAULT_BOOST_DURATION_HOURS, 
  multiplier: number = DEFAULT_BOOST_MULTIPLIER
): Promise<{ success: boolean; message: string }> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if reward exists and is unlocked
  if (
    !userProgress.rewards || 
    !userProgress.rewards[XP_BOOST_REWARD_ID] || 
    !userProgress.rewards[XP_BOOST_REWARD_ID].unlocked
  ) {
    console.log('XP Boost reward not available');
    return { success: false, message: "XP Boost reward not available" };
  }
  
  // Check if user has boosts available
  const boostReward = userProgress.rewards[XP_BOOST_REWARD_ID] as any;
  
  if (!boostReward.uses || boostReward.uses <= 0) {
    console.log('No XP Boosts available to use');
    return { success: false, message: "No XP Boosts available" };
  }
  
  // Check if a boost is already active
  const { isActive, data } = await checkXpBoostStatus();
  
  if (isActive) {
    // Extend existing boost
    const currentExpiry = new Date(data.expiresAt!);
    const newExpiry = new Date(currentExpiry.getTime() + hours * 60 * 60 * 1000);
    
    boostReward.xpBoostExpiry = newExpiry.toISOString();
    boostReward.xpBoostMultiplier = Math.max(data.multiplier, multiplier);
    
    console.log(`Extended XP Boost to ${dateUtils.toDateString(newExpiry)} (${hours} hours added)`);
  } else {
    // Activate new boost
    const expiry = new Date();
    expiry.setTime(expiry.getTime() + hours * 60 * 60 * 1000);
    
    boostReward.xpBoostExpiry = expiry.toISOString();
    boostReward.xpBoostMultiplier = multiplier;
    
    console.log(`Activated XP Boost until ${dateUtils.toDateString(expiry)} (${hours} hours)`);
  }
  
  // Consume one use
  boostReward.uses -= 1;
  console.log(`Used 1 XP Boost. ${boostReward.uses} remaining.`);
  
  // Save updated progress
  await storageService.saveUserProgress(userProgress);
  
  // Play XP boost sound
  await soundEffects.playXpBoostSound();
  
  return { 
    success: true, 
    message: isActive 
      ? `XP Boost extended! Duration: ${hours} hours added.` 
      : `XP Boost activated! All XP earned is now doubled for ${hours} hours.` 
  };
};

/**
 * Deactivate an active XP boost
 */
export const deactivateXpBoost = async (): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if boost exists
  if (
    !userProgress.rewards || 
    !userProgress.rewards[XP_BOOST_REWARD_ID] || 
    !userProgress.rewards[XP_BOOST_REWARD_ID].unlocked
  ) {
    return false;
  }
  
  const boostReward = userProgress.rewards[XP_BOOST_REWARD_ID] as any;
  
  // Clean up boost data
  delete boostReward.xpBoostExpiry;
  delete boostReward.xpBoostMultiplier;
  
  // Save updated progress
  await storageService.saveUserProgress(userProgress);
  
  console.log('XP Boost deactivated');
  return true;
};

/**
 * Get the current XP multiplier (1 if no boost active)
 */
export const getCurrentXpMultiplier = async (): Promise<number> => {
  const { isActive, data } = await checkXpBoostStatus();
  return isActive ? data.multiplier : 1;
};

/**
 * Get the number of available XP boost stacks
 * @returns Number of available boost stacks
 */
export const getAvailableBoosts = async (): Promise<number> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if reward exists and is unlocked
  if (
    !userProgress.rewards || 
    !userProgress.rewards[XP_BOOST_REWARD_ID] || 
    !userProgress.rewards[XP_BOOST_REWARD_ID].unlocked
  ) {
    return 0;
  }
  
  const boostReward = userProgress.rewards[XP_BOOST_REWARD_ID] as any;
  return boostReward.uses || 0;
};

/**
 * Add XP boosts to the user's inventory
 */
export const addXpBoosts = async (amount: number): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if reward exists and is unlocked
  if (
    !userProgress.rewards || 
    !userProgress.rewards[XP_BOOST_REWARD_ID] || 
    !userProgress.rewards[XP_BOOST_REWARD_ID].unlocked
  ) {
    console.log('XP Boost reward not available');
    return false;
  }
  
  const boostReward = userProgress.rewards[XP_BOOST_REWARD_ID] as any;
  
  // Add XP boosts
  boostReward.uses = (boostReward.uses || 0) + amount;
  boostReward.lastRefill = new Date().toISOString();
  
  console.log(`Added ${amount} XP boost(s). Now has ${boostReward.uses} total.`);
  
  // Save updated progress
  await storageService.saveUserProgress(userProgress);
  
  return true;
};

/**
 * Get the remaining time for an active XP boost
 */
export const getRemainingXpBoostTime = async (): Promise<number> => {
  const { isActive, data } = await checkXpBoostStatus();
  
  if (!isActive || !data.timeRemaining) {
    return 0;
  }
  
  return data.timeRemaining;
};

/**
 * Format remaining time in a human-readable format
 */
export const formatRemainingTime = (remainingTimeMs: number): string => {
  const hours = Math.floor(remainingTimeMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingTimeMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};

/**
 * Check if the XP boost reward is unlocked and ensure boosts are granted
 * This helps recover if there was any issue during the reward unlocking process
 */
export const validateXpBoostReward = async (): Promise<{ 
  isUnlocked: boolean; 
  boostsAdded: number; 
}> => {
  try {
    // Get user progress to check if the XP boost reward is unlocked
    const userProgress = await storageService.getUserProgress();
    const xpBoostReward = userProgress.rewards?.[XP_BOOST_REWARD_ID];
    
    // If the reward isn't unlocked, nothing to do
    if (!xpBoostReward || !xpBoostReward.unlocked) {
      return { isUnlocked: false, boostsAdded: 0 };
    }
    
    // Cast to the extended reward with uses property
    const extendedReward = xpBoostReward as any;
    
    // If the reward is unlocked but there are no boosts available and none active,
    // this might indicate the boosts weren't properly granted when unlocked
    const { isActive } = await checkXpBoostStatus();
    if (!extendedReward.uses && !isActive) {
      console.log('XP Boost reward is unlocked but no boosts available - adding 2 initial boosts');
      
      // Add 2 initial boosts
      extendedReward.uses = 2;
      extendedReward.lastRefill = new Date().toISOString();
      
      // Save updated progress
      await storageService.saveUserProgress(userProgress);
      
      return { isUnlocked: true, boostsAdded: 2 };
    }
    
    return { isUnlocked: true, boostsAdded: 0 };
  } catch (error) {
    console.error('Error validating XP boost reward:', error);
    return { isUnlocked: false, boostsAdded: 0 };
  }
};

/**
 * Alias for getXpBoostRemainingTime for backward compatibility
 */
export const getXpBoostRemainingTime = getRemainingXpBoostTime; 