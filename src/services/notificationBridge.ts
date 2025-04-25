import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as fcmService from './fcmService';
import * as localNotifications from '../utils/notifications';
import * as storageService from './storageService';

// Notification types
export enum NotificationType {
  RANDOM_REMINDER = 'random_reminder',
  SCHEDULED_REMINDER = 'scheduled_reminder',
  STREAK_PROTECTION = 'streak_protection',
  TEST = 'test_notification'
}

// Initialize both notification systems
export const initializeNotifications = async (): Promise<void> => {
  try {
    console.log('Initializing notification systems...');
    
    // Configure notification handling
    localNotifications.configureNotifications();
    
    // Request permissions for both systems
    const permissionGranted = await localNotifications.requestNotificationsPermissions();
    
    if (permissionGranted) {
      console.log('Notification permissions granted');
      
      // Initialize FCM
      await fcmService.initializeFCM();
      
      // Check if reminders are enabled
      const reminderEnabled = await storageService.getReminderEnabled();
      if (reminderEnabled) {
        // Schedule local reminders
        await localNotifications.scheduleRealReminder();
      }
      
      console.log('Notification systems initialized successfully');
    } else {
      console.log('Notification permissions denied');
    }
  } catch (error) {
    console.error('Error initializing notification systems:', error);
  }
};

// Handle notification settings changes
export const handleNotificationSettingsChange = async (enabled: boolean): Promise<void> => {
  try {
    console.log(`Notification settings changed: enabled=${enabled}`);
    
    // Update local storage
    await storageService.saveReminderEnabled(enabled);
    
    if (enabled) {
      // Schedule local reminders
      await localNotifications.scheduleRealReminder();
    } else {
      // Cancel local reminders
      await localNotifications.cancelReminders();
    }
    
    // Update FCM preferences
    await fcmService.updateNotificationPreferences();
    
    console.log('Notification settings updated successfully');
  } catch (error) {
    console.error('Error handling notification settings change:', error);
  }
};

// Handle reminder time change
export const handleReminderTimeChange = async (time: string): Promise<void> => {
  try {
    console.log(`Reminder time changed: ${time}`);
    
    // Update local storage
    await storageService.saveReminderTime(time);
    
    // Check if reminders are enabled
    const reminderEnabled = await storageService.getReminderEnabled();
    if (reminderEnabled) {
      // Cancel existing reminders
      await localNotifications.cancelReminders();
      
      // Schedule new reminders with the updated time
      await localNotifications.scheduleRealReminder();
    }
    
    // Update FCM preferences
    await fcmService.updateNotificationPreferences();
    
    console.log('Reminder time updated successfully');
  } catch (error) {
    console.error('Error handling reminder time change:', error);
  }
};

// Process incoming FCM messages
export const processIncomingFCMMessage = async (message: any): Promise<void> => {
  try {
    console.log('Processing incoming FCM message:', message);
    
    // Extract notification data
    const { notification, data } = message;
    
    if (!notification) {
      console.log('No notification data in FCM message');
      return;
    }
    
    // Determine notification type
    const notificationType = data?.type || NotificationType.RANDOM_REMINDER;
    
    // Create a local notification if app is in foreground
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title || 'FlexBreak',
        body: notification.body || 'Time to take a break!',
        data: { ...data, fcmMessage: true },
        sound: true,
      },
      trigger: null, // Show immediately
    });
    
    console.log(`FCM message processed as ${notificationType} notification`);
  } catch (error) {
    console.error('Error processing FCM message:', error);
  }
};

// Send a test notification
export const sendTestNotification = async (): Promise<void> => {
  try {
    await localNotifications.scheduleTestNotification(5);
    console.log('Test notification sent');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
};

// Update FCM when premium status changes
export const updatePremiumStatus = async (isPremium: boolean): Promise<void> => {
  try {
    // Update FCM preferences with new premium status
    await fcmService.updateNotificationPreferences();
    console.log(`Premium status updated in FCM: ${isPremium}`);
  } catch (error) {
    console.error('Error updating premium status in FCM:', error);
  }
}; 