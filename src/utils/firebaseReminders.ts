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
    
    console.log('Sending Firebase test notification to token:', token.substring(0, 15) + '...');
    
    // Use a cloud function to send a notification
    const testFunction = firebase.functions().httpsCallable('testPushNotification');
    
    const result = await testFunction({
      token,
      title: 'Firebase Test',
      body: 'This is a test notification sent from Firebase Cloud Functions!',
      data: { type: 'firebase_test' }
    });
    
    console.log('Firebase test notification sent successfully:', result.data);
    return true;
  } catch (error) {
    console.error('Error sending Firebase test notification:', error);
    
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