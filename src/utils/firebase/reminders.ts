/**
 * Reminder settings and scheduling functionality
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storageService from '../../services/storageService';
import { 
  FIREBASE_REMINDER_ENABLED_KEY,
  FIREBASE_REMINDER_TIME_KEY,
  FIREBASE_REMINDER_FREQUENCY_KEY,
  FIREBASE_REMINDER_DAYS_KEY,
  FIREBASE_REMINDER_MESSAGE_KEY,
  DEFAULT_REMINDER_TIME,
  DEFAULT_REMINDER_MESSAGE,
  DEFAULT_REMINDER_DAYS,
  DEFAULT_REMINDER_FREQUENCY
} from './constants';
import { ReminderSettings, ReminderFrequency } from './types';
import { getFCMToken } from './initialization';

/**
 * Save reminder settings to Firestore through Cloud Function
 * This ensures reminders work even when the app is closed
 */
export const saveReminderSettings = async (settings: ReminderSettings): Promise<boolean> => {
  try {
    console.log('Saving reminder settings to Firebase:', settings);
    
    // First save locally
    await Promise.all([
      AsyncStorage.setItem(FIREBASE_REMINDER_ENABLED_KEY, settings.enabled.toString()),
      AsyncStorage.setItem(FIREBASE_REMINDER_TIME_KEY, settings.time),
      AsyncStorage.setItem(FIREBASE_REMINDER_FREQUENCY_KEY, settings.frequency),
      AsyncStorage.setItem(FIREBASE_REMINDER_DAYS_KEY, JSON.stringify(settings.days)),
      AsyncStorage.setItem(FIREBASE_REMINDER_MESSAGE_KEY, settings.message || DEFAULT_REMINDER_MESSAGE)
    ]);
    
    // Only send to Firebase if enabled
    if (settings.enabled) {
      try {
        // Get the FCM token
        const token = await getFCMToken();
        if (!token) {
          console.error('Cannot save reminder settings: No FCM token available');
          return true; // Still return true as we saved locally
        }
        
        // Get user's premium status
        const isPremium = await storageService.getIsPremium();
        const userProgress = await storageService.getUserProgress();
        const premiumLevel = isPremium ? (userProgress.level || 1) : 0;
        
        // Get the device's timezone offset in minutes
        const timeZoneOffset = new Date().getTimezoneOffset();
        console.log(`Device timezone offset: ${timeZoneOffset} minutes from UTC`);
        
        // Create a separate Firebase app instance to bypass App Check
        try {
          // Create a unique ID for this instance
          const uniqueId = 'direct-' + Date.now();
          
          // Initialize a temporary app without App Check
          const directApp = firebase.initializeApp(
            firebase.app().options,
            uniqueId
          );
          
          // Get functions from this app
          const directFunctions = directApp.functions();
          const saveFunction = directFunctions.httpsCallable('saveUserReminders');
          
          // Call the function
          const result = await saveFunction({
            token,
            enabled: settings.enabled,
            time: settings.time,
            frequency: settings.frequency,
            days: settings.days,
            message: settings.message,
            timeZoneOffset,
            isPremium,
            premiumLevel
          });
          
          console.log('Firebase reminder settings saved successfully:', result.data);
          
          // Clean up the temporary app
          directApp.delete();
          
          // If we just enabled reminders, schedule them
          if (settings.enabled) {
            try {
              // Schedule local reminders based on premium level
              await scheduleAdvancedReminders(settings, premiumLevel);
              console.log('Advanced reminders scheduled based on premium level:', premiumLevel);
            } catch (scheduleError) {
              console.error('Error scheduling advanced reminders:', scheduleError);
            }
          }
          
          return true;
        } catch (directError) {
          console.error('Error with direct Firebase call:', directError);
          
          // Fall back to original method with App Check
          console.log('Falling back to original method...');
          const saveFunction = firebase.functions().httpsCallable('saveUserReminders');
          const result = await saveFunction({
            token,
            enabled: settings.enabled,
            time: settings.time,
            frequency: settings.frequency,
            days: settings.days,
            message: settings.message,
            timeZoneOffset,
            isPremium,
            premiumLevel
          });
          
          console.log('Firebase reminder settings saved successfully with fallback:', result.data);
          return true;
        }
      } catch (firebaseError) {
        console.error('Error saving to Firebase, but local settings saved:', firebaseError);
        // Schedule a local notification as fallback
        try {
          // If Firebase fails but we have notification permission, 
          // schedule a local reminder instead
          if (settings.enabled) {
            await scheduleLocalReminderFallback(settings);
            console.log('Scheduled local reminder as Firebase fallback');
          }
        } catch (localError) {
          console.error('Could not schedule local reminder fallback:', localError);
        }
      }
    }
    
    // Since we saved locally, return success
    return true;
  } catch (error) {
    console.error('Error saving reminder settings:', error);
    return false;
  }
};

