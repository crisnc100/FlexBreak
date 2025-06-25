import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
import { scheduleAIWellnessV2, hasSeenAIWelcome, scheduleRegularCheckIns, cleanupAllAINotifications } from './aiWellnessSchedulerV2';
import { canScheduleNotifications, markScheduled } from './notificationDebouncer';
import { getNotificationsByType, NotificationType } from '../../utils/notificationManager';

/**
 * Initialize AI wellness notifications on app startup
 * This ensures notifications are properly scheduled for users who have AI wellness enabled
 */
// Track if initialization is in progress to prevent multiple calls
let isInitializing = false;

export const initializeAIWellnessOnStartup = async () => {
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    console.log('AI wellness initialization already in progress, skipping');
    return;
  }
  
  // Check debouncer
  if (!canScheduleNotifications('ai_wellness_startup')) {
    console.log('AI wellness startup initialization debounced');
    return;
  }
  
  isInitializing = true;
  
  try {
    console.log('Checking AI wellness initialization...');
    
    // Check if AI wellness is enabled
    const isEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED) === 'true';
    
    if (!isEnabled) {
      console.log('AI wellness is disabled, skipping initialization');
      return;
    }
    
    // Get current state
    const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    
    console.log(`AI Wellness Init - Enabled: true, Premium: ${isPremium}`);
    
    // Check if we already have notifications scheduled
    const existingAINotifications = await getNotificationsByType([
      NotificationType.AI_WELLNESS,
      NotificationType.UPGRADE_PROMPT
    ]);
    
    console.log(`Found ${existingAINotifications.length} existing AI notifications`);
    
    // Only schedule if we don't have the right number of notifications
    const expectedCount = isPremium ? 7 : 1; // 7 daily for premium, 1 weekly for free
    const hasUpgradePrompts = existingAINotifications.some(n => n.content.data?.type === 'ai_wellness_upgrade');
    const expectedUpgradePrompts = isPremium ? 0 : 2;
    
    if (existingAINotifications.length < expectedCount) {
      console.log(`Only ${existingAINotifications.length} AI notifications found, expecting ${expectedCount}. Scheduling...`);
      
      // Clean up partial schedules
      await cleanupAllAINotifications();
      
      // Schedule fresh
      await scheduleRegularCheckIns(isPremium, userId);
      console.log(`Scheduled ${isPremium ? 'daily' : 'weekly'} AI wellness check-ins on startup`);
      
      // Mark as scheduled
      markScheduled('ai_wellness_startup');
    } else {
      console.log(`AI notifications already properly scheduled (${existingAINotifications.length} found), skipping`);
    }
  } catch (error) {
    console.error('Error initializing AI wellness on startup:', error);
    // Don't throw - we don't want to break app startup
  } finally {
    isInitializing = false;
  }
};

/**
 * Check if we need to restore AI wellness schedule after an upgrade
 * This handles the case where a free user with Wednesday notifications upgrades to premium
 */
export const checkAndRestoreAfterUpgrade = async () => {
  try {
    const isEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED) === 'true';
    const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
    
    if (!isEnabled || !isPremium) {
      return;
    }
    
    // Check if we only have Wednesday notification (free user pattern)
    const existingAINotifications = await getNotificationsByType([NotificationType.AI_WELLNESS]);
    
    // If premium user has less than 7 notifications, they might have upgraded
    if (existingAINotifications.length > 0 && existingAINotifications.length < 7) {
      console.log(`Premium user has only ${existingAINotifications.length} AI notifications, re-scheduling for daily`);
      
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      
      // Clean up old notifications
      await cleanupAllAINotifications();
      
      // Schedule daily notifications
      await scheduleRegularCheckIns(true, userId);
      console.log('Updated AI wellness to daily schedule for premium user');
    }
  } catch (error) {
    console.error('Error checking upgrade status:', error);
  }
};