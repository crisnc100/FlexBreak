// Storage keys
export const STORAGE_KEYS = {
  REMINDER_ENABLED: 'firebase_reminder_enabled',
  REMINDER_DAYS: 'firebase_reminder_days', 
  REMINDER_FREQUENCY: 'firebase_reminder_frequency',
  REMINDER_MESSAGE: 'firebase_reminder_message',
  REMINDER_TIME: 'firebase_reminder_time',
  FCM_TOKEN: 'fcm_token',
  NOTIFICATIONS_ENABLED: 'notifications_enabled'
} as const;

// Default values
export const DEFAULTS = {
  REMINDER_TIME: '09:00',
  REMINDER_MESSAGE: 'Time for your daily stretch!',
  REMINDER_DAYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  REMINDER_FREQUENCY: 'daily' as const
} as const;

// Time ranges for notifications
export const NOTIFICATION_TIMES = {
  MORNING_START: 9,
  MORNING_END: 11,
  AFTERNOON_START: 14,
  AFTERNOON_END: 16,
  SCHEDULE_DAYS_AHEAD: 10
} as const;

// Day mapping
export const DAY_MAP: { [key: number]: string } = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat'
} as const;

// Expo project configuration
export const EXPO_CONFIG = {
  PROJECT_ID: "e2f2f0ca-229d-4469-9de8-9f69b7f7a724"
} as const;