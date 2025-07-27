import * as Notifications from 'expo-notifications';
import { NotificationType, scheduleTypedNotification, cancelNotificationsByType } from '../utils/notificationManager';
import { ReminderSettings } from '../types/reminders';
import { getNextDayOfWeek, dayStringToNumber } from '../utils/dateUtils';
import { getRandomMotivationalMessage, getRandomMotivationalMessageExcluding } from '../constants/motivationalMessages';
import { getCurrentLocation, areWeatherNotificationsEnabled } from './locationService';
import { getWeatherData, generateWeatherMessage, WeatherData } from './weatherService';
import { shouldShowWeatherMessage } from '../utils/weatherUtils';
import { NOTIFICATION_TIMES } from '../constants/reminderDefaults';

/**
 * Helper function to get day name from day number
 */
function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}

/**
 * Schedule multiple reminders based on user's premium level
 * This enables advanced reminders for premium users at level 3+
 */
export async function scheduleAdvancedReminders(
  settings: ReminderSettings,
  premiumLevel: number = 0
): Promise<string[]> {
  try {
    const scheduledNotificationIds: string[] = [];
    
    // IMPORTANT: Always cancel all existing reminder notifications first
    // This ensures notifications are cancelled when reminders are disabled
    await cancelNotificationsByType([NotificationType.REMINDER, NotificationType.PREMIUM_REMINDER]);
    
    // Only schedule new notifications if reminders are enabled
    if (!settings.enabled) {
      return scheduledNotificationIds;
    }
    
    // Parse the primary reminder time
    const [hours, minutes] = settings.time.split(':').map(num => parseInt(num, 10));
    
    // Get days based on frequency
    let selectedDays: number[] = [];
    
    switch (settings.frequency) {
      case 'daily':
        // All days (0 = Sunday, 6 = Saturday in JavaScript Date)
        selectedDays = [0, 1, 2, 3, 4, 5, 6];
        break;
      case 'weekdays':
        // Monday to Friday
        selectedDays = [1, 2, 3, 4, 5];
        break;
      case 'custom':
        // Convert string day IDs to day numbers
        selectedDays = settings.days
          .map(day => dayStringToNumber(day))
          .filter(day => day !== -1);
        break;
    }
    
    // Schedule for each selected day
    for (const dayOfWeek of selectedDays) {
      // Calculate next occurrence
      const nextDate = getNextDayOfWeek(dayOfWeek, hours, minutes);
      const secondsTillReminder = Math.max(1, Math.floor((nextDate.getTime() - new Date().getTime()) / 1000));
      
      // Create the notification with proper type
      const notificationId = await scheduleTypedNotification(
        {
          title: 'FlexBreak Reminder',
          body: settings.message || 'Time for your daily stretch!',
          data: { 
            type: 'scheduled_reminder', 
            dayOfWeek,
            scheduledFor: nextDate.toISOString()
          },
          sound: true,
        },
        { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsTillReminder,
        },
        NotificationType.REMINDER
      );
      
      scheduledNotificationIds.push(notificationId);
    }
    
    // For premium level 3+, add additional reminders if configured
    if (premiumLevel >= 3) {
      // Add an additional reminder 2 hours after the main one for premium users
      for (const dayOfWeek of selectedDays) {
        // Calculate next occurrence with +2 hours offset
        const nextDate = getNextDayOfWeek(dayOfWeek, hours + 2, minutes);
        const secondsTillReminder = Math.max(1, Math.floor((nextDate.getTime() - new Date().getTime()) / 1000));
        
        // Only schedule if it's more than 1 hour from the first reminder
        if (secondsTillReminder > 3600) {
          const notificationId = await scheduleTypedNotification(
            {
              title: 'FlexBreak Premium Reminder',
              body: settings.message || 'Time for another stretch break!',
              data: { 
                type: 'premium_reminder', 
                dayOfWeek,
                scheduledFor: nextDate.toISOString()
              },
              sound: true,
            },
            { 
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: secondsTillReminder,
            },
            NotificationType.PREMIUM_REMINDER
          );
          
          scheduledNotificationIds.push(notificationId);
        }
      }
    }
    
    return scheduledNotificationIds;
  } catch (error) {
    console.error('Error scheduling advanced reminders:', error);
    return [];
  }
}

/**
 * Schedule 2 motivational messages per day at reasonable times for production use
 * Uses smarter scheduling that delivers messages at appropriate times
 */
