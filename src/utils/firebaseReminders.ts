import messaging from '@react-native-firebase/messaging';
import functions from '@react-native-firebase/functions';
import * as storageService from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const FIREBASE_REMINDER_ENABLED_KEY = 'firebase_reminder_enabled';
const FIREBASE_REMINDER_DAYS_KEY = 'firebase_reminder_days';
const FIREBASE_REMINDER_FREQUENCY_KEY = 'firebase_reminder_frequency';
const FIREBASE_REMINDER_MESSAGE_KEY = 'firebase_reminder_message';
const FIREBASE_REMINDER_TIME_KEY = 'firebase_reminder_time';

// Default values
const DEFAULT_REMINDER_TIME = '09:00';
const DEFAULT_REMINDER_MESSAGE = 'Time for your daily stretch!';
const DEFAULT_REMINDER_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DEFAULT_REMINDER_FREQUENCY = 'daily';

// Types
export type ReminderFrequency = 'daily' | 'weekdays' | 'custom';

export type ReminderSettings = {
  enabled: boolean;
  time: string;
  days: string[];
  frequency: ReminderFrequency;
  message: string;
};

/**
 * Initialize Firebase for reminders
 * This ensures we have the FCM token and required permissions
 */
export const initializeFirebaseReminders = async (): Promise<boolean> => {
  try {
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled = 
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (enabled) {
      console.log('Firebase messaging authorized for reminders');
      
      // Get and save the FCM token
      const token = await messaging().getToken();
      console.log('FCM token obtained for reminders');
      
      // Save token locally (we'll need it to save reminder settings)
      await AsyncStorage.setItem('fcm_token', token);
      
      return true;
    } else {
      console.log('Firebase messaging not authorized for reminders');
      return false;
    }
  } catch (error) {
    console.error('Error initializing Firebase for reminders:', error);
    return false;
  }
};

/**
 * Get the current FCM token
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    let token = await AsyncStorage.getItem('fcm_token');
    
    // If no token stored, try to get from Firebase
    if (!token) {
      token = await messaging().getToken();
      await AsyncStorage.setItem('fcm_token', token);
    }
    
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

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
      // Get the FCM token
      const token = await getFCMToken();
      if (!token) {
        console.error('Cannot save reminder settings: No FCM token available');
        return false;
      }
      
      // Get user's premium status
      const isPremium = await storageService.getIsPremium();
      const userProgress = await storageService.getUserProgress();
      const premiumLevel = isPremium ? (userProgress.level || 1) : 0;
      
      // Get the device's timezone offset in minutes
      const timeZoneOffset = new Date().getTimezoneOffset();
      
      // Call the Cloud Function to save settings
      const saveFunction = functions().httpsCallable('saveUserReminders');
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
      return true;
    }
    
    // If not enabled, still consider the save successful (stored locally)
    return true;
  } catch (error) {
    console.error('Error saving reminder settings to Firebase:', error);
    return false;
  }
};

/**
 * Get the locally stored reminder settings
 */
export const getReminderSettings = async (): Promise<ReminderSettings> => {
  try {
    const [enabledStr, time, frequency, daysStr, message] = await Promise.all([
      AsyncStorage.getItem(FIREBASE_REMINDER_ENABLED_KEY),
      AsyncStorage.getItem(FIREBASE_REMINDER_TIME_KEY),
      AsyncStorage.getItem(FIREBASE_REMINDER_FREQUENCY_KEY),
      AsyncStorage.getItem(FIREBASE_REMINDER_DAYS_KEY),
      AsyncStorage.getItem(FIREBASE_REMINDER_MESSAGE_KEY)
    ]);
    
    return {
      enabled: enabledStr === 'true',
      time: time || DEFAULT_REMINDER_TIME,
      frequency: (frequency as ReminderFrequency) || DEFAULT_REMINDER_FREQUENCY,
      days: daysStr ? JSON.parse(daysStr) : DEFAULT_REMINDER_DAYS,
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
 * Enable or disable reminders
 */
export const setRemindersEnabled = async (enabled: boolean): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.enabled = enabled;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminders enabled:', error);
    return false;
  }
};

/**
 * Set reminder time
 */
export const setReminderTime = async (time: string): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.time = time;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder time:', error);
    return false;
  }
};

/**
 * Set reminder frequency
 */
export const setReminderFrequency = async (frequency: ReminderFrequency): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.frequency = frequency;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder frequency:', error);
    return false;
  }
};

/**
 * Set reminder days (for custom frequency)
 */
export const setReminderDays = async (days: string[]): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.days = days;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder days:', error);
    return false;
  }
};

/**
 * Set reminder message
 */
export const setReminderMessage = async (message: string): Promise<boolean> => {
  try {
    const settings = await getReminderSettings();
    settings.message = message;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder message:', error);
    return false;
  }
};

/**
 * Test function to send an immediate test notification
 */
export const sendTestNotification = async (): Promise<boolean> => {
  try {
    const token = await getFCMToken();
    if (!token) {
      console.error('Cannot send test notification: No FCM token available');
      return false;
    }
    
    // Call a test function to send an immediate notification
    const testFunction = functions().httpsCallable('sendCustomNotification');
    await testFunction({
      title: 'FlexBreak Test',
      body: 'This is a TEST notification that confirms your reminder system is working!',
      data: { type: 'test_notification' }
    });
    
    console.log('Test notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}; 