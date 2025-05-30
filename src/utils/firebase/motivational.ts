/**
 * Motivational messages functionality
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOTIVATIONAL_MESSAGES, LAST_MOTIVATIONAL_CHECK_KEY } from './constants';
import { MotivationalMessage } from './types';

// Singleton to track if motivational messages are already initialized
let isMotivationalMessagesInitialized = false;

/**
 * Send a local motivational message
 */
export const sendLocalMotivationalMessage = async (): Promise<string> => {
  try {
    console.log('Sending local motivational message');
    
    // Pick a random message
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    const message = MOTIVATIONAL_MESSAGES[randomIndex];
    
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
};

/**
 * Set up a timer to send motivational messages periodically
 * This is a local fallback for the Firebase Cloud Function
 * @param testMode If true, sends messages every 30 seconds for testing (only for development)
 */
export const startLocalMotivationalMessages = (testMode: boolean = false): (() => void) => {
  // Prevent multiple initializations
  if (isMotivationalMessagesInitialized) {
    console.log('Motivational messages already initialized, skipping...');
    return () => {};
  }
  
  isMotivationalMessagesInitialized = true;
  console.log(`Starting local motivational messages timer (${testMode ? 'TEST MODE - every 30 seconds' : 'PRODUCTION MODE - 2 per day'})`);

  // Check if motivational messages are already scheduled
  checkAndScheduleMotivationalMessages(testMode);
  
  // Return a cleanup function
  return () => {
    console.log('Stopping local motivational messages');
    isMotivationalMessagesInitialized = false;
    
    // Clean up only motivational message notifications
    cancelMotivationalMessageNotifications()
      .then(() => console.log('Motivational message notifications cancelled'))
      .catch(error => console.error('Error cancelling motivational notifications:', error));
  };
};

/**
 * Check if motivational messages are already scheduled and schedule them if not
 * @param testMode If true, uses test mode scheduling
 */
const checkAndScheduleMotivationalMessages = async (testMode: boolean = false) => {
  try {
    // Check if we've already scheduled messages today
    const lastScheduled = await AsyncStorage.getItem(LAST_MOTIVATIONAL_CHECK_KEY);
    const today = new Date().toDateString();
    
    if (lastScheduled === today && !testMode) {
      console.log('Motivational messages already scheduled for today, skipping...');
      return;
    }
    
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Count existing motivational message notifications
    const motivationalNotifications = scheduledNotifications.filter(notification => 
      notification.content.data?.type === 'motivational_message'
    );
    
    console.log(`Found ${motivationalNotifications.length} existing motivational notifications`);
    
    // If we have a reasonable number of notifications scheduled (at least 10 for 5 days), don't reschedule
    if (motivationalNotifications.length >= 10 && !testMode) {
      console.log('Sufficient motivational messages already scheduled, skipping...');
      return;
    }
    
    // Cancel only motivational message notifications before rescheduling
    await cancelMotivationalMessageNotifications();
    
    // Schedule new messages
    if (testMode) {
      // Schedule test notifications every 30 seconds for the next hour
      await scheduleTestMotivationalMessages();
    } else {
      // For production mode, schedule 2 messages per day using smart algorithm
      await scheduleProductionMotivationalMessages();
      
      // Mark that we've scheduled messages today
      await AsyncStorage.setItem(LAST_MOTIVATIONAL_CHECK_KEY, today);
    }
  } catch (error) {
    console.error('Error checking and scheduling motivational messages:', error);
  }
};

/**
 * Cancel only motivational message notifications
 */
export const cancelMotivationalMessageNotifications = async () => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find and cancel only motivational message notifications
    const motivationalNotificationIds = scheduledNotifications
      .filter(notification => notification.content.data?.type === 'motivational_message')
      .map(notification => notification.identifier);
    
    console.log(`Cancelling ${motivationalNotificationIds.length} motivational message notifications`);
    
    for (const id of motivationalNotificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    
    console.log('Motivational message notifications cancelled successfully');
  } catch (error) {
    console.error('Error cancelling motivational message notifications:', error);
  }
};

/**
 * Schedule motivational messages for production (2 per day for 10 days)
 */
const scheduleProductionMotivationalMessages = async () => {
  try {
    const now = new Date();
    const messagesScheduled = [];
    
    // Schedule 2 messages per day for the next 10 days
    for (let day = 0; day < 10; day++) {
      // Morning message (random time between 9 AM and 11 AM)
      const morningTime = new Date(now);
      morningTime.setDate(morningTime.getDate() + day);
      morningTime.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      
      // Only schedule if it's in the future
      if (morningTime > now) {
        const morningMessage = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        const morningId = await Notifications.scheduleNotificationAsync({
          content: {
            title: morningMessage.title,
            body: morningMessage.body,
            data: { 
              type: 'motivational_message',
              scheduled_for: 'morning',
              day: day
            },
            sound: true,
          },
          trigger: { date: morningTime },
        });
        
        messagesScheduled.push({ id: morningId, time: morningTime, type: 'morning' });
        
        if (__DEV__) {
          console.log(`Scheduled morning message for ${morningTime.toLocaleDateString()}, ${morningTime.toLocaleTimeString()} with ID ${morningId}`);
        }
      }
      
      // Afternoon message (random time between 2 PM and 4 PM)
      const afternoonTime = new Date(now);
      afternoonTime.setDate(afternoonTime.getDate() + day);
      afternoonTime.setHours(14 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      
      // Only schedule if it's in the future
      if (afternoonTime > now) {
        const afternoonMessage = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        const afternoonId = await Notifications.scheduleNotificationAsync({
          content: {
            title: afternoonMessage.title,
            body: afternoonMessage.body,
            data: { 
              type: 'motivational_message',
              scheduled_for: 'afternoon',
              day: day
            },
            sound: true,
          },
          trigger: { date: afternoonTime },
        });
        
        messagesScheduled.push({ id: afternoonId, time: afternoonTime, type: 'afternoon' });
        
        if (__DEV__) {
          console.log(`Scheduled afternoon message for ${afternoonTime.toLocaleDateString()}, ${afternoonTime.toLocaleTimeString()} with ID ${afternoonId}`);
        }
      }
    }
    
    console.log(`Scheduled motivational messages for the next 10 days`);
  } catch (error) {
    console.error('Error scheduling production motivational messages:', error);
  }
};

/**
 * Schedule test motivational messages (every 30 seconds for the next hour)
 */
const scheduleTestMotivationalMessages = async () => {
  try {
    const now = new Date();
    const messagesScheduled = [];
    
    // Schedule a message every 30 seconds for the next hour
    for (let i = 0; i < 10; i++) { // 10 messages for testing
      const messageTime = new Date(now);
      messageTime.setSeconds(messageTime.getSeconds() + (i * 30));
      
      const message = MOTIVATIONAL_MESSAGES[i % MOTIVATIONAL_MESSAGES.length];
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `[TEST ${i + 1}] ${message.title}`,
          body: message.body,
          data: { 
            type: 'motivational_message',
            test_mode: true,
            sequence: i
          },
          sound: true,
        },
        trigger: { date: messageTime },
      });
      
      messagesScheduled.push({ id: notificationId, time: messageTime });
      console.log(`Scheduled test message ${i + 1} for ${messageTime.toLocaleTimeString()}`);
    }
    
    console.log(`Scheduled ${messagesScheduled.length} test motivational messages`);
  } catch (error) {
    console.error('Error scheduling test motivational messages:', error);
  }
};