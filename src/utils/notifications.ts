import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { saveReminderEnabled, saveReminderTime } from '../services/storageService';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permissions
export const requestNotificationsPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
};

// Schedule a daily reminder
export const scheduleDailyReminder = async (time: string) => {
  // Cancel any existing reminders
  await cancelReminders();
  
  // Parse the time (format: "HH:MM")
  const [hours, minutes] = time.split(':').map(Number);
  
  // Create a trigger for the specified time
  const trigger = {
    hour: hours,
    minute: minutes,
    repeats: true,
  };
  
  // Schedule the notification
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to Stretch!',
      body: 'Take a break and do your daily stretching routine.',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger,
  });
  
  // Save the reminder settings
  await saveReminderEnabled(true);
  await saveReminderTime(time);
  
  return identifier;
};

// Cancel all scheduled reminders
export const cancelReminders = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await saveReminderEnabled(false);
  return true;
}; 