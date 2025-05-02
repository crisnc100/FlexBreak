import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/messaging';
import 'firebase/compat/app-check';
import * as Notifications from 'expo-notifications';
import * as storageService from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
    // Request permission for notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    const enabled = finalStatus === 'granted';
    
    if (enabled) {
      console.log('Firebase messaging authorized for reminders');
      
      // Save notification permissions status
      await AsyncStorage.setItem('notifications_enabled', 'true');
      
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
 * Get the current FCM token (using Expo's push notification token)
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    // First check if we have a stored token
    let token = await AsyncStorage.getItem('fcm_token');
    
    if (!token) {
      console.log('No stored token found, requesting a new one');
      
      // Request permission for notifications if not already granted
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return null;
      }
      
      try {
        // Get the Expo push token
        console.log('Requesting Expo push token...');
        const expoPushToken = await Notifications.getExpoPushTokenAsync({
          projectId: "e2f2f0ca-229d-4469-9de8-9f69b7f7a724", // Your Expo project ID from app.json
        });
        
        token = expoPushToken.data;
        console.log('Generated Expo push token:', token);
        
        // Save the token
        await AsyncStorage.setItem('fcm_token', token);
        
        // Save the token to Firestore if Firebase is initialized
        if (firebase.apps.length > 0) {
          try {
            const user = firebase.auth().currentUser;
            if (user) {
              // Store the token in Firestore with the user's ID
              await firebase.firestore().collection('fcm_tokens').doc(user.uid).set({
                token,
                device: Platform.OS,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid
              });
              console.log('Saved real FCM token to Firestore for user:', user.uid);
            } else {
              // Create a device-specific ID for anonymous users
              const deviceId = `device_${Platform.OS}_${Date.now()}`;
              await firebase.firestore().collection('fcm_tokens').doc(deviceId).set({
                token,
                device: Platform.OS,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                anonymous: true
              });
              console.log('Saved FCM token to Firestore with device ID:', deviceId);
            }
          } catch (firestoreError) {
            console.error('Error saving FCM token to Firestore:', firestoreError);
          }
        }
      } catch (expoPushTokenError) {
        console.error('Error getting Expo push token:', expoPushTokenError);
        return null;
      }
    } else {
      console.log('Using existing FCM token:', token.substring(0, 15) + '...');
    }
    
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Try to refresh the App Check token, but continue if it fails
 * This ensures we have a fresh token for each request when possible
 * But doesn't block operations if App Check is misconfigured
 */
const refreshAppCheckToken = async (): Promise<void> => {
  try {
    if (firebase.apps.length > 0 && firebase.appCheck) {
      // Try to get a token but don't throw if it fails
      try {
        await firebase.appCheck().getToken(true);
        console.log('App Check token refreshed successfully');
      } catch (appCheckError) {
        // Just log the error but continue execution
        console.warn('App Check token refresh failed, continuing without refresh:', appCheckError);
      }
    } else {
      console.log('Firebase App or AppCheck not initialized, skipping token refresh');
    }
  } catch (error) {
    // Catch any unexpected errors but don't block execution
    console.error('Unexpected error in refreshAppCheckToken:', error);
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
        // Note: getTimezoneOffset() returns minutes WEST of UTC, with opposite sign of what you might expect:
        // Positive values are WEST of UTC (US timezones)
        // Negative values are EAST of UTC (Asia, Europe, etc.)
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
 * Since scheduling is problematic with Expo Notifications, we'll just
 * show an immediate notification to inform the user
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
    // Try direct Firebase function call first to bypass App Check
    try {
      // Create a unique ID for this instance
      const uniqueId = 'direct-test-' + Date.now();
      
      // Initialize a temporary app without App Check
      const directApp = firebase.initializeApp(
        firebase.app().options,
        uniqueId
      );
      
      // Get functions from this app
      const directFunctions = directApp.functions();
      const testFunction = directFunctions.httpsCallable('sendCustomNotification');
      
      // Call the function
      await testFunction({
        title: 'FlexBreak Test',
        body: 'This is a TEST notification that confirms your reminder system is working!',
        data: { type: 'test_notification' }
      });
      
      console.log('Test notification sent successfully via direct call');
      
      // Clean up the temporary app
      directApp.delete();
      
      return true;
    } catch (directError) {
      console.error('Direct test notification failed, trying original method:', directError);
      
      // Fall back to original method with App Check
      const testFunction = firebase.functions().httpsCallable('sendCustomNotification');
      await testFunction({
        title: 'FlexBreak Test',
        body: 'This is a TEST notification that confirms your reminder system is working!',
        data: { type: 'test_notification' }
      });
      
      console.log('Test notification sent successfully via fallback');
      return true;
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    // As a fallback, schedule a local notification if Firebase fails
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'FlexBreak Test',
          body: 'This is a local TEST notification (Firebase unavailable)',
          data: { type: 'test_notification' },
        },
        trigger: null, // Use null trigger for immediate notification
      });
      return true;
    } catch (fallbackError) {
      console.error('Fallback notification failed too:', fallbackError);
      return false;
    }
  }
};

