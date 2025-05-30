/**
 * Firebase initialization and token management
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/messaging';
import 'firebase/compat/app-check';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { FCM_TOKEN_KEY, LAST_TOKEN_UPDATE_KEY, TOKEN_UPDATE_INTERVAL } from './constants';

// Token request tracking to prevent multiple simultaneous requests
let tokenRequestInProgress: Promise<string | null> | null = null;

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
  // If a token request is already in progress, wait for it
  if (tokenRequestInProgress) {
    console.log('Token request already in progress, waiting...');
    return tokenRequestInProgress;
  }
  
  // Start new token request
  tokenRequestInProgress = getTokenInternal();
  
  try {
    const result = await tokenRequestInProgress;
    return result;
  } finally {
    tokenRequestInProgress = null;
  }
};

/**
 * Internal function to actually get the token
 */
const getTokenInternal = async (): Promise<string | null> => {
  try {
    // First check if we have a stored token
    let token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    
    // Check if we need to update the token (every 30 days)
    const lastUpdate = await AsyncStorage.getItem(LAST_TOKEN_UPDATE_KEY);
    const shouldUpdate = !lastUpdate || 
      (Date.now() - parseInt(lastUpdate)) > TOKEN_UPDATE_INTERVAL;
    
    if (!token || shouldUpdate) {
      console.log(!token ? 'No stored token found, requesting a new one' : 'Token needs refresh');
      
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
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
        await AsyncStorage.setItem(LAST_TOKEN_UPDATE_KEY, Date.now().toString());
        
        // Save the token to Firestore if Firebase is initialized
        await saveTokenToFirestore(token);
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
 * Save FCM token to Firestore
 */
const saveTokenToFirestore = async (token: string): Promise<void> => {
  // Skip Firestore operations if running in Expo Go or if Firebase is not properly initialized
  if (!firebase.apps.length || !firebase.firestore) {
    console.log('Skipping Firestore token save - Firebase not fully initialized');
    return;
  }
  
  try {
    // Check if Firestore is available
    const firestore = firebase.firestore();
    if (!firestore) {
      console.log('Firestore not available, skipping token save');
      return;
    }
    
    const user = firebase.auth().currentUser;
    if (user) {
      // Store the token in Firestore with the user's ID
      await firestore.collection('fcm_tokens').doc(user.uid).set({
        token,
        device: Platform.OS,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userId: user.uid
      });
      console.log('Saved real FCM token to Firestore for user:', user.uid);
    } else {
      // Create a device-specific ID for anonymous users
      const deviceId = `device_${Platform.OS}_${Date.now()}`;
      await firestore.collection('fcm_tokens').doc(deviceId).set({
        token,
        device: Platform.OS,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        anonymous: true
      });
      console.log('Saved FCM token to Firestore with device ID:', deviceId);
    }
  } catch (firestoreError: any) {
    // Handle specific Expo Go native module errors gracefully
    if (firestoreError.message?.includes('Native module not found')) {
      console.log('Running in Expo Go - Firestore operations not available');
    } else {
      console.error('Error saving FCM token to Firestore:', firestoreError);
    }
  }
};

/**
 * Try to refresh the App Check token, but continue if it fails
 * This ensures we have a fresh token for each request when possible
 * But doesn't block operations if App Check is misconfigured
 */
export const refreshAppCheckToken = async (): Promise<void> => {
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
 * Clear stored FCM token
 */
export const clearStoredToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    await AsyncStorage.removeItem(LAST_TOKEN_UPDATE_KEY);
    console.log('Cleared stored FCM token and last update time');
  } catch (error) {
    console.error('Error clearing stored token:', error);
  }
};

/**
 * Setup message handlers for incoming notifications
 */
export const setupMessageHandlers = (): (() => void) => {
  // Firebase Cloud Messaging handlers
  let unsubscribeFirebase: (() => void) | null = null;
  
  if (firebase.apps.length > 0) {
    try {
      const messaging = firebase.messaging();
      
      // Handle messages when the app is in the foreground
      unsubscribeFirebase = messaging.onMessage((payload) => {
        console.log('FCM message received in foreground:', payload);
        
        // Display a local notification since FCM won't show it automatically in foreground
        if (payload.notification) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: payload.notification.title || 'FlexBreak',
              body: payload.notification.body || 'You have a new message',
              data: payload.data,
            },
            trigger: null, // Show immediately
          });
        }
      });
      
      console.log('Firebase message handlers setup');
    } catch (error) {
      console.error('Error setting up Firebase message handlers:', error);
    }
  }
  
  // Expo notification handlers
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });
  
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
  });
  
  // Return cleanup function
  return () => {
    if (unsubscribeFirebase) {
      unsubscribeFirebase();
    }
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
};