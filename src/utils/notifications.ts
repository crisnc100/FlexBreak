import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storageService from '../services/storageService';

// Special keys for async storage that aren't in storageService
const REMINDER_DAYS_KEY = 'reminder_days';
const REMINDER_FREQUENCY_KEY = 'reminder_frequency';
const REMINDER_MESSAGE_KEY = 'reminder_message';
const REMINDER_IDENTIFIERS_KEY = 'reminder_identifiers';

// Default values
const DEFAULT_REMINDER_TIME = '09:00';
const DEFAULT_REMINDER_MESSAGE = 'Time for your daily stretch!';
const DEFAULT_REMINDER_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DEFAULT_REMINDER_FREQUENCY = 'daily';

// Types
export type ReminderFrequency = 'daily' | 'weekdays' | 'custom';

export type ReminderSettings = {
  enabled: boolean;
  time: string;
  days: string[];
  frequency: ReminderFrequency;
  message: string;
};

// Export the storageService functions for reminders
export const saveReminderEnabled = storageService.saveReminderEnabled;
export const getReminderEnabled = storageService.getReminderEnabled;
export const saveReminderTime = storageService.saveReminderTime;
export const getReminderTime = storageService.getReminderTime;

// Configure notifications
export function configureNotifications(): void {
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
  
  console.log('Notifications handler configured');
}

// Request permissions
export const requestNotificationsPermissions = async (): Promise<boolean> => {
  console.log('Requesting notification permissions...');
  
  try {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('Existing permission status:', existingStatus);
    
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
      // Android requires extra step to get permission
      if (Platform.OS === 'android') {
        console.log('Setting up Android notification channel');
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Stretch Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      console.log('Requesting permission...');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
      console.log('Permission request result:', status);
  }
  
  return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
};

/**
 * Save reminder days
 * @param days Array of day identifiers (e.g., ['mon', 'wed', 'fri'])
 */
export async function saveReminderDays(days: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDER_DAYS_KEY, JSON.stringify(days));
  } catch (error) {
    console.error('Error saving reminder days:', error);
  }
}

/**
 * Get reminder days
 * @returns Promise<string[]> - Array of day identifiers
 */
export async function getReminderDays(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(REMINDER_DAYS_KEY);
    return value ? JSON.parse(value) : DEFAULT_REMINDER_DAYS;
  } catch (error) {
    console.error('Error getting reminder days:', error);
    return DEFAULT_REMINDER_DAYS;
  }
}

/**
 * Save reminder frequency
 * @param frequency ReminderFrequency ('daily', 'weekdays', or 'custom')
 */
export async function saveReminderFrequency(frequency: ReminderFrequency): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDER_FREQUENCY_KEY, frequency);
  } catch (error) {
    console.error('Error saving reminder frequency:', error);
  }
}

/**
 * Get reminder frequency
 * @returns Promise<ReminderFrequency> - The reminder frequency
 */
export async function getReminderFrequency(): Promise<ReminderFrequency> {
  try {
    const value = await AsyncStorage.getItem(REMINDER_FREQUENCY_KEY);
    return (value as ReminderFrequency) || DEFAULT_REMINDER_FREQUENCY;
  } catch (error) {
    console.error('Error getting reminder frequency:', error);
    return DEFAULT_REMINDER_FREQUENCY;
  }
}

/**
 * Save reminder message
 * @param message The custom reminder message
 */
export async function saveReminderMessage(message: string): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDER_MESSAGE_KEY, message);
  } catch (error) {
    console.error('Error saving reminder message:', error);
  }
}

/**
 * Get reminder message
 * @returns Promise<string> - The reminder message
 */
export async function getReminderMessage(): Promise<string> {
  try {
    const value = await AsyncStorage.getItem(REMINDER_MESSAGE_KEY);
    return value || DEFAULT_REMINDER_MESSAGE;
  } catch (error) {
    console.error('Error getting reminder message:', error);
    return DEFAULT_REMINDER_MESSAGE;
  }
}

/**
 * Save all reminder notification identifiers for later cancellation
 * @param identifiers Array of notification identifiers
 */
export async function saveReminderIdentifiers(identifiers: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDER_IDENTIFIERS_KEY, JSON.stringify(identifiers));
  } catch (error) {
    console.error('Error saving reminder identifiers:', error);
  }
}

/**
 * Get all reminder notification identifiers
 * @returns Promise<string[]> - Array of notification identifiers
 */
export async function getReminderIdentifiers(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(REMINDER_IDENTIFIERS_KEY);
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Error getting reminder identifiers:', error);
    return [];
  }
}

