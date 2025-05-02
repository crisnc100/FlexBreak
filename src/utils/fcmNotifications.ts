import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Storage key for the FCM token
const FCM_TOKEN_KEY = 'fcm_token';

/**
 * Initialize Firebase Cloud Messaging
 */
export const initializeFCM = async (): Promise<boolean> => {
  try {
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled = 
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (enabled) {
      console.log('Firebase messaging authorized');
      
      // Get and save the FCM token
      const token = await messaging().getToken();
      await saveToken(token);
      
      // Set up token refresh listener
      messaging().onTokenRefresh(token => {
        saveToken(token);
      });
      
      // Set up message handlers
      setupMessageHandlers();
      
      return true;
    } else {
      console.log('Firebase messaging not authorized');
      return false;
    }
  } catch (error) {
    console.error('Error initializing FCM:', error);
    return false;
  }
};

/**
 * Save the FCM token to AsyncStorage and potentially to your backend
 */
const saveToken = async (token: string): Promise<void> => {
  try {
    // Save locally
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    console.log('FCM token saved:', token);
    
    // TODO: In a production app, you would also send this token
    // to your Firebase backend to associate it with the user
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

/**
 * Set up Firebase message handlers for foreground and background messages
 */
const setupMessageHandlers = () => {
  // Handle foreground messages
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    console.log('Foreground message received:', remoteMessage);
    
    // For iOS, we need to show the notification manually in foreground
    if (Platform.OS === 'ios') {
      // Extract notification data
      const { notification } = remoteMessage;
      if (notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title || 'FlexBreak',
            body: notification.body || '',
            data: remoteMessage.data || {},
            sound: true,
          },
          trigger: null, // Show immediately
        });
      }
    }
  });
  
  // For Android, background messages are handled by the system
  // For iOS, we need to register background handler
  if (Platform.OS === 'ios') {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message received:', remoteMessage);
      // The system will show the notification automatically
      return Promise.resolve();
    });
  }
  
  // Return unsubscribe function to clean up when needed
  return () => {
    unsubscribeForeground();
  };
};

/**
 * Get the currently stored FCM token
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(FCM_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Toggle system notifications (motivational messages)
 */
export const setSystemNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem('system_notifications_enabled', enabled.toString());
    console.log('System notifications set to:', enabled);
    
    // TODO: In a production app, you would update a user property in Firebase
    // to control which users receive system notifications
  } catch (error) {
    console.error('Error setting system notifications:', error);
  }
};

/**
 * Check if system notifications are enabled
 */
export const getSystemNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem('system_notifications_enabled');
    return value === null ? true : value === 'true'; // Default to true
  } catch (error) {
    console.error('Error getting system notifications setting:', error);
    return true; // Default to true on error
  }
}; 