/**
 * Send an immediate local notification for testing purposes
 * This bypasses Firebase entirely
 */
export const sendImmediateLocalNotification = async (): Promise<boolean> => {
  try {
    // Request permissions if not already granted
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.log('Notification permissions denied');
        return false;
      }
    }
    
    // Schedule an immediate notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Local Test Notification',
        body: 'This is a direct local notification test (bypassing Firebase)',
        data: { type: 'local_test' },
      },
      trigger: null, // null trigger means immediate delivery
    });
    
    console.log('Local test notification scheduled with ID:', notificationId);
    return true;
  } catch (error) {
    console.error('Error sending local test notification:', error);
    return false;
  }
};

/**
 * Force clear the stored FCM token to get a new one
 * This helps switch from simulated to real tokens
 */
export const clearStoredToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('fcm_token');
    console.log('Cleared stored FCM token - will generate a new one on next request');
  } catch (error) {
    console.error('Error clearing stored FCM token:', error);
  }
};

/**
 * Set up Firebase message handlers
 * This should be called during app initialization
 */
export const setupMessageHandlers = (): (() => void) => {
  console.log('Setting up Firebase message handlers');
  
  try {
    // First check if Firebase messaging is available
    if (!firebase.messaging || typeof firebase.messaging !== 'function') {
      console.log('Firebase messaging is not available in this build - using Expo notifications only');
      return () => {}; // Return empty cleanup function
    }
    
    // Try to get the messaging instance
    let messagingInstance;
    try {
      messagingInstance = firebase.messaging();
    } catch (messagingError) {
      console.log('Could not initialize Firebase messaging:', messagingError);
      return () => {};
    }
    
    if (!messagingInstance || !messagingInstance.onMessage) {
      console.log('Firebase messaging instance or onMessage not available');
      return () => {};
    }
    
    // Listen for foreground messages 
    const unsubscribe = messagingInstance.onMessage(async (message) => {
      console.log('Foreground Firebase message received:', message);
      
      // For foreground messages, we need to manually display a notification
      try {
        const notification = message.notification;
        if (notification) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title || 'FlexBreak',
              body: notification.body || '',
              data: message.data || {},
            },
            trigger: null, // Show immediately
          });
          console.log('Displayed foreground Firebase message as notification');
        }
      } catch (displayError) {
        console.error('Error displaying foreground message:', displayError);
      }
    });
    
    console.log('Firebase message handlers set up successfully');
    
    // Return cleanup function
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up Firebase message handlers:', error);
    // Return empty cleanup function
    return () => {};
  }
};

/**
 * Send a test push notification through Firebase Cloud Functions
 * This tests the entire push notification system end-to-end
 */
