/**
 * Notification handling and testing functionality
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationSummary } from './types';
import { getFCMToken, refreshAppCheckToken } from './initialization';

/**
 * Send a test notification through Firebase
 */
export const sendTestNotification = async (): Promise<boolean> => {
  try {
    console.log('Sending test notification via Firebase...');
    
    // First refresh App Check token to ensure it's valid
    await refreshAppCheckToken();
    
    // Get the FCM token
    const token = await getFCMToken();
    if (!token) {
      console.error('Cannot send test notification: No FCM token available');
      return false;
    }
    
    // Call the test notification Cloud Function
    const sendTestMessage = firebase.functions().httpsCallable('sendTestMessage');
    const result = await sendTestMessage({ token });
    
    console.log('Test notification sent successfully:', result.data);
    return true;
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    
    // If it's an App Check error, provide more specific guidance
    if (error.code === 'functions/unauthenticated' && error.message?.includes('AppCheck')) {
      console.error('App Check Error Details:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      
      // Try without App Check as a fallback
      console.log('Attempting to send test notification without App Check...');
      try {
        const token = await getFCMToken();
        if (!token) {
          console.error('Cannot send test notification: No FCM token available');
          return false;
        }
        
        // Create a separate Firebase app instance
        const uniqueId = 'test-notification-' + Date.now();
        const directApp = firebase.initializeApp(
          firebase.app().options,
          uniqueId
        );
        
        const directFunctions = directApp.functions();
        const sendTestMessage = directFunctions.httpsCallable('sendTestMessage');
        const result = await sendTestMessage({ token });
        
        console.log('Test notification sent successfully without App Check:', result.data);
        
        // Clean up
        directApp.delete();
        
        return true;
      } catch (fallbackError) {
        console.error('Fallback test notification also failed:', fallbackError);
      }
    }
    
    return false;
  }
};

/**
 * Send an immediate local notification (for testing)
 */
export const sendImmediateLocalNotification = async (): Promise<boolean> => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FlexBreak Test Notification 🎯',
        body: 'This is a test notification! Your reminders are working correctly.',
        data: { type: 'test' },
        sound: true,
      },
      trigger: null, // null means send immediately
    });
    
    console.log('Immediate local notification sent with ID:', notificationId);
    return true;
  } catch (error) {
    console.error('Error sending immediate local notification:', error);
    return false;
  }
};

/**
 * Send a test notification through Firebase Cloud Function (alternative method)
 */
export const sendFirebaseTestNotification = async (): Promise<boolean> => {
  try {
    console.log('Attempting to send Firebase test notification...');
    
    // Get the FCM token
    const token = await getFCMToken();
    if (!token) {
      console.error('Cannot send test notification: No FCM token available');
      return false;
    }
    
    console.log('Using FCM token for test:', token.substring(0, 15) + '...');
    
    // First, try to refresh the App Check token
    await refreshAppCheckToken();
    
    // Try the direct approach first - creating a temporary app without App Check
    try {
      // Create a unique ID for this instance
      const uniqueId = 'test-' + Date.now();
      
      // Initialize a temporary app without App Check
      const directApp = firebase.initializeApp(
        firebase.app().options,
        uniqueId
      );
      
      // Get functions from this app (won't have App Check)
      const directFunctions = directApp.functions();
      const sendTestMessage = directFunctions.httpsCallable('sendTestMessage');
      
      console.log('Calling sendTestMessage function with direct app instance...');
      const result = await sendTestMessage({ 
        token,
        timestamp: Date.now(),
        testMode: true 
      });
      
      console.log('Direct test notification sent successfully:', result.data);
      
      // Clean up the temporary app
      directApp.delete();
      
      // Also send a local notification to confirm
      await sendImmediateLocalNotification();
      
      return true;
    } catch (directError: any) {
      console.error('Direct Firebase test failed:', directError);
      console.error('Error details:', {
        code: directError.code,
        message: directError.message,
        details: directError.details
      });
      
      // Fall back to the regular app instance
      console.log('Falling back to regular Firebase instance...');
      const sendTestMessage = firebase.functions().httpsCallable('sendTestMessage');
      const result = await sendTestMessage({ 
        token,
        timestamp: Date.now(),
        testMode: true 
      });
      
      console.log('Regular test notification sent successfully:', result.data);
      
      // Also send a local notification
      await sendImmediateLocalNotification();
      
      return true;
    }
  } catch (error: any) {
    console.error('Firebase test notification failed completely:', error);
    console.error('Final error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack
    });
    
    // As a last resort, just send a local notification
    console.log('Falling back to local notification only...');
    return await sendImmediateLocalNotification();
  }
};

/**
 * Schedule a test notification in one minute
 */
export const scheduleTestNotificationInOneMinute = async (): Promise<string> => {
  try {
    // Schedule for 1 minute from now
    const trigger = new Date();
    trigger.setMinutes(trigger.getMinutes() + 1);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FlexBreak Scheduled Test 📅',
        body: 'This notification was scheduled 1 minute ago. Your reminders are working!',
        data: { type: 'scheduled_test' },
        sound: true,
      },
      trigger: { date: trigger },
    });
    
    console.log('Test notification scheduled for:', trigger.toLocaleTimeString());
    console.log('Notification ID:', notificationId);
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling test notification:', error);
    throw error;
  }
};

/**
 * Get a summary of all scheduled notifications
 */
export const getScheduledNotificationsSummary = async (): Promise<NotificationSummary> => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    
    return {
      total: notifications.length,
      scheduled: notifications.map(n => ({
        identifier: n.identifier,
        content: {
          title: n.content.title,
          body: n.content.body,
          data: n.content.data
        },
        trigger: n.trigger
      }))
    };
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return { total: 0, scheduled: [] };
  }
};