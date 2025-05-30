/**
 * Main entry point for Firebase utilities
 * Re-exports all functionality for backward compatibility
 */

// Types
export * from './types';

// Constants
export {
  FIREBASE_REMINDER_ENABLED_KEY,
  FIREBASE_REMINDER_DAYS_KEY,
  FIREBASE_REMINDER_FREQUENCY_KEY,
  FIREBASE_REMINDER_MESSAGE_KEY,
  FIREBASE_REMINDER_TIME_KEY,
  DEFAULT_REMINDER_TIME,
  DEFAULT_REMINDER_MESSAGE,
  DEFAULT_REMINDER_DAYS,
  DEFAULT_REMINDER_FREQUENCY,
  MOTIVATIONAL_MESSAGES
} from './constants';

// Initialization
export {
  initializeFirebaseReminders,
  getFCMToken,
  refreshAppCheckToken,
  clearStoredToken,
  setupMessageHandlers
} from './initialization';

// Reminders
export {
  saveReminderSettings,
  getReminderSettings,
  setRemindersEnabled,
  setReminderTime,
  setReminderFrequency,
  setReminderDays,
  setReminderMessage,
  scheduleAdvancedReminders,
  cancelReminderNotifications
} from './reminders';

// Notifications
export {
  sendTestNotification,
  sendImmediateLocalNotification,
  sendFirebaseTestNotification,
  scheduleTestNotificationInOneMinute,
  getScheduledNotificationsSummary
} from './notifications';

// Motivational messages
export {
  sendLocalMotivationalMessage,
  startLocalMotivationalMessages,
  cancelMotivationalMessageNotifications
} from './motivational';