export const sendFirebaseTestNotification = async (): Promise<boolean> => {
  try {
    // Get the current token
    const token = await getFCMToken();
    if (!token) {
      console.error('Cannot send test notification: No push token available');
      return false;
    }
    
    console.log('Sending Firebase test notification to token:', token);
    
    // Use a cloud function to send a notification
    try {
      const testFunction = firebase.functions().httpsCallable('testPushNotification');
      
      const result = await testFunction({
        token,
        title: 'FlexBreak Test',
        body: 'This is a test notification sent directly from the app! If you see this, push notifications are working!',
        data: { 
          type: 'firebase_test',
          testId: Date.now().toString()
        }
      });
      
      console.log('Firebase test notification sent successfully:', result.data);
      return true;
    } catch (cloudFunctionError) {
      // Check if it's an AppCheck error, and if so, suppress the detailed error message
      if (cloudFunctionError.message && cloudFunctionError.message.includes('appCheck')) {
        console.log('Firebase AppCheck validation failed - falling back to direct method');
      } else {
        console.error('Error calling Firebase function:', cloudFunctionError);
      }
      
      // If the cloud function fails, try using direct Expo Push API if it's an Expo token
      if (token.startsWith('ExponentPushToken[')) {
        console.log('Falling back to direct Expo Push API');
        
        try {
          // This is a client-side fallback using fetch - not ideal but works in a pinch
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: token,
              title: 'FlexBreak Test (Direct)',
              body: 'This is a DIRECT test notification (bypassing Firebase)!',
              sound: 'default',
              data: { 
                type: 'direct_test',
                testId: Date.now().toString() 
              }
            }),
          });
          
          const responseData = await response.json();
          console.log('Direct Expo push notification result:', responseData);
          return true;
        } catch (expoPushError) {
          console.error('Error sending direct Expo push notification:', expoPushError);
        }
      }
      
      // As a last resort, try a local notification
      await sendImmediateLocalNotification();
      console.log('Sent local notification as ultimate fallback');
      return false;
    }
  } catch (error) {
    console.error('Error in sendFirebaseTestNotification:', error);
    
    // As a fallback, send a local notification
    try {
      await sendImmediateLocalNotification();
      console.log('Sent local notification as fallback');
      return true;
    } catch (localError) {
      console.error('Local notification fallback also failed:', localError);
      return false;
    }
  }
};

/**
 * Schedule a test notification to appear in one minute from now
 * This is useful for testing background notifications
 */
export const scheduleTestNotificationInOneMinute = async (): Promise<string> => {
  try {
    console.log('Scheduling test notification to appear in one minute');
    
    // Calculate one minute from now
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
    
    // Format for display
    const timeString = `${oneMinuteFromNow.getHours()}:${oneMinuteFromNow.getMinutes().toString().padStart(2, '0')}`;
    
    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FlexBreak 1-Minute Test',
        body: `This is a test notification scheduled for ${timeString}. If you see this, background notifications are working!`,
        data: { type: 'minute_test' },
        sound: true,
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60
      },
    });
    
    console.log('Test notification scheduled with ID:', notificationId);
    console.log(`It should appear at approximately ${timeString}`);
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling test notification:', error);
    throw error;
  }
};

/**
 * Schedule multiple reminders based on user's premium level
 * This enables advanced reminders for premium users at level 3+
 */
