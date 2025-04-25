import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storageService from './storageService';
import { getToken, onMessage } from 'firebase/messaging';
import { initializeMessaging } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Constants from 'expo-constants';

// FCM token storage key
const FCM_TOKEN_KEY = 'fcm_token';
const DEVICE_ID_KEY = 'device_id';

// Generate a unique device ID
const generateDeviceId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Get or create a device ID
export const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return generateDeviceId(); // Fallback to new ID if storage fails
  }
};

// Get the device push token
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications not available on simulator/emulator');
      return null;
    }
    
    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    // Get Expo push token
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId,
    });
    
    return token;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
};

// Initialize FCM
export const initializeFCM = async (): Promise<void> => {
  try {
    // Set up notification channels for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      await Notifications.setNotificationChannelAsync('reminder', {
        name: 'Stretch Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9800',
        description: 'Notifications to remind you to stretch',
      });
      
      await Notifications.setNotificationChannelAsync('streak', {
        name: 'Streak Protection',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF5722',
        description: 'Notifications to help protect your streak',
      });
    }
    
    // When we have a FCM setup on the server, we can initialize messaging
    const expoPushToken = await getExpoPushToken();
    if (expoPushToken) {
      await registerPushToken(expoPushToken);
    }
    
    console.log('FCM initialized successfully');
  } catch (error) {
    console.error('Error initializing FCM:', error);
  }
};

// Register the Expo push token with our Firebase backend
export const registerPushToken = async (
  token: string, 
  updateExisting: boolean = true
): Promise<boolean> => {
  try {
    // Save token locally
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    
    // Get device ID
    const deviceId = await getDeviceId();
    
    // Get user's premium status
    const isPremium = await storageService.getIsPremium();
    
    // Get user notification preferences
    const reminderEnabled = await storageService.getReminderEnabled();
    
    // Save token to Firestore
    await setDoc(doc(db, 'devices', deviceId), {
      token,
      device: {
        platform: Platform.OS,
        model: Device.modelName || 'Unknown',
        osVersion: Platform.Version,
      },
      settings: {
        isPremium,
        reminderEnabled,
      },
      lastUpdated: new Date().toISOString(),
    }, { merge: updateExisting });
    
    console.log('Push token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
};

// Update the notification preferences in Firebase
export const updateNotificationPreferences = async (): Promise<boolean> => {
  try {
    // Get device ID
    const deviceId = await getDeviceId();
    
    // Get user's premium status
    const isPremium = await storageService.getIsPremium();
    
    // Get notification preferences
    const reminderEnabled = await storageService.getReminderEnabled();
    const reminderTime = await storageService.getReminderTime();
    
    // Save updated preferences to Firestore
    await setDoc(doc(db, 'devices', deviceId), {
      settings: {
        isPremium,
        reminderEnabled,
        reminderTime,
      },
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
    
    console.log('Notification preferences updated in Firebase');
    return true;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
};

// Set up message listener for FCM messages received while app is in foreground
export const setupMessageListener = (onForegroundMessage: (message: any) => void): () => void => {
  try {
    const messaging = initializeMessaging();
    if (!messaging) {
      console.log('Firebase messaging not initialized, skipping message listener setup');
      return () => {};
    }
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      onForegroundMessage(payload);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up message listener:', error);
    return () => {};
  }
}; 