/**
 * Get all reminder settings at once
 * @returns Promise<ReminderSettings> - Object with all reminder settings
 */
export async function getAllReminderSettings(): Promise<ReminderSettings> {
  const [enabled, timeRaw, days, frequency, message] = await Promise.all([
    storageService.getReminderEnabled(),
    storageService.getReminderTime(),
    getReminderDays(),
    getReminderFrequency(),
    getReminderMessage()
  ]);

  // Fix for double-quoted time strings
  let time = timeRaw || DEFAULT_REMINDER_TIME;
  
  // Try to clean up the time string if it has extra quotes
  try {
    if (time.startsWith('"') && time.endsWith('"')) {
      time = JSON.parse(time);
    }
  } catch (e) {
    console.warn('Failed to parse time string with quotes:', time);
    // Keep the original value if parsing fails
  }
  
  console.log('Got reminder time from storage:', timeRaw, 'cleaned up to:', time);
  
  return {
    enabled,
    time, // Already cleaned up
    days,
    frequency,
    message
  };
}

/**
 * Save all reminder settings at once
 * @param settings ReminderSettings object
 */
export async function saveAllReminderSettings(settings: ReminderSettings): Promise<void> {
  let timeToSave = settings.time || DEFAULT_REMINDER_TIME;
  
  // Ensure time is a plain string without quotes
  if (typeof timeToSave === 'string' && (timeToSave.startsWith('"') && timeToSave.endsWith('"'))) {
    try {
      timeToSave = JSON.parse(timeToSave);
    } catch (e) {
      console.warn('Failed to parse time string with quotes on save:', timeToSave);
    }
  }
  
  console.log('Saving reminder time:', timeToSave);
  
  await Promise.all([
    storageService.saveReminderEnabled(settings.enabled),
    storageService.saveReminderTime(timeToSave),
    saveReminderDays(settings.days),
    saveReminderFrequency(settings.frequency),
    saveReminderMessage(settings.message)
  ]);
}

/**
 * Parse the reminder time string into hours and minutes
 * @param timeString Time string in format "HH:MM"
 * @returns {hours: number, minutes: number}
 */
function parseTimeString(timeString: string): { hours: number; minutes: number } {
  // Ensure we have a valid time string
  if (!timeString || typeof timeString !== 'string') {
    console.warn('Invalid time string provided:', timeString);
    timeString = DEFAULT_REMINDER_TIME;
  }
  
  // Remove any extra quotes
  if (timeString.startsWith('"') && timeString.endsWith('"')) {
    try {
      timeString = JSON.parse(timeString);
    } catch (e) {
      console.warn('Failed to remove quotes from time string:', timeString);
    }
  }
  
  console.log('Parsing time string:', timeString);
  
  const parts = timeString.split(':');
  if (parts.length !== 2) {
    console.warn('Time string is not in HH:MM format, using default');
    const defaultParts = DEFAULT_REMINDER_TIME.split(':');
    return {
      hours: parseInt(defaultParts[0], 10),
      minutes: parseInt(defaultParts[1], 10)
    };
  }
  
  const [hoursStr, minutesStr] = parts;
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  // Validate the parsed values
  if (isNaN(hours) || isNaN(minutes)) {
    console.warn('Failed to parse hours or minutes, using default');
    const defaultParts = DEFAULT_REMINDER_TIME.split(':');
    return {
      hours: parseInt(defaultParts[0], 10),
      minutes: parseInt(defaultParts[1], 10)
    };
  }
  
  console.log(`Successfully parsed time: ${hours}:${minutes}`);
  return { hours, minutes };
}

/**
 * Get day of week number from day ID (0 = Sunday, 6 = Saturday)
 * @param dayId Day identifier (e.g., 'mon', 'tue')
 * @returns number (0-6)
 */

/**
 * Schedule reminder notifications based on settings
 */