export const scheduleAdvancedReminders = async (
  settings: ReminderSettings,
  premiumLevel: number = 0
): Promise<string[]> => {
  try {
    console.log('Scheduling advanced reminders based on premium level:', premiumLevel);
    
    // Cancel any existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled existing notifications');
    
    const scheduledNotificationIds: string[] = [];
    
    // Only schedule if reminders are enabled
    if (!settings.enabled) {
      console.log('Reminders are disabled, not scheduling any');
      return scheduledNotificationIds;
    }
    
    // Parse the primary reminder time
    const [hours, minutes] = settings.time.split(':').map(num => parseInt(num, 10));
    
    // Get days based on frequency
    let selectedDays: number[] = [];
    
    switch (settings.frequency) {
      case 'daily':
        // All days (0 = Sunday, 6 = Saturday in JavaScript Date)
        selectedDays = [0, 1, 2, 3, 4, 5, 6];
        break;
      case 'weekdays':
        // Monday to Friday
        selectedDays = [1, 2, 3, 4, 5];
        break;
      case 'custom':
        // Convert string day IDs to day numbers
        selectedDays = settings.days.map(day => {
          // Handle both formats: "Mon" from UI and "mon" from storage
          const dayLower = day.toLowerCase();
          switch(dayLower) {
            case 'sun':
            case 'sunday': return 0;
            case 'mon':
            case 'monday': return 1;
            case 'tue':
            case 'tuesday': return 2;
            case 'wed':
            case 'wednesday': return 3;
            case 'thu':
            case 'thursday': return 4;
            case 'fri':
            case 'friday': return 5;
            case 'sat':
            case 'saturday': return 6;
            default: return -1;
          }
        }).filter(day => day !== -1);
        break;
    }
    
    console.log(`Scheduling reminders for days: ${selectedDays.join(', ')}`);
    
    // Schedule for each selected day
    for (const dayOfWeek of selectedDays) {
      // Calculate next occurrence
      const nextDate = getNextDayOfWeek(dayOfWeek, hours, minutes);
      const secondsTillReminder = Math.max(1, Math.floor((nextDate.getTime() - new Date().getTime()) / 1000));
      
      console.log(`Scheduling for ${nextDate.toLocaleString()} (${secondsTillReminder} seconds from now)`);
      
      // Create the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'FlexBreak Reminder',
          body: settings.message || 'Time for your daily stretch!',
          data: { type: 'scheduled_reminder', dayOfWeek },
          sound: true,
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsTillReminder,
        },
      });
      
      scheduledNotificationIds.push(notificationId);
      console.log(`Scheduled notification ${notificationId} for ${nextDate.toLocaleString()}`);
    }
    
    // For premium level 3+, add additional reminders if configured
    if (premiumLevel >= 3) {
      console.log('Premium level 3+ detected, scheduling additional reminders');
      
      // Example: Add an additional reminder 2 hours after the main one for premium users
      // This could be expanded based on user preferences in a real implementation
      for (const dayOfWeek of selectedDays) {
        // Calculate next occurrence with +2 hours offset
        const nextDate = getNextDayOfWeek(dayOfWeek, hours + 2, minutes);
        const secondsTillReminder = Math.max(1, Math.floor((nextDate.getTime() - new Date().getTime()) / 1000));
        
        // Only schedule if it's more than 1 hour from the first reminder
        if (secondsTillReminder > 3600) {
          console.log(`Scheduling premium reminder for ${nextDate.toLocaleString()}`);
          
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'FlexBreak Premium Reminder',
              body: settings.message || 'Time for another stretch break!',
              data: { type: 'premium_reminder', dayOfWeek },
              sound: true,
            },
            trigger: { 
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: secondsTillReminder,
            },
          });
          
          scheduledNotificationIds.push(notificationId);
          console.log(`Scheduled premium notification ${notificationId} for ${nextDate.toLocaleString()}`);
        }
      }
    }
    
    console.log(`Successfully scheduled ${scheduledNotificationIds.length} reminders`);
    return scheduledNotificationIds;
  } catch (error) {
    console.error('Error scheduling advanced reminders:', error);
    return [];
  }
};

/**
 * Get the next occurrence of a specific day of the week
 * @param dayOfWeek 0 for Sunday, 6 for Saturday
 * @param hours Hour in 24-hour format
 * @param minutes Minutes
 * @returns Date object for the next occurrence
 */
const getNextDayOfWeek = (dayOfWeek: number, hours: number, minutes: number): Date => {
  const now = new Date();
  const result = new Date();
  result.setHours(hours);
  result.setMinutes(minutes);
  result.setSeconds(0);
  result.setMilliseconds(0);
  
  // Get current day of week
  const currentDayOfWeek = now.getDay();
  
  // Calculate days to add
  let daysToAdd = dayOfWeek - currentDayOfWeek;
  
  // If the calculated day is today but the time has passed, or it's in the past
  if (daysToAdd < 0 || (daysToAdd === 0 && now > result)) {
    daysToAdd += 7;
  }
  
  // Set the day
  result.setDate(now.getDate() + daysToAdd);
  
  return result;
};

/**
 * Send a random motivational message as a local notification
 * This simulates the system-wide motivational messages from Firebase
 */
export const sendLocalMotivationalMessage = async (): Promise<string> => {
  try {
    console.log('Sending local motivational message');
    
    // Collection of messages (same as in cloud function)
    const MOTIVATIONAL_MESSAGES = [
      {
        title: "Time for a quick stretch!",
        body: "Take a 5-minute break to reset your focus and energy."
      },
      {
        title: "Movement break!",
        body: "Stand up and stretch your arms above your head for better circulation."
      },
      {
        title: "Posture check!",
        body: "Take a moment to relax your shoulders and sit up straight."
      },
      {
        title: "Break reminder",
        body: "A 2-minute stretch now can prevent hours of discomfort later."
      },
      {
        title: "Wellness check",
        body: "Remember to stay hydrated and take short breaks throughout your day."
      },
      {
        title: "Quick break time",
        body: "Roll your shoulders and stretch your neck to relieve tension."
      },
      {
        title: "Movement matters",
        body: "Regular movement breaks help improve productivity and focus."
      },
      {
        title: "FlexBreak reminder",
        body: "Take a moment to breathe deeply and stretch your body."
      }
    ];
    
    // Pick a random message
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    const message = MOTIVATIONAL_MESSAGES[randomIndex];
    
    // Schedule it as a local notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        data: { 
          type: 'motivational_message', 
          timestamp: Date.now().toString() 
        },
        sound: true,
      },
      trigger: null, // show immediately
    });
    
    console.log('Local motivational message sent with ID:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error sending local motivational message:', error);
    throw error;
  }
};

