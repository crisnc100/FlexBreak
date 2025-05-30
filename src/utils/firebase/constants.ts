/**
 * Constants for Firebase functionality
 */

// Storage keys
export const FIREBASE_REMINDER_ENABLED_KEY = 'firebase_reminder_enabled';
export const FIREBASE_REMINDER_DAYS_KEY = 'firebase_reminder_days';
export const FIREBASE_REMINDER_FREQUENCY_KEY = 'firebase_reminder_frequency';
export const FIREBASE_REMINDER_MESSAGE_KEY = 'firebase_reminder_message';
export const FIREBASE_REMINDER_TIME_KEY = 'firebase_reminder_time';
export const LAST_MOTIVATIONAL_CHECK_KEY = 'last_motivational_check';
export const FCM_TOKEN_KEY = 'fcm_token';
export const LAST_TOKEN_UPDATE_KEY = 'last_token_update';

// Default values
export const DEFAULT_REMINDER_TIME = '09:00';
export const DEFAULT_REMINDER_MESSAGE = 'Time for your daily stretch!';
export const DEFAULT_REMINDER_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DEFAULT_REMINDER_FREQUENCY = 'daily';

// Motivational messages configuration
export const MOTIVATIONAL_MESSAGES = [
  { title: '🌟 Keep Going!', body: 'Every stretch brings you closer to better flexibility!' },
  { title: '💪 You\'re Doing Great!', body: 'Your dedication to daily stretching is paying off!' },
  { title: '🎯 Stay Consistent!', body: 'Small steps lead to big improvements!' },
  { title: '✨ Feel the Difference!', body: 'Your body thanks you for taking these stretch breaks!' },
  { title: '🌈 Keep It Up!', body: 'Regular stretching is the key to long-term wellness!' },
  { title: '🔥 On Fire!', body: 'Your commitment to flexibility is inspiring!' },
  { title: '⭐ Amazing Progress!', body: 'Every stretch session makes you stronger!' },
  { title: '💫 You\'re a Star!', body: 'Keep shining with your daily stretch routine!' },
  { title: '🏆 Champion Mode!', body: 'Your consistency deserves a gold medal!' },
  { title: '🌺 Bloom Where You Stretch!', body: 'Growth happens one stretch at a time!' },
  { title: '🚀 Soaring High!', body: 'Your flexibility journey is taking off!' },
  { title: '💎 Precious Progress!', body: 'Every stretch is a gem in your wellness crown!' },
  { title: '🌟 Stellar Stretcher!', body: 'You\'re reaching for the stars with every session!' },
  { title: '🎨 Paint Your Progress!', body: 'Each stretch adds color to your wellness canvas!' },
  { title: '🌊 Flow with It!', body: 'Let your body move like water, flexible and strong!' },
  { title: '🍃 Natural Movement!', body: 'Stretching is your body\'s way of saying thank you!' },
  { title: '☀️ Bright Future!', body: 'Your flexibility journey illuminates the path ahead!' },
  { title: '🎪 Flexibility Circus!', body: 'You\'re the star performer in your wellness show!' },
  { title: '🌙 Dream Stretcher!', body: 'Turn your flexibility dreams into reality!' },
  { title: '🎭 Express Yourself!', body: 'Let your stretches tell your wellness story!' }
];

// Time intervals
export const TOKEN_UPDATE_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
export const MOTIVATIONAL_MESSAGE_INTERVAL_PROD = 6 * 60 * 60 * 1000; // 6 hours for 2 messages per day
export const MOTIVATIONAL_MESSAGE_INTERVAL_TEST = 30 * 1000; // 30 seconds for testing