export async function scheduleReminders(): Promise<void> {
  console.log('Scheduling reminders based on user preferences');
  
  try {
    // Get all reminder settings
    const settings = await getAllReminderSettings();
    console.log('Retrieved reminder settings:', settings);
    
    // If reminders are not enabled, don't schedule anything
    if (!settings.enabled) {
      console.log('Reminders not enabled, cancelling any existing reminders');
      await cancelReminders();
      return;
    }

    // Cancel existing reminders before scheduling new ones
    await cancelReminders();

    // Parse time
    const { hours, minutes } = parseTimeString(settings.time);
    console.log(`Setting reminders for ${hours}:${minutes}`);

    // Get user's premium level 
    const userProgress = await storageService.getUserProgress();
    const isPremium = await storageService.getIsPremium();
    const premiumLevel = isPremium ? (userProgress.level || 1) : 0;
    
    console.log(`User premium level: ${premiumLevel}`);
    
    // Store notification identifiers
    const scheduledIds: string[] = [];
    
    // Get days to schedule based on frequency
    let daysToSchedule: number[] = [];
    
    switch(settings.frequency) {
      case 'daily':
        // Schedule for all days (0-6, where 0 is Sunday)
        daysToSchedule = [0, 1, 2, 3, 4, 5, 6];
        break;
      case 'weekdays':
        // Schedule for Monday-Friday (1-5)
        daysToSchedule = [1, 2, 3, 4, 5];
        break;
      case 'custom':
        // Convert string day IDs to day numbers
        daysToSchedule = settings.days.map(dayId => {
          switch(dayId) {
            case 'sun': return 0;
            case 'mon': return 1;
            case 'tue': return 2;
            case 'wed': return 3;
            case 'thu': return 4;
            case 'fri': return 5;
            case 'sat': return 6;
            default: return -1;
          }
        }).filter(day => day !== -1);
        break;
    }
    
    console.log('Scheduling for days:', daysToSchedule);
    
    // Get the message (use custom message for premium, default for others)
    let message = settings.message;
    if (!isPremium || !message) {
      message = DEFAULT_REMINDER_MESSAGE;
    }
    
    // Limit to scheduling the next 64 notifications (iOS limit)
    // For most users this will be enough for 9 weeks of daily notifications
    const MAX_NOTIFICATIONS = 64;
    let notificationsScheduled = 0;
    
    // For each day to schedule
    for (const dayOfWeek of daysToSchedule) {
      // Get the next occurrence of this day
      const nextDate = getNextDayOfWeek(dayOfWeek, hours, minutes);
      
      // Calculate trigger
      const secondsUntilTarget = Math.max(1, Math.floor((nextDate.getTime() - new Date().getTime()) / 1000));
      
      // Skip if in the past somehow
      if (secondsUntilTarget <= 0) continue;
      
      console.log(`Scheduling notification for ${nextDate.toLocaleString()} (${secondsUntilTarget} seconds from now)`);
      
      // Create notification content
      const content = {
        title: 'FlexBreak Reminder',
        body: message,
        data: { 
          type: 'scheduled_reminder',
          dayOfWeek,
          premiumLevel
        },
        sound: true,
      };
      
      try {
        // Schedule the notification
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilTarget,
            repeats: false // We'll manage repeat logic ourselves for better control
          },
        });
        
        console.log(`Scheduled notification with ID: ${id} for ${nextDate.toLocaleString()}`);
        scheduledIds.push(id);
        notificationsScheduled++;
        
        // If we've hit the limit, stop scheduling more
        if (notificationsScheduled >= MAX_NOTIFICATIONS) {
          console.log(`Reached maximum of ${MAX_NOTIFICATIONS} scheduled notifications`);
          break;
        }
      } catch (err) {
        console.error(`Error scheduling notification for ${nextDate.toLocaleString()}:`, err);
      }
    }
    
    // If premium level 3+, schedule additional custom reminders if configured
    // This would be implemented when the UI for multiple reminders is added
    
    // Save the scheduled notification IDs
    await saveReminderIdentifiers(scheduledIds);
    console.log(`Successfully scheduled ${scheduledIds.length} reminders`);
    
  } catch (error) {
    console.error('Error in scheduleReminders:', error);
  }
}

/**
 * Get the next date for a specific day of the week
 * @param dayOfWeek Day of week (0 = Sunday, 6 = Saturday)
 * @param hours Hours for the reminder
 * @param minutes Minutes for the reminder
 * @returns Date object for the next occurrence
 */
function getNextDayOfWeek(dayOfWeek: number, hours: number, minutes: number): Date {
  const date = new Date();
  const currentDay = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Calculate days to add
  let daysToAdd = dayOfWeek - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Add a week if the day has passed this week
  }
  
  // Set the date to the next occurrence
  date.setDate(date.getDate() + daysToAdd);
  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  
  return date;
}

/**
 * Cancel all scheduled reminders
 */
export async function cancelReminders(): Promise<void> {
  console.log('Cancelling reminders...');
  
  try {
    // Get all scheduled notification identifiers
    const identifiers = await getReminderIdentifiers();
    console.log('Found reminder identifiers:', identifiers);

    // If there are identifiers, cancel each one
    if (identifiers.length > 0) {
      for (const identifier of identifiers) {
        await Notifications.cancelScheduledNotificationAsync(identifier);
        console.log('Cancelled notification with ID:', identifier);
      }
    }

    // Cancel all notifications (as a fallback)
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all notifications as fallback');

    // Clear the stored identifiers
    await saveReminderIdentifiers([]);
    
    console.log('Reminders cancelled successfully');
  } catch (error) {
    console.error('Error cancelling reminders:', error);
  }
}