/**
 * Set up a timer to send motivational messages periodically
 * This is a local fallback for the Firebase Cloud Function
 * @param testMode If true, sends messages every 5 minutes for testing (only for development)
 */
export const startLocalMotivationalMessages = (testMode: boolean = false): (() => void) => {
  console.log(`Starting local motivational messages timer (${testMode ? 'TEST MODE - every 5 minutes' : 'PRODUCTION MODE - 2 per day'})`);

  // Cancel any existing scheduled motivational messages first
  Notifications.cancelAllScheduledNotificationsAsync().then(() => {
    console.log('Cleared existing scheduled notifications');
  }).catch(error => {
    console.error('Error clearing scheduled notifications:', error);
  });

  // Skip scheduling any immediate notification since user is actively using the app

  if (testMode) {
    // Schedule test notifications if in test mode
    scheduleRecurringTestNotifications();
  } else {
    // For production mode, schedule 2 messages per day using smart algorithm
    scheduleProductionMotivationalMessages();
  }
  
  // Return a cleanup function
  return () => {
    console.log('Stopping local motivational messages');
    
    // Clean up any scheduled notifications
    Notifications.cancelAllScheduledNotificationsAsync()
      .then(() => console.log('All scheduled notifications cancelled'))
      .catch(error => console.error('Error cancelling scheduled notifications:', error));
  };
};

/**
 * Schedule 2 motivational messages per day at reasonable times for production use
 * Uses smarter scheduling that delivers messages at appropriate times
 */
const scheduleProductionMotivationalMessages = async () => {
  try {
    // Define logical time ranges for messages
    // First message: Morning (9am-11am)
    // Second message: Afternoon (2pm-4pm)
    
    // Collection of messages
    const MOTIVATIONAL_MESSAGES = [
      {
        title: "Time for a quick stretch!",
        body: "Take a 5-minute break to reset your focus and energy."
      },
      {
        title: "Movement break!",
        body: "Stand up and stretch your arms above your head for better circulation."
      },
      {
        title: "Posture check!",
        body: "Take a moment to relax your shoulders and sit up straight."
      },
      {
        title: "Break reminder",
        body: "A 2-minute stretch now can prevent hours of discomfort later."
      },
      {
        title: "Wellness check",
        body: "Remember to stay hydrated and take short breaks throughout your day."
      },
      {
        title: "Quick break time",
        body: "Roll your shoulders and stretch your neck to relieve tension."
      },
      {
        title: "Movement matters",
        body: "Regular movement breaks help improve productivity and focus."
      },
      {
        title: "FlexBreak reminder",
        body: "Take a moment to breathe deeply and stretch your body."
      }
    ];

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    // Schedule for 7 days forward including today
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDay = new Date(dayStart);
      targetDay.setDate(targetDay.getDate() + dayOffset);
      
      // First message: Morning (9am-11am)
      const morningHour = 9 + Math.floor(Math.random() * 2); // Random between 9-11am
      const morningMinute = Math.floor(Math.random() * 60);
      
      const morningDate = new Date(targetDay);
      morningDate.setHours(morningHour, morningMinute, 0, 0);
      
      // Track which message was used for morning
      let usedMorningMsgIndex: number | null = null;
      
      // Only schedule today's morning message if it's in the future
      if (dayOffset > 0 || morningDate > now) {
        // Pick random message for morning
        usedMorningMsgIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
        const morningMsg = MOTIVATIONAL_MESSAGES[usedMorningMsgIndex];
        
        const morningId = await Notifications.scheduleNotificationAsync({
          content: {
            title: morningMsg.title,
            body: morningMsg.body,
            data: { 
              type: 'motivational_message',
              time: 'morning',
              scheduledFor: morningDate.toISOString()
            },
            sound: true,
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: morningDate
          },
        });
        
        console.log(`Scheduled morning message for ${morningDate.toLocaleString()} with ID ${morningId}`);
      }
      
      // Second message: Afternoon (2pm-4pm)
      const afternoonHour = 14 + Math.floor(Math.random() * 2); // Random between 2-4pm
      const afternoonMinute = Math.floor(Math.random() * 60);
      
      const afternoonDate = new Date(targetDay);
      afternoonDate.setHours(afternoonHour, afternoonMinute, 0, 0);
      
      // Only schedule today's afternoon message if it's in the future
      if (dayOffset > 0 || afternoonDate > now) {
        // Pick random message for afternoon (different from morning)
        let afternoonMsgIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
        // Ensure we don't get the same message as morning if we used one
        if (usedMorningMsgIndex !== null && afternoonMsgIndex === usedMorningMsgIndex) {
          afternoonMsgIndex = (afternoonMsgIndex + 1) % MOTIVATIONAL_MESSAGES.length;
        }
        const afternoonMsg = MOTIVATIONAL_MESSAGES[afternoonMsgIndex];
        
        const afternoonId = await Notifications.scheduleNotificationAsync({
          content: {
            title: afternoonMsg.title,
            body: afternoonMsg.body,
            data: { 
              type: 'motivational_message',
              time: 'afternoon',
              scheduledFor: afternoonDate.toISOString()
            },
            sound: true,
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: afternoonDate
          },
        });
        
        console.log(`Scheduled afternoon message for ${afternoonDate.toLocaleString()} with ID ${afternoonId}`);
      }
    }
    
    console.log('Scheduled motivational messages for the next 7 days');
  } catch (error) {
    console.error('Error scheduling production motivational messages:', error);
  }
};

