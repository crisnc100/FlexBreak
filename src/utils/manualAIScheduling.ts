import { scheduleAIWellnessV2 } from '../services/ai/aiWellnessSchedulerV2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../services/storageService';

/**
 * Manually enable AI wellness and schedule notifications
 * Useful for testing
 */
export const manuallyEnableAIWellness = async () => {
  console.log('Manually enabling AI wellness...');
  
  try {
    // Enable AI wellness
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.ENABLED, 'true');
    
    // Schedule notifications
    await scheduleAIWellnessV2('enable');
    
    console.log('✅ AI wellness enabled and notifications scheduled');
    return true;
  } catch (error) {
    console.error('Error enabling AI wellness:', error);
    return false;
  }
};

/**
 * Force schedule AI wellness check-ins
 * This bypasses the state check and directly schedules notifications
 */
export const forceScheduleAICheckIns = async () => {
  console.log('Force scheduling AI wellness check-ins...');
  
  try {
    const { scheduleRegularCheckIns } = await import('../services/ai/aiWellnessSchedulerV2');
    const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    
    // Clean up existing AI notifications first
    const { cleanupAllAINotifications } = await import('../services/ai/aiWellnessSchedulerV2');
    await cleanupAllAINotifications();
    
    // Schedule new check-ins
    await scheduleRegularCheckIns(isPremium, userId);
    
    console.log(`✅ Scheduled ${isPremium ? 'daily' : 'weekly'} AI wellness check-ins`);
    return true;
  } catch (error) {
    console.error('Error force scheduling AI check-ins:', error);
    return false;
  }
};

/**
 * Manually trigger premium upgrade flow
 * Useful for testing premium upgrade notifications
 */
export const manuallyTriggerPremiumUpgrade = async () => {
  console.log('Manually triggering premium upgrade flow...');
  
  try {
    // Schedule upgrade notification
    await scheduleAIWellnessV2('upgrade');
    
    console.log('✅ Premium upgrade notification scheduled');
    return true;
  } catch (error) {
    console.error('Error triggering premium upgrade:', error);
    return false;
  }
};

/**
 * Reset AI wellness to initial state
 * Useful for testing first-time user experience
 */
export const resetAIWellnessState = async () => {
  console.log('Resetting AI wellness state...');
  
  try {
    // Clear all AI wellness data
    await AsyncStorage.removeItem(KEYS.AI_WELLNESS.HAS_SEEN_WELCOME);
    await AsyncStorage.removeItem('@ai_wellness_regular_scheduled');
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.ENABLED, 'false');
    
    // Clean up notifications
    const { cleanupAllAINotifications } = await import('../services/ai/aiWellnessSchedulerV2');
    await cleanupAllAINotifications();
    
    console.log('✅ AI wellness state reset to initial');
    return true;
  } catch (error) {
    console.error('Error resetting AI wellness:', error);
    return false;
  }
};