/**
 * Schedule a local reminder as fallback when Firebase fails
 */
const scheduleLocalReminderFallback = async (settings: ReminderSettings): Promise<void> => {
  try {
    // Show an immediate notification informing the user that local reminders will be used
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FlexBreak Reminders Set Locally',
        body: "Your reminders have been set up locally. You'll receive notifications at " + 
              settings.time + ". Note: Local reminders require the app to be opened at least once a day.",
        data: { type: 'reminder_setup' },
      },
      trigger: null, // null trigger for immediate notification
    });
    
    console.log('Local reminder notification sent as Firebase fallback');
  } catch (error) {
    console.error('Error sending local reminder notification:', error);
    throw error;
  }
};

/**
 * Get reminder settings from storage
 */
export const getReminderSettings = async (): Promise<ReminderSettings> => {
  try {
    const [enabled, time, frequency, daysStr, message] = await Promise.all([
      AsyncStorage.getItem(FIREBASE_REMINDER_ENABLED_KEY),
      AsyncStorage.getItem(FIREBASE_REMINDER_TIME_KEY),
      AsyncStorage.getItem(FIREBASE_REMINDER_FREQUENCY_KEY),
      AsyncStorage.getItem(FIREBASE_REMINDER_DAYS_KEY),
      AsyncStorage.getItem(FIREBASE_REMINDER_MESSAGE_KEY)
    ]);
    
    let days = DEFAULT_REMINDER_DAYS;
    if (daysStr) {
      try {
        days = JSON.parse(daysStr);
      } catch (e) {
        console.error('Error parsing reminder days:', e);
      }
    }
    
    return {
      enabled: enabled === 'true',
      time: time || DEFAULT_REMINDER_TIME,
      frequency: (frequency as ReminderFrequency) || DEFAULT_REMINDER_FREQUENCY,
      days,
      message: message || DEFAULT_REMINDER_MESSAGE
    };
  } catch (error) {
    console.error('Error getting reminder settings:', error);
    return {
      enabled: false,
      time: DEFAULT_REMINDER_TIME,
      frequency: DEFAULT_REMINDER_FREQUENCY,
      days: DEFAULT_REMINDER_DAYS,
      message: DEFAULT_REMINDER_MESSAGE
    };
  }
};

/**
 * Helper functions to update individual reminder settings
 */
export const setRemindersEnabled = async (enabled: boolean): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.enabled = enabled;
    return await saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminders enabled:', error);
    return false;
  }
};

export const setReminderTime = async (time: string): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.time = time;
    return await saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder time:', error);
    return false;
  }
};

export const setReminderFrequency = async (frequency: ReminderFrequency): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.frequency = frequency;
    return await saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder frequency:', error);
    return false;
  }
};

export const setReminderDays = async (days: string[]): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.days = days;
    return await saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder days:', error);
    return false;
  }
};

export const setReminderMessage = async (message: string): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.message = message;
    return await saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder message:', error);
    return false;
  }
};

/**
 * Cancel reminder notifications (only cancels reminders, not motivational messages)
 */
export const cancelReminderNotifications = async () => {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const reminderNotifications = allNotifications.filter(notification => 
      notification.content.data?.type === 'reminder' || 
      notification.content.data?.type === 'advanced_reminder'
    );
    
    for (const notification of reminderNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    
    console.log(`Cancelled ${reminderNotifications.length} reminder notifications`);
  } catch (error) {
    console.error('Error cancelling reminder notifications:', error);
  }
};

/**
 * Schedule advanced reminders based on premium level
 */
