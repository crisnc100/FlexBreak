import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/app-check';
import { functions } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationType, cancelNotificationsByType } from './notificationManager';
import { STORAGE_KEYS } from '../constants/reminderDefaults';
import { getRandomMotivationalMessage } from '../constants/motivationalMessages';
import { scheduleProductionMotivationalMessages } from '../services/notificationScheduler';
import { NotificationSummary, NotificationDetail } from '../types/reminders';

// Re-export from services for backward compatibility
export { 
  saveReminderSettings,
  getReminderSettings,
  setRemindersEnabled,
  setReminderTime,
  setReminderFrequency,
  setReminderDays,
  setReminderMessage
} from '../services/reminderService';

export { getFCMToken, clearStoredToken } from '../services/fcmTokenService';
export { scheduleAdvancedReminders } from '../services/notificationScheduler';
export type { ReminderSettings, ReminderFrequency } from '../types/reminders';

/**
 * Initialize Firebase for reminders
 * This ensures we have the FCM token and required permissions
 */
export async function initializeFirebaseReminders(): Promise<boolean> {
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
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'true');
      
      return true;
    } else {
      console.log('Firebase messaging not authorized for reminders');
      return false;
    }
  } catch (error) {
    console.error('Error initializing Firebase for reminders:', error);
    return false;
  }
}

/**
 * Send an immediate local notification for testing purposes
 * This bypasses Firebase entirely
 */
export async function sendImmediateLocalNotification(): Promise<boolean> {
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
}

/**
 * Set up Firebase message handlers
 * This should be called during app initialization
 */
export function setupMessageHandlers(): (() => void) {
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
}

/**
 * Get a summary of all scheduled notifications
 * Used by the diagnostics screen
 */
export async function getScheduledNotificationsSummary(): Promise<NotificationSummary> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    let motivational = 0;
    let reminders = 0;
    let other = 0;
    const details: NotificationDetail[] = [];
    
    scheduled.forEach(notification => {
      const type = notification.content.data?.type;
      const title = notification.content.title || 'Untitled';
      
      // Categorize notification
      if (type === 'motivational_message' || title.includes('FlexBreak') || title.includes('motivational')) {
        motivational++;
      } else if (type === 'scheduled_reminder' || type === 'premium_reminder' || title.includes('Reminder')) {
        reminders++;
      } else {
        other++;
      }
      
      // Add to details
      details.push({
        type: type || 'unknown',
        title: title,
        scheduledFor: notification.trigger && 'date' in notification.trigger 
          ? notification.trigger.date 
          : null
      });
    });
    
    // Sort details by scheduled time
    details.sort((a, b) => {
      if (!a.scheduledFor) return 1;
      if (!b.scheduledFor) return -1;
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    });
    
    return {
      total: scheduled.length,
      motivational,
      reminders,
      other,
      details
    };
  } catch (error) {
    console.error('Error getting notification summary:', error);
    return {
      total: 0,
      motivational: 0,
      reminders: 0,
      other: 0,
      details: []
    };
  }
}

/**
 * Send a random motivational message as a local notification
 * This simulates the system-wide motivational messages from Firebase
 */
export async function sendLocalMotivationalMessage(): Promise<string> {
  try {
    console.log('Sending local motivational message');
    
    const message = getRandomMotivationalMessage();
    
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
}

/**
 * Set up a timer to send motivational messages periodically
 * This is a local fallback for the Firebase Cloud Function
 * @param testMode If true, sends messages every 5 minutes for testing (only for development)
 */
export function startLocalMotivationalMessages(testMode: boolean = false): (() => void) {
  console.log(`Starting local motivational messages timer (${testMode ? 'TEST MODE - every 5 minutes' : 'PRODUCTION MODE - 2 per day'})`);

  // Cancel only existing motivational messages, not all notifications
  cancelNotificationsByType([NotificationType.MOTIVATIONAL, NotificationType.PREMIUM_REMINDER]).then(() => {
    console.log('Cleared existing motivational messages');
  }).catch(error => {
    console.error('Error clearing motivational messages:', error);
  });

  // Skip scheduling any immediate notification since user is actively using the app

  if (testMode) {
    // Schedule test notifications if in test mode
  } else {
    // For production mode, schedule 2 messages per day using smart algorithm
    scheduleProductionMotivationalMessages();
  }
  
  // Return a cleanup function
  return () => {
    console.log('Stopping local motivational messages');
    
    // Clean up only motivational messages
    cancelNotificationsByType([NotificationType.MOTIVATIONAL, NotificationType.PREMIUM_REMINDER])
      .then(() => console.log('Motivational messages cancelled'))
      .catch(error => console.error('Error cancelling motivational messages:', error));
  };
}