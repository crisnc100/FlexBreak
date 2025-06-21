import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
import { scheduleAICheckIns, cancelAICheckIns } from './aiWellnessScheduler';
import * as Notifications from 'expo-notifications';

// Flag to prevent double execution during upgrade
let isUpgrading = false;

export const getIsUpgrading = () => isUpgrading;

/**
 * Schedule AI check-ins starting from tomorrow to avoid immediate notifications during upgrade
 */
const scheduleAICheckInsFromTomorrow = async (isPremium: boolean) => {
  console.log(`Scheduling AI check-ins from tomorrow for ${isPremium ? 'premium' : 'free'} user`);
  
  const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
  const checkInDays = isPremium 
    ? [1, 2, 3, 4, 5, 6, 0] // Daily for premium
    : [3]; // Wednesday only for free users
  
  for (const day of checkInDays) {
    // Generate random time between 11 AM and 4 PM
    const randomHour = 11 + Math.floor(Math.random() * 6); // 11-16 (11 AM - 4 PM)
    const randomMinute = Math.floor(Math.random() * 60); // 0-59 minutes
    
    // Calculate the next occurrence of this weekday, but ensure it's at least tomorrow
    const nextDate = getNextWeekdayFromTomorrow(day, randomHour, randomMinute);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "AI Wellness Check 🤖",
        body: "Hey! How's your body and mind feeling today? Tap and hold to reply here",
        data: { 
          type: 'ai_wellness_checkin',
          userId
        },
        categoryIdentifier: 'AI_WELLNESS_CHECK',
      },
      trigger: {
        date: nextDate,
        repeats: false
      }
    });
    
    console.log(`Scheduled AI check-in for day ${day} at ${nextDate.toLocaleString()}`);
  }
};

/**
 * Get next occurrence of a weekday, but ensure it's at least tomorrow
 */
const getNextWeekdayFromTomorrow = (targetDay: number, hour: number, minute: number): Date => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hour, minute, 0, 0);
  
  const currentDay = tomorrow.getDay();
  let daysUntilTarget = targetDay - currentDay;
  
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }
  
  const nextDate = new Date(tomorrow);
  nextDate.setDate(tomorrow.getDate() + daysUntilTarget);
  
  return nextDate;
};

/**
 * Cancel ALL AI wellness related notifications (more thorough than cancelAICheckIns)
 */
const cancelAllAINotifications = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  
  // Find all AI wellness related notifications
  const aiNotifications = scheduled.filter(n => {
    const data = n.content.data;
    return data?.type === 'ai_wellness_checkin' || 
           data?.type === 'ai_wellness_response' ||
           data?.type === 'ai_wellness_effectiveness' ||
           data?.type === 'ai_wellness_upgrade' ||
           data?.type === 'ai_wellness_downgrade' ||
           n.content.title?.includes('AI Wellness') ||
           n.content.title?.includes('AI Flex Coach') ||
           n.content.title?.includes('Wellness Check');
  });
  
  console.log(`🔧 DEBUG: Found ${aiNotifications.length} AI wellness notifications to cancel`);
  
  for (const notification of aiNotifications) {
    console.log(`🔧 DEBUG: Cancelling notification: "${notification.content.title}" - trigger:`, notification.trigger);
    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }
  
  console.log('🔧 DEBUG: All AI wellness notifications cancelled');
};

/**
 * Handles the transition when a user upgrades from free to premium
 * This should be called when the premium status changes
 */
export const handleAIWellnessUpgrade = async () => {
  try {
    // Set upgrade flag to prevent double execution
    isUpgrading = true;
    
    // Check if AI Wellness is enabled
    const isEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
    
    console.log('🔧 DEBUG: handleAIWellnessUpgrade called, AI Wellness enabled:', isEnabled);
    
    if (isEnabled !== 'true') {
      // AI Wellness not enabled, nothing to do
      console.log('🔧 DEBUG: AI Wellness not enabled, skipping upgrade');
      isUpgrading = false;
      return;
    }
    
    console.log('🔧 DEBUG: User upgraded to premium - updating AI Wellness schedule');
    
    // Cancel ALL existing AI wellness notifications (not just check-ins)
    console.log('🔧 DEBUG: Cancelling ALL existing AI notifications...');
    await cancelAllAINotifications();
    
    // Get all scheduled notifications to see what exists
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const aiNotifications = allScheduled.filter(n => n.content.data?.type === 'ai_wellness_checkin');
    console.log('🔧 DEBUG: AI notifications after cancel:', aiNotifications.length);
    
    // Send ONLY the celebration notification
    console.log('🔧 DEBUG: Sending celebration notification...');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Welcome to Premium AI Wellness! 🎉",
        body: "You now have daily access to your AI Flex Coach! I'll check in with you every day between 11 AM and 4 PM. Ready to level up your wellness? 💪",
        sound: true, // For now, use default sound until iOS bundle is configured
        data: { 
          type: 'ai_wellness_upgrade',
          isPremium: true
        },
      },
      trigger: {
        seconds: 2
      }
    });
    
    // DON'T schedule notifications here - let the normal toggle flow handle it
    // The issue was that we were scheduling twice - once here and once from the toggle
    console.log('🔧 DEBUG: Skipping manual scheduling - will let normal flow handle it');
    
    // Check what got scheduled
    const newScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const newAiNotifications = newScheduled.filter(n => n.content.data?.type === 'ai_wellness_checkin');
    console.log('🔧 DEBUG: AI notifications after scheduling:', newAiNotifications.length);
    newAiNotifications.forEach(n => {
      console.log('🔧 DEBUG: Scheduled notification:', n.content.title, 'for', n.trigger);
    });
    
    // Clear any usage limits from today
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    const todayStr = new Date().toDateString();
    const usageKey = `@ai_usage_${userId}_${todayStr}`;
    await AsyncStorage.removeItem(usageKey);
    
    console.log('AI Wellness upgraded to premium successfully');
    
  } catch (error) {
    console.error('Error handling AI Wellness upgrade:', error);
  } finally {
    // Clear upgrade flag after 5 seconds to allow normal operations
    setTimeout(() => {
      isUpgrading = false;
      console.log('🔧 DEBUG: Upgrade flag cleared');
    }, 5000);
  }
};

/**
 * Handles the transition when a user downgrades from premium to free
 */
export const handleAIWellnessDowngrade = async () => {
  try {
    const isEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
    
    if (isEnabled !== 'true') {
      return;
    }
    
    console.log('User downgraded to free - updating AI Wellness schedule');
    
    // Cancel existing notifications (Daily)
    await cancelAICheckIns();
    
    // Schedule new notifications (Wednesday only)
    await scheduleAICheckIns(false, false); // isPremium = false, isInitialSetup = false
    
    // Send a notification about the change
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "AI Wellness Updated 📅",
        body: "Your AI Flex Coach is now available on Wednesdays. Thanks for trying premium! I'll still be here to help you stay healthy! 🌟",
        data: { 
          type: 'ai_wellness_downgrade',
          isPremium: false
        },
      },
      trigger: {
        seconds: 2
      }
    });
    
    console.log('AI Wellness downgraded to free successfully');
    
  } catch (error) {
    console.error('Error handling AI Wellness downgrade:', error);
  }
};