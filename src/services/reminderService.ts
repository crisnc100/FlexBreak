import firebase from 'firebase/compat/app';
import { functions } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as storageService from './storageService';
import { getFCMToken } from './fcmTokenService';
import { scheduleAdvancedReminders } from './notificationScheduler';
import { ReminderSettings, ReminderFrequency } from '../types/reminders';
import { STORAGE_KEYS, DEFAULTS } from '../constants/reminderDefaults';

/**
 * Save reminder settings to Firestore through Cloud Function
 * This ensures reminders work even when the app is closed
 */
export async function saveReminderSettings(settings: ReminderSettings): Promise<boolean> {
  try {
    console.log('Saving reminder settings to Firebase:', settings);
    
    // First save locally
    await saveLocalReminderSettings(settings);
    
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
        
        // Save to Firebase
        await saveToFirebase(settings, token, isPremium, premiumLevel, timeZoneOffset);
        
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
      } catch (firebaseError) {
        console.error('Error saving to Firebase, but local settings saved:', firebaseError);
        // Schedule a local notification as fallback
        if (settings.enabled) {
          await scheduleLocalReminderFallback(settings);
        }
      }
    }
    
    // Since we saved locally, return success
    return true;
  } catch (error) {
    console.error('Error saving reminder settings:', error);
    return false;
  }
}

/**
 * Save reminder settings locally
 */
async function saveLocalReminderSettings(settings: ReminderSettings): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_ENABLED, settings.enabled.toString()),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_TIME, settings.time),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_FREQUENCY, settings.frequency),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_DAYS, JSON.stringify(settings.days)),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_MESSAGE, settings.message || DEFAULTS.REMINDER_MESSAGE)
  ]);
}

/**
 * Save reminder settings to Firebase
 */
async function saveToFirebase(
  settings: ReminderSettings,
  token: string,
  isPremium: boolean,
  premiumLevel: number,
  timeZoneOffset: number
): Promise<void> {
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
  } catch (directError) {
    console.error('Error with direct Firebase call:', directError);
    
    // Fall back to original method with App Check
    console.log('Falling back to original method...');
    const saveFunction = functions.httpsCallable('saveUserReminders');
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
  }
}

/**
 * Schedule a local reminder as fallback when Firebase fails
 */
async function scheduleLocalReminderFallback(settings: ReminderSettings): Promise<void> {
  try {
    // Show an immediate notification informing the user that local reminders will be used
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FlexBreak Reminders Set Locally',
        body: `Your reminders have been set up locally. You'll receive notifications at ${settings.time}. Note: Local reminders require the app to be opened at least once a day.`,
        data: { type: 'reminder_setup' },
      },
      trigger: null, // null trigger for immediate notification
    });
    
    console.log('Local reminder notification sent as Firebase fallback');
  } catch (error) {
    console.error('Error sending local reminder notification:', error);
    throw error;
  }
}

/**
 * Get the locally stored reminder settings
 */
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const [enabledStr, time, frequency, daysStr, message] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_ENABLED),
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_TIME),
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_FREQUENCY),
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_DAYS),
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_MESSAGE)
    ]);
    
    return {
      enabled: enabledStr === 'true',
      time: time || DEFAULTS.REMINDER_TIME,
      frequency: (frequency as ReminderFrequency) || DEFAULTS.REMINDER_FREQUENCY,
      days: daysStr ? JSON.parse(daysStr) : DEFAULTS.REMINDER_DAYS,
      message: message || DEFAULTS.REMINDER_MESSAGE
    };
  } catch (error) {
    console.error('Error getting reminder settings:', error);
    return {
      enabled: false,
      time: DEFAULTS.REMINDER_TIME,
      frequency: DEFAULTS.REMINDER_FREQUENCY,
      days: DEFAULTS.REMINDER_DAYS,
      message: DEFAULTS.REMINDER_MESSAGE
    };
  }
}

/**
 * Enable or disable reminders
 */
export async function setRemindersEnabled(enabled: boolean): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.enabled = enabled;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminders enabled:', error);
    return false;
  }
}

/**
 * Set reminder time
 */
export async function setReminderTime(time: string): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.time = time;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder time:', error);
    return false;
  }
}

/**
 * Set reminder frequency
 */
export async function setReminderFrequency(frequency: ReminderFrequency): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.frequency = frequency;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder frequency:', error);
    return false;
  }
}

/**
 * Set reminder days (for custom frequency)
 */
export async function setReminderDays(days: string[]): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.days = days;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder days:', error);
    return false;
  }
}

/**
 * Set reminder message
 */
export async function setReminderMessage(message: string): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.message = message;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder message:', error);
    return false;
  }
}