export const scheduleAdvancedReminders = async (
  settings: ReminderSettings, 
  premiumLevel: number = 0
): Promise<void> => {
  try {
    // Cancel existing reminder notifications only
    await cancelReminderNotifications();
    console.log('Cleared existing reminder notifications');
    
    if (!settings.enabled) {
      console.log('Reminders are disabled, not scheduling');
      return;
    }
    
    // Parse the time
    const [hours, minutes] = settings.time.split(':').map(Number);
    
    // Function to get the next occurrence of a specific day of week at a specific time
    const getNextDayOfWeek = (dayOfWeek: number, hours: number, minutes: number): Date => {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      
      // Get current day of week (0 = Sunday, 6 = Saturday)
      const currentDay = date.getDay();
      
      // Calculate days until target day
      let daysUntil = dayOfWeek - currentDay;
      
      // If the target day is today but the time has passed, or if the day is in the past this week
      if (daysUntil < 0 || (daysUntil === 0 && date.getTime() <= Date.now())) {
        daysUntil += 7;
      }
      
      date.setDate(date.getDate() + daysUntil);
      return date;
    };
    
    // Map day abbreviations to day numbers
    const dayMap: Record<string, number> = {
      'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3,
      'thu': 4, 'fri': 5, 'sat': 6
    };
    
    // Calculate reminder times based on premium level
    const reminderCount = premiumLevel >= 5 ? 3 : premiumLevel >= 3 ? 2 : 1;
    const reminderTimes: Date[] = [];
    
    // Schedule for each selected day
    for (const day of settings.days) {
      const dayNum = dayMap[day.toLowerCase()];
      if (dayNum === undefined) continue;
      
      // Get the base time for this day
      const baseTime = getNextDayOfWeek(dayNum, hours, minutes);
      
      // Add the base reminder
      reminderTimes.push(new Date(baseTime));
      
      // Add additional reminders for premium users
      if (premiumLevel >= 3) {
        // Add a midday reminder (3 hours after base time)
        const middayReminder = new Date(baseTime);
        middayReminder.setHours(middayReminder.getHours() + 3);
        reminderTimes.push(middayReminder);
      }
      
      if (premiumLevel >= 5) {
        // Add an evening reminder (6 hours after base time)
        const eveningReminder = new Date(baseTime);
        eveningReminder.setHours(eveningReminder.getHours() + 6);
        reminderTimes.push(eveningReminder);
      }
    }
    
    // Sort reminders by time
    reminderTimes.sort((a, b) => a.getTime() - b.getTime());
    
    // Schedule notifications for the next 30 days
    const scheduledCount = { morning: 0, midday: 0, evening: 0 };
    const maxDays = 30;
    const now = new Date();
    
    for (let week = 0; week < Math.ceil(maxDays / 7); week++) {
      for (const baseTime of reminderTimes) {
        const notificationTime = new Date(baseTime);
        notificationTime.setDate(notificationTime.getDate() + (week * 7));
        
        // Skip if the time is in the past or more than 30 days in the future
        if (notificationTime <= now || notificationTime > new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)) {
          continue;
        }
        
        const hour = notificationTime.getHours();
        let timeOfDay = 'morning';
        let emoji = '🌅';
        
        if (hour >= 12 && hour < 17) {
          timeOfDay = 'midday';
          emoji = '☀️';
        } else if (hour >= 17) {
          timeOfDay = 'evening';
          emoji = '🌆';
        }
        
        scheduledCount[timeOfDay as keyof typeof scheduledCount]++;
        
        const notificationContent = {
          title: `${emoji} ${settings.message || DEFAULT_REMINDER_MESSAGE}`,
          body: premiumLevel >= 3 ? 
            `Level ${premiumLevel} ${timeOfDay} stretch reminder` : 
            'Time to stretch and feel great!',
          data: { 
            type: 'advanced_reminder',
            timeOfDay,
            premiumLevel: premiumLevel.toString()
          },
          sound: true,
        };
        
        await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger: { date: notificationTime },
        });
      }
    }
    
    console.log('Scheduled advanced reminders:', scheduledCount);
    console.log(`Total reminders per day: ${reminderCount} (Premium Level: ${premiumLevel})`);
  } catch (error) {
    console.error('Error scheduling advanced reminders:', error);
    throw error;
  }
};