/**
 * Schedule a test notification that fires after a short delay
 * for testing purposes
 */
export async function scheduleTestNotification(delaySeconds: number = 5): Promise<string> {
  // Enforce a minimum delay for the test notification
  const MINIMUM_TEST_DELAY = 20; // At least 20 seconds
  if (delaySeconds < MINIMUM_TEST_DELAY) {
    delaySeconds = MINIMUM_TEST_DELAY;
  }
  
  console.log(`Scheduling TEST notification in ${delaySeconds} seconds`);
  
  try {
    // Create a proper delay-based trigger that works in Expo
    const now = new Date();
    const futureTime = new Date(now.getTime() + (delaySeconds * 1000));
    
    console.log(`Test notification will appear at: ${futureTime.toLocaleTimeString()}`);
    
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
        title: 'FlexBreak Test',
        body: 'This is a TEST notification. This confirms your notification system is working!',
        data: { type: 'test_only' },
        sound: true,
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
      },
    });
    
    console.log('Test notification scheduled with ID:', identifier);
    return identifier;
  } catch (error) {
    console.error('Error scheduling test notification:', error);
    throw error;
  }
}

/**
 * Schedule a real reminder for a specific time.
 * This function should be called when the app is resumed or started,
 * NOT when the user toggles reminders or changes time.
 */
export async function scheduleRealReminder(): Promise<void> {
  console.log('Checking if we need to schedule a real reminder...');
  
  try {
    // Get all reminder settings
    const settings = await getAllReminderSettings();
    
    // If reminders are not enabled, don't schedule anything
    if (!settings.enabled) {
      console.log('Reminders not enabled, not scheduling a real reminder');
      return;
    }

    // Check if we already have an active notification scheduled
    const existingIdentifiers = await getReminderIdentifiers();
    
    if (existingIdentifiers.length > 0) {
      console.log('Found existing reminders, not scheduling a duplicate:', existingIdentifiers);
      
      // Get the saved next reminder time
      const savedNextTimeString = await AsyncStorage.getItem('next_reminder_time');
      
      if (savedNextTimeString) {
        const savedNextTime = new Date(savedNextTimeString);
        const now = new Date();
        
        // If the saved time is still in the future, don't reschedule
        if (savedNextTime > now) {
          console.log(`Existing reminder is still valid for ${savedNextTime.toLocaleString()}, not rescheduling`);
          return;
        } else {
          console.log('Existing reminder is outdated, cancelling and scheduling a new one');
          await cancelReminders();
        }
      } else {
        // If we can't verify the time, cancel and reschedule to be safe
        console.log('Could not verify scheduled reminder time, cancelling and rescheduling');
        await cancelReminders();
      }
    }

    // Parse time
    const { hours, minutes } = parseTimeString(settings.time);
    
    // Calculate the next target time
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(hours);
    targetTime.setMinutes(minutes);
    targetTime.setSeconds(0);
    targetTime.setMilliseconds(0);
    
    // If the target time has already passed today, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
      console.log('Target time already passed, scheduling for tomorrow:', targetTime.toLocaleString());
    } else {
      console.log('Target time is today:', targetTime.toLocaleString());
    }
    
    // Configure notification content
    const content = {
      title: 'FlexBreak Reminder',
      body: settings.message,
      data: { type: 'scheduled_reminder' },
      sound: true,
    };
    
    // Calculate seconds until the target time
    const secondsUntilTarget = Math.floor((targetTime.getTime() - now.getTime()) / 1000);
    console.log(`Scheduling reminder for ${secondsUntilTarget} seconds from now (${Math.floor(secondsUntilTarget/60)} minutes)`);
    
    // Schedule the notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content,
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilTarget
      },
    });
    
    console.log('Real reminder scheduled with ID:', identifier);
    
    // Save identifier for later cancellation
    await saveReminderIdentifiers([identifier]);
    
    // Also store the target time for reference
    await AsyncStorage.setItem('next_reminder_time', targetTime.toISOString());
    
    console.log('Real reminder scheduled successfully');
  } catch (error) {
    console.error('Error scheduling real reminder:', error);
  }
}

// Add a function to subscribe to app state changes and schedule reminders
export function setupBackgroundScheduling(): void {
  console.log('Setting up background scheduling for notifications');
  
  // Schedule real reminder immediately
  scheduleRealReminder();
  
  // The rest of the scheduling logic is handled in App.tsx
  console.log('Background scheduling setup complete');
} 