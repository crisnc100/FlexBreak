/**
 * FCM (Firebase Cloud Messaging) Service
 * Handles FCM token management and cloud function calls for AI notifications
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';
import 'firebase/compat/firestore';
import { Platform } from 'react-native';
import { KEYS } from './storageService';

// FCM token storage key
const FCM_TOKEN_KEY = '@fcm_token';
const FCM_TOKEN_LAST_UPDATE = '@fcm_token_last_update';

export class FCMService {
  private static instance: FCMService;
  private functions: firebase.functions.Functions;
  private firestore: firebase.firestore.Firestore;

  private constructor() {
    this.functions = firebase.functions();
    this.firestore = firebase.firestore();
    
    // Use emulator in development
    if (__DEV__) {
      this.functions.useEmulator('localhost', 5001);
    }
  }

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Get or generate FCM token for push notifications
   */
  async getFCMToken(): Promise<string | null> {
    try {
      // Check if we have a cached token
      const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      const lastUpdate = await AsyncStorage.getItem(FCM_TOKEN_LAST_UPDATE);
      
      // Refresh token if it's older than 30 days
      if (cachedToken && lastUpdate) {
        const daysSinceUpdate = (Date.now() - parseInt(lastUpdate)) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 30) {
          console.log('Using cached FCM token');
          return cachedToken;
        }
      }

      // Get push notification token
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('Push notification permissions not granted');
        return null;
      }

      // Get Expo push token first
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId
      });

      if (!expoPushToken) {
        console.error('Failed to get Expo push token');
        return null;
      }

      // For FCM, we need the native token, not the Expo token
      // This is platform specific
      let nativeToken: string | null = null;

      if (Platform.OS === 'android') {
        // On Android, get the FCM token directly
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        nativeToken = deviceToken.data;
      } else if (Platform.OS === 'ios') {
        // On iOS, we need to handle this differently
        // For iOS with FCM, we'd need to use native modules
        // For now, we'll use Expo Push Token which works with FCM
        nativeToken = expoPushToken.data;
      }

      if (nativeToken) {
        // Cache the token
        await AsyncStorage.setItem(FCM_TOKEN_KEY, nativeToken);
        await AsyncStorage.setItem(FCM_TOKEN_LAST_UPDATE, Date.now().toString());
        
        // Store token in Firestore for user
        await this.updateUserFCMToken(nativeToken);
      }

      return nativeToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Update user's FCM token in Firestore
   */
  private async updateUserFCMToken(token: string): Promise<void> {
    try {
      const userId = await AsyncStorage.getItem('@user_id');
      if (!userId) return;

      await this.firestore.collection('users').doc(userId).set({
        fcmToken: token,
        fcmTokenUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        platform: Platform.OS,
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
        }
      }, { merge: true });

      console.log('FCM token updated in Firestore');
    } catch (error) {
      console.error('Error updating FCM token in Firestore:', error);
    }
  }

  /**
   * Handle AI notification response through cloud function
   */
  async handleAINotificationResponse(
    userMessage: string,
    userId: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      const fcmToken = await this.getFCMToken();
      if (!fcmToken) {
        throw new Error('No FCM token available');
      }

      // Call the cloud function
      const handleAIResponse = this.functions.httpsCallable('handleAINotificationResponse');
      const result = await handleAIResponse({
        userId,
        userMessage,
        fcmToken,
        conversationHistory
      });

      return {
        success: true,
        response: result.data.response
      };
    } catch (error: any) {
      console.error('Error calling AI notification cloud function:', error);
      return {
        success: false,
        error: error.message || 'Failed to process AI response'
      };
    }
  }

  /**
   * Clear cached FCM token (useful for logout)
   */
  async clearFCMToken(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([FCM_TOKEN_KEY, FCM_TOKEN_LAST_UPDATE]);
      
      // Also clear from Firestore
      const userId = await AsyncStorage.getItem('@user_id');
      if (userId) {
        await this.firestore.collection('users').doc(userId).update({
          fcmToken: firebase.firestore.FieldValue.delete()
        });
      }
    } catch (error) {
      console.error('Error clearing FCM token:', error);
    }
  }

  /**
   * Check if FCM is available and properly configured
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if we can get a token
      const token = await this.getFCMToken();
      return !!token;
    } catch (error) {
      console.error('FCM availability check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default FCMService.getInstance();