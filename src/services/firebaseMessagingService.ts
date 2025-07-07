/**
 * Firebase Cloud Messaging Service
 * Used specifically for AI Flex Coach notifications that need background handling
 * Regular scheduled notifications continue to use Expo notifications
 */

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const FCM_TOKEN_KEY = '@fcm_token_for_ai';
const FCM_TOKEN_TIMESTAMP = '@fcm_token_timestamp';

class FirebaseMessagingService {
  private static instance: FirebaseMessagingService;
  private fcmToken: string | null = null;

  private constructor() {}

  static getInstance(): FirebaseMessagingService {
    if (!FirebaseMessagingService.instance) {
      FirebaseMessagingService.instance = new FirebaseMessagingService();
    }
    return FirebaseMessagingService.instance;
  }

  /**
   * Initialize Firebase Messaging for AI notifications only
   */
  async initialize(): Promise<void> {
    try {
      // Request permission (iOS only)
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                       authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        if (!enabled) {
          console.log('FCM permission not granted for AI notifications');
          return;
        }
      }

      // Get FCM token
      await this.getFCMToken();

      // Set up background message handler for AI responses
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('AI notification received in background:', remoteMessage);
        // The actual notification will be displayed by FCM
        // This is just for logging/analytics
      });

      console.log('Firebase Messaging initialized for AI notifications');
    } catch (error) {
      console.error('Error initializing Firebase Messaging:', error);
    }
  }

  /**
   * Get FCM token for AI notifications
   */
  async getFCMToken(): Promise<string | null> {
    try {
      // Check cached token
      const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      const tokenTimestamp = await AsyncStorage.getItem(FCM_TOKEN_TIMESTAMP);
      
      // Use cached token if less than 7 days old
      if (cachedToken && tokenTimestamp) {
        const age = Date.now() - parseInt(tokenTimestamp);
        if (age < 7 * 24 * 60 * 60 * 1000) {
          this.fcmToken = cachedToken;
          return cachedToken;
        }
      }

      // Get new token
      const token = await messaging().getToken();
      
      // Cache it
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      await AsyncStorage.setItem(FCM_TOKEN_TIMESTAMP, Date.now().toString());
      
      this.fcmToken = token;
      console.log('Got FCM token for AI notifications:', token.substring(0, 20) + '...');
      
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Check if we have a valid FCM token
   */
  hasValidToken(): boolean {
    return !!this.fcmToken;
  }

  /**
   * Get the current FCM token (for AI cloud functions)
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Listen for token refresh
   */
  onTokenRefresh(callback: (token: string) => void): () => void {
    const unsubscribe = messaging().onTokenRefresh(async (token) => {
      console.log('FCM token refreshed for AI notifications');
      this.fcmToken = token;
      
      // Update cached token
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      await AsyncStorage.setItem(FCM_TOKEN_TIMESTAMP, Date.now().toString());
      
      callback(token);
    });

    return unsubscribe;
  }
}

export default FirebaseMessagingService.getInstance();