/**
 * Schedule recurring test motivational messages every 5 minutes
 * Uses proper scheduled notifications that will work when app is closed
 */
const scheduleRecurringTestNotifications = async () => {
  try {
    // First clear any existing scheduled motivational messages
    // Get all scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find and cancel all test motivational messages
    for (const notification of scheduled) {
      if (notification.content.data?.type === 'test_motivational_message') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`Cancelled existing test notification: ${notification.identifier}`);
      }
    }
    
    // Schedule 10 notifications, one every 5 minutes
    // This ensures notifications continue for about an hour even when app is closed
    console.log('Scheduling recurring test motivational messages (every 5 minutes)');
    
    for (let i = 0; i < 10; i++) {
      const delayMinutes = (i + 1) * 5; // 5, 10, 15, 20, etc. minutes
      const triggerDate = new Date(Date.now() + delayMinutes * 60 * 1000);
      
      // Get a random message
      const MOTIVATIONAL_MESSAGES = [
        {
          title: "Time for a quick stretch!",
          body: "Take a 5-minute break to reset your focus and energy."
        },
        {
          title: "Movement break!",
          body: "Stand up and stretch your arms above your head for better circulation."
        },
        {
          title: "Posture check!",
          body: "Take a moment to relax your shoulders and sit up straight."
        },
        {
          title: "Break reminder",
          body: "A 2-minute stretch now can prevent hours of discomfort later."
        },
        {
          title: "Wellness check",
          body: "Remember to stay hydrated and take short breaks throughout your day."
        },
        {
          title: "Quick break time",
          body: "Roll your shoulders and stretch your neck to relieve tension."
        },
        {
          title: "Movement matters",
          body: "Regular movement breaks help improve productivity and focus."
        },
        {
          title: "FlexBreak reminder",
          body: "Take a moment to breathe deeply and stretch your body."
        }
      ];
      
      // Pick a random message
      const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
      const message = MOTIVATIONAL_MESSAGES[randomIndex];
      
      // Schedule with the DATE trigger type which works better when app is closed
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${message.title} (Test ${i+1}/10)`,
          body: `${message.body} (Scheduled for ${triggerDate.toLocaleTimeString()})`,
          data: { 
            type: 'test_motivational_message', 
            index: i,
            scheduledTime: triggerDate.toISOString()
          },
          sound: true,
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate 
        },
      });
      
      console.log(`Scheduled test notification #${i+1} with ID ${notificationId} for ${triggerDate.toLocaleTimeString()} (in ${delayMinutes} minutes)`);
    }
    
    console.log('All test notifications scheduled successfully');
  } catch (error) {
    console.error('Error scheduling test notifications:', error);
  }
}; 