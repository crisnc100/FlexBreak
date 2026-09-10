import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getNotificationType, NotificationType } from '../utils/notificationManager';
import * as storageService from './storageService';
import { scheduleAdvancedReminders } from './notificationScheduler';
import { ReminderSettings, ReminderFrequency } from '../types/reminders';
import { STORAGE_KEYS, DEFAULTS } from '../constants/reminderDefaults';

/**
 * Save reminder settings and install repeating notifications on this device.
 * The OS delivers them while the app is closed; no push token is required.
 */
export async function saveReminderSettings(settings: ReminderSettings): Promise<boolean> {
  try {
    // Cancellation is strict here: a failed OS call must not report disabled.
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of pending) {
      if ([NotificationType.REMINDER, NotificationType.PREMIUM_REMINDER].includes(getNotificationType(notification))) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    // Persist disabled while installing so a failed schedule cannot silently
    // re-enable itself on the next launch. Cancellation failures keep old settings.
    await saveLocalReminderSettings({ ...settings, enabled: false });
    let isPremium = false;
    let premiumLevel = 0;
    try {
      isPremium = await storageService.getIsPremium();
      const progress = await storageService.getUserProgress();
      premiumLevel = isPremium ? (progress.level || 1) : 0;
    } catch (error) {
      console.error('Premium reminder options unavailable; scheduling the primary reminder:', error);
    }
    if (settings.enabled) {
      const scheduled = await scheduleAdvancedReminders(settings, premiumLevel);
      if (scheduled.length === 0) throw new Error('No local reminders were scheduled');
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDER_ENABLED, 'true');
    }
    return true;
  } catch (error) {
    console.error('Error saving reminder settings:', error);
    return false;
  }
}

/**
 * Save reminder settings locally
 */
async function saveLocalReminderSettings(settings: ReminderSettings): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_ENABLED, settings.enabled.toString()),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_TIME, settings.time),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_FREQUENCY, settings.frequency),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_DAYS, JSON.stringify(settings.days)),
    AsyncStorage.setItem(STORAGE_KEYS.REMINDER_MESSAGE, settings.message || DEFAULTS.REMINDER_MESSAGE)
  ]);
}

/**
 * Get the locally stored reminder settings
 */
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const [enabledStr, time, frequency, daysStr, message] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_ENABLED),
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_TIME),
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_FREQUENCY),
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_DAYS),
      AsyncStorage.getItem(STORAGE_KEYS.REMINDER_MESSAGE)
    ]);
    
    return {
      enabled: enabledStr === 'true',
      time: time || DEFAULTS.REMINDER_TIME,
      frequency: (frequency as ReminderFrequency) || DEFAULTS.REMINDER_FREQUENCY,
      days: daysStr ? JSON.parse(daysStr) : DEFAULTS.REMINDER_DAYS,
      message: message || DEFAULTS.REMINDER_MESSAGE
    };
  } catch (error) {
    console.error('Error getting reminder settings:', error);
    return {
      enabled: false,
      time: DEFAULTS.REMINDER_TIME,
      frequency: DEFAULTS.REMINDER_FREQUENCY,
      days: [...DEFAULTS.REMINDER_DAYS],
      message: DEFAULTS.REMINDER_MESSAGE
    };
  }
}

/**
 * Enable or disable reminders
 */
export async function setRemindersEnabled(enabled: boolean): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.enabled = enabled;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminders enabled:', error);
    return false;
  }
}

/**
 * Set reminder time
 */
export async function setReminderTime(time: string): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.time = time;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder time:', error);
    return false;
  }
}

/**
 * Set reminder frequency
 */
export async function setReminderFrequency(frequency: ReminderFrequency): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.frequency = frequency;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder frequency:', error);
    return false;
  }
}

/**
 * Set reminder days (for custom frequency)
 */
export async function setReminderDays(days: string[]): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.days = days;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder days:', error);
    return false;
  }
}

/**
 * Set reminder message
 */
export async function setReminderMessage(message: string): Promise<boolean> {
  try {
    const settings = await getReminderSettings();
    settings.message = message;
    return saveReminderSettings(settings);
  } catch (error) {
    console.error('Error setting reminder message:', error);
    return false;
  }
}