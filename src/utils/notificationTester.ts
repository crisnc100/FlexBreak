import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as notifications from './notifications';

// Configure the notification handler
export function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  console.log('Notification handler configured in tester');
}

// Request permissions directly
export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Cannot request permissions on emulator');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      // Set up Android channel if needed
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for notifications');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

// Send an immediate test notification
export async function sendImmediateNotification(title: string = 'Test Notification', body: string = 'This is a test notification'): Promise<string | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log('No permission to send notifications');
      return null;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'immediate_test' },
      },
      trigger: null, // null trigger means show immediately
    });

    console.log(`Immediate notification scheduled with ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error('Error sending immediate notification:', error);
    return null;
  }
}

// Schedule a notification for a specific time (seconds from now)
export async function scheduleNotificationInSeconds(seconds: number = 5, title: string = 'Scheduled Test', body: string = 'This notification was scheduled'): Promise<string | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log('No permission to send notifications');
      return null;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'scheduled_test' },
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds,
      },
    });

    console.log(`Notification scheduled in ${seconds} seconds with ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

// Schedule a custom reminder with specific time and message
export async function scheduleCustomReminder(
  hours: number, 
  minutes: number, 
  message: string = 'Time for your stretch!',
  title: string = 'FlexBreak Reminder'
): Promise<string | null> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log('No permission to send notifications');
      return null;
    }

    // Calculate when to show the notification
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours);
    scheduledTime.setMinutes(minutes);
    scheduledTime.setSeconds(0);

    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Calculate seconds until the target time
    const secondsFromNow = Math.floor((scheduledTime.getTime() - now.getTime()) / 1000);

    console.log(`Will schedule reminder for ${scheduledTime.toLocaleTimeString()} (${secondsFromNow} seconds from now)`);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data: { type: 'custom_reminder' },
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsFromNow
      },
    });

    console.log(`Custom reminder scheduled with ID: ${identifier} for ${scheduledTime.toLocaleString()}`);
    return identifier;
  } catch (error) {
    console.error('Error scheduling custom reminder:', error);
    return null;
  }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled notifications canceled');
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
}

// Get all scheduled notifications
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Found ${notifications.length} scheduled notifications`);
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
} 