export async function scheduleProductionMotivationalMessages(): Promise<void> {
  try {
    // Check if weather notifications are enabled
    // When enabled, messages will be a mix of weather and motivational based on probability
    const weatherEnabled = await areWeatherNotificationsEnabled();
    let weatherData: WeatherData | null = null;
    
    if (weatherEnabled) {
      const location = await getCurrentLocation();
      if (location) {
        weatherData = await getWeatherData(location.lat, location.lon);
      }
    }
    
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    // Schedule for 10 days forward including today
    for (let dayOffset = 0; dayOffset < NOTIFICATION_TIMES.SCHEDULE_DAYS_AHEAD; dayOffset++) {
      const targetDay = new Date(dayStart);
      targetDay.setDate(targetDay.getDate() + dayOffset);
      
      // Schedule morning message
      await scheduleMorningMessage(targetDay, dayOffset, now, weatherData);
      
      // Schedule afternoon message
      await scheduleAfternoonMessage(targetDay, dayOffset, now, weatherData);
    }
    
    console.log('Scheduled motivational messages for the next 10 days');
  } catch (error) {
    console.error('Error scheduling production motivational messages:', error);
  }
}

/**
 * Schedule morning message
 */
async function scheduleMorningMessage(
  targetDay: Date,
  dayOffset: number,
  now: Date,
  weatherData: WeatherData | null
): Promise<void> {
  const morningHour = NOTIFICATION_TIMES.MORNING_START + Math.floor(Math.random() * 2);
  const morningMinute = Math.floor(Math.random() * 60);
  
  const morningDate = new Date(targetDay);
  morningDate.setHours(morningHour, morningMinute, 0, 0);
  
  // Only schedule today's morning message if it's in the future
  if (dayOffset > 0 || morningDate > now) {
    let morningMsg;
    
    // Check if we should use weather message
    if (weatherData && dayOffset === 0 && shouldShowWeatherMessage(weatherData, false)) {
      morningMsg = generateWeatherMessage(weatherData);
    } else {
      morningMsg = getRandomMotivationalMessage();
    }
    
    const morningId = await scheduleTypedNotification(
      {
        title: morningMsg.title,
        body: morningMsg.body,
        data: { 
          time: 'morning',
          scheduledFor: morningDate.toISOString()
        },
        sound: true,
      },
      { 
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: morningDate
      },
      NotificationType.MOTIVATIONAL
    );
    
    console.log(`Scheduled morning message for ${morningDate.toLocaleString()} with ID ${morningId}`);
  }
}

/**
 * Schedule afternoon message
 */
async function scheduleAfternoonMessage(
  targetDay: Date,
  dayOffset: number,
  now: Date,
  weatherData: WeatherData | null
): Promise<void> {
  const afternoonHour = NOTIFICATION_TIMES.AFTERNOON_START + Math.floor(Math.random() * 2);
  const afternoonMinute = Math.floor(Math.random() * 60);
  
  const afternoonDate = new Date(targetDay);
  afternoonDate.setHours(afternoonHour, afternoonMinute, 0, 0);
  
  // Only schedule today's afternoon message if it's in the future
  if (dayOffset > 0 || afternoonDate > now) {
    let afternoonMsg;
    
    // Check if we should use weather message for afternoon too
    if (weatherData && dayOffset === 0 && shouldShowWeatherMessage(weatherData, true)) {
      afternoonMsg = generateWeatherMessage(weatherData);
    } else {
      afternoonMsg = getRandomMotivationalMessage();
    }
    
    const afternoonId = await scheduleTypedNotification(
      {
        title: afternoonMsg.title,
        body: afternoonMsg.body,
        data: { 
          time: 'afternoon',
          scheduledFor: afternoonDate.toISOString()
        },
        sound: true,
      },
      { 
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: afternoonDate
      },
      NotificationType.MOTIVATIONAL
    );
    
    console.log(`Scheduled afternoon message for ${afternoonDate.toLocaleString()} with ID ${afternoonId}`);
  }
}

/**
 * Debug function to check for duplicate reminder notifications
 */
export async function debugReminderNotifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const reminders = scheduled.filter(n => {
      const type = n.content.data?.type;
      return type === 'scheduled_reminder' || type === 'premium_reminder';
    });
    
    console.log(`Total reminder notifications: ${reminders.length}`);
    
    // Group by trigger time to find duplicates
    const byTriggerTime: { [key: string]: any[] } = {};
    
    reminders.forEach((n) => {
      const trigger = n.trigger as any;
      let triggerTime = 'Unknown';
      
      if (trigger?.type === 'timeInterval' && trigger.seconds) {
        const scheduledDate = new Date(Date.now() + trigger.seconds * 1000);
        triggerTime = scheduledDate.toISOString();
      } else if (trigger?.date) {
        triggerTime = new Date(trigger.date).toISOString();
      }
      
      if (!byTriggerTime[triggerTime]) {
        byTriggerTime[triggerTime] = [];
      }
      byTriggerTime[triggerTime].push(n);
    });
    
    // Report duplicates only
    const duplicates = Object.entries(byTriggerTime).filter(([_, notifications]) => notifications.length > 1);
    if (duplicates.length > 0) {
      console.log(`⚠️ Found duplicate notifications:`);
      duplicates.forEach(([time, notifications]) => {
        console.log(`${notifications.length} notifications at ${new Date(time).toLocaleString()}`);
      });
    }
    
    return;
  } catch (error) {
    console.error('Error debugging reminder notifications:', error);
  }
}