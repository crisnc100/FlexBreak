import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS, EXPO_CONFIG } from '../constants/reminderDefaults';

/**
 * Get the current FCM token (using Expo's push notification token)
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    // First check if we have a stored token
    let token = await AsyncStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
    
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
          projectId: EXPO_CONFIG.PROJECT_ID,
        });
        
        token = expoPushToken.data;
        console.log('Generated Expo push token:', token);
        
        // Save the token
        await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
        
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
}

/**
 * Save token to Firestore
 */
async function saveTokenToFirestore(token: string): Promise<void> {
  if (firebase.apps.length === 0) return;
  
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

/**
 * Force clear the stored FCM token to get a new one
 * This helps switch from simulated to real tokens
 */
export async function clearStoredToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.FCM_TOKEN);
    console.log('Cleared stored FCM token - will generate a new one on next request');
  } catch (error) {
    console.error('Error clearing stored FCM token:', error);
  }
}