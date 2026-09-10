import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationType, scheduleTypedNotification, cancelNotificationsByType } from '../utils/notificationManager';
import { ReminderSettings } from '../types/reminders';
import { getNextDayOfWeek, dayStringToNumber } from '../utils/dateUtils';
import { getRandomMotivationalMessage, getRandomMotivationalMessageExcluding } from '../constants/motivationalMessages';
import { getRandomWeekendMessageExcluding } from '../constants/weekendMessages';
import { getCurrentLocation, areWeatherNotificationsEnabled } from './locationService';
import { getWeatherData, getWeatherForecast, generateWeatherMessage, WeatherData, WeatherForecast } from './weatherService';
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
  const created: string[] = [];
  try {
    const [hours, minutes] = settings.time.split(':').map(Number);
    if (!/^\d{2}:\d{2}$/.test(settings.time) || hours > 23 || minutes > 59) throw new Error('Invalid reminder time');
    const days = settings.frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6]
      : settings.frequency === 'weekdays' ? [1, 2, 3, 4, 5]
      : settings.frequency === 'custom' ? [...new Set(settings.days.map(dayStringToNumber))] : [];
    if (settings.enabled && (!days.length || days.some(day => day < 0))) throw new Error('Invalid reminder days');
    await cancelNotificationsByType([NotificationType.REMINDER, NotificationType.PREMIUM_REMINDER]);
    if (!settings.enabled) return created;

    for (const day of days) {
      for (const offset of premiumLevel >= 3 ? [0, 2] : [0]) {
        const hour = (hours + offset) % 24;
        const dayOfWeek = (day + Math.floor((hours + offset) / 24)) % 7;
        const premium = offset > 0;
        created.push(await scheduleTypedNotification({
          title: premium ? 'FlexBreak Premium Reminder' : 'FlexBreak Reminder',
          body: settings.message || (premium ? 'Time for another stretch break!' : 'Time for your daily stretch!'),
          data: { dayOfWeek, scheduledFor: getNextDayOfWeek(dayOfWeek, hour, minutes).toISOString() },
          sound: true,
        }, {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: dayOfWeek + 1,
          hour,
          minute: minutes,
        }, premium ? NotificationType.PREMIUM_REMINDER : NotificationType.REMINDER));
      }
    }
    return created;
  } catch (error) {
    // Avoid reporting success for a partially installed schedule.
    await Promise.allSettled(created.map(id => Notifications.cancelScheduledNotificationAsync(id)));
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
    // IMPORTANT: Always cancel existing motivational messages first to prevent duplicates
    await cancelNotificationsByType([
      NotificationType.MOTIVATIONAL, 
      NotificationType.WEATHER_MOTIVATIONAL
    ]);
    console.log('Cleared existing motivational and weather messages before rescheduling');
    
    // Check if weather notifications are enabled
    // When enabled, messages will be a mix of weather and motivational based on probability
    const weatherEnabled = await areWeatherNotificationsEnabled();
    let weatherData: WeatherData | null = null;
    let weatherForecast: WeatherForecast | null = null;
    
    if (weatherEnabled) {
      const location = await getCurrentLocation();
      if (location) {
        // Get current weather for today
        weatherData = await getWeatherData(location.lat, location.lon);
        // Get forecast for upcoming days
        weatherForecast = await getWeatherForecast(location.lat, location.lon);
      }
    }
    
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    // Load last-used indices to reduce repetition
    type TimeOfDay = 'morning' | 'afternoon';
    type Pool = 'weekday' | 'weekend';
    const keyFor = (t: TimeOfDay, p: Pool) => `@flexbreak:motivational:lastIndex:${t}:${p}`;
    const parseIntOrNull = (v: string | null) => (v === null || v === undefined ? null : Number.isNaN(parseInt(v, 10)) ? null : parseInt(v, 10));

    const lastIndexCache: Record<string, number | null> = {
      [`${keyFor('morning','weekday')}`]: parseIntOrNull(await AsyncStorage.getItem(keyFor('morning','weekday'))),
      [`${keyFor('morning','weekend')}`]: parseIntOrNull(await AsyncStorage.getItem(keyFor('morning','weekend'))),
      [`${keyFor('afternoon','weekday')}`]: parseIntOrNull(await AsyncStorage.getItem(keyFor('afternoon','weekday'))),
      [`${keyFor('afternoon','weekend')}`]: parseIntOrNull(await AsyncStorage.getItem(keyFor('afternoon','weekend'))),
    };

    const setLastIndex = async (t: TimeOfDay, p: Pool, idx: number | null) => {
      const k = keyFor(t, p);
      lastIndexCache[k] = idx;
      if (idx === null || idx === undefined) {
        await AsyncStorage.removeItem(k);
      } else {
        await AsyncStorage.setItem(k, String(idx));
      }
    };

    // Helper to pick a motivational message with anti-repeat and weekend pool
    const pickMotivation = (
      targetDay: Date,
      time: TimeOfDay,
      excludeIndexFromSameDay: number | null
    ): { title: string; body: string; index: number; pool: Pool } => {
      const isWeekend = targetDay.getDay() === 0 || targetDay.getDay() === 6;
      const pool: Pool = isWeekend ? 'weekend' : 'weekday';
      const lastIndexKey = keyFor(time, pool);
      const lastIndex = lastIndexCache[lastIndexKey] ?? null;

      if (pool === 'weekend') {
        // Avoid repeating immediate past and same-day duplicate
        const exclude = excludeIndexFromSameDay ?? lastIndex;
        const { message, index } = getRandomWeekendMessageExcluding(exclude ?? null);
        // Update cache immediately for sequential scheduling
        lastIndexCache[lastIndexKey] = index;
        return { title: message.title, body: message.body, index, pool };
      } else {
        const exclude = excludeIndexFromSameDay ?? lastIndex;
        const { message, index } = getRandomMotivationalMessageExcluding(exclude ?? null);
        lastIndexCache[lastIndexKey] = index;
        return { title: message.title, body: message.body, index, pool };
      }
    };

    // Schedule for 7 days forward including today
    for (let dayOffset = 0; dayOffset < NOTIFICATION_TIMES.SCHEDULE_DAYS_AHEAD; dayOffset++) {
      const targetDay = new Date(dayStart);
      targetDay.setDate(targetDay.getDate() + dayOffset);
      
      // Only use weather data for first 3 days
      let dayWeatherData: WeatherData | null = null;
      
      if (dayOffset < NOTIFICATION_TIMES.WEATHER_DAYS) {
        // First 3 days: Include weather logic
        if (dayOffset === 0) {
          // Use current weather for today
          dayWeatherData = weatherData;
          console.log(`Day ${dayOffset}: Using current weather data`);
        } else if (weatherForecast) {
          // Use forecast data for next 2 days
          console.log(`Looking for forecast for ${targetDay.toDateString()}`);
          
          const forecastForDay = weatherForecast.forecasts.find(f => {
            const forecastDate = new Date(f.date);
            return forecastDate.toDateString() === targetDay.toDateString();
          });
          
          if (forecastForDay) {
            dayWeatherData = forecastForDay.weather;
            console.log(`Found forecast for day ${dayOffset}: ${dayWeatherData.temp}°F, ${dayWeatherData.condition}`);
          } else {
            console.log(`No forecast found for day ${dayOffset}`);
          }
        }
      } else {
        // Days 4-7: Pure motivational (no weather)
        console.log(`Day ${dayOffset}: Pure motivational (beyond weather forecast range)`);
      }
      
      // Schedule morning message (with weather when relevant and only for first 3 days)
      const morningResult = await scheduleMorningMessage(
        targetDay,
        dayOffset,
        now,
        dayWeatherData,
        pickMotivation
      );
      
      // Schedule afternoon message (ALWAYS motivational, never weather)
      await scheduleAfternoonMessage(
        targetDay,
        dayOffset,
        now,
        // avoid duplicating the same motivational used in morning (if any)
        morningResult.usedMotivationalIndex,
        pickMotivation
      );
    }
    
    // Persist last-used indices to avoid immediate repeats across runs
    try {
      const keysToPersist = [
        keyFor('morning','weekday'),
        keyFor('morning','weekend'),
        keyFor('afternoon','weekday'),
        keyFor('afternoon','weekend'),
      ];
      for (const k of keysToPersist) {
        const v = lastIndexCache[k];
        if (v === null || v === undefined) {
          await AsyncStorage.removeItem(k);
        } else {
          await AsyncStorage.setItem(k, String(v));
        }
      }
    } catch (persistErr) {
      console.warn('Could not persist motivational last-index cache', persistErr);
    }

    console.log(`Scheduled messages for the next ${NOTIFICATION_TIMES.SCHEDULE_DAYS_AHEAD} days:`);
    console.log(`- Days 0-2: Weather (morning if relevant) + Motivational (afternoon always)`);
    console.log(`- Days 3-6: Pure motivational (both morning and afternoon)`);
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
  weatherData: WeatherData | null,
  pickMotivation: (
    targetDay: Date,
    time: 'morning'|'afternoon',
    excludeIndexFromSameDay: number | null
  ) => { title: string; body: string; index: number; pool: 'weekday'|'weekend' }
): Promise<{ usedMotivationalIndex: number | null }> {
  const morningHour = NOTIFICATION_TIMES.MORNING_START + Math.floor(Math.random() * 2);
  const morningMinute = Math.floor(Math.random() * 60);
  
  const morningDate = new Date(targetDay);
  morningDate.setHours(morningHour, morningMinute, 0, 0);
  
  // Only schedule today's morning message if it's in the future
  if (dayOffset > 0 || morningDate > now) {
    let morningMsg: { title: string; body: string };
    let notificationType = NotificationType.MOTIVATIONAL;
    let usedMotivationalIndex: number | null = null;
    
    // Check if we should use weather message (morning only)
    if (weatherData) {
      console.log(`Day ${dayOffset} weather data:`, {
        temp: weatherData.temp,
        condition: weatherData.condition,
        shouldShow: shouldShowWeatherMessage(weatherData, false)
      });
      
      if (shouldShowWeatherMessage(weatherData, false)) {
        morningMsg = generateWeatherMessage(weatherData);
        notificationType = NotificationType.WEATHER_MOTIVATIONAL;
      } else {
        const pick = pickMotivation(targetDay, 'morning', null);
        morningMsg = { title: pick.title, body: pick.body };
        usedMotivationalIndex = pick.index;
      }
    } else {
      console.log(`Day ${dayOffset}: No weather data available`);
      const pick = pickMotivation(targetDay, 'morning', null);
      morningMsg = { title: pick.title, body: pick.body };
      usedMotivationalIndex = pick.index;
    }
    
    const morningId = await scheduleTypedNotification(
      {
        title: morningMsg.title,
        body: morningMsg.body,
        data: { 
          time: 'morning',
          scheduledFor: morningDate.toISOString(),
          isWeatherBased: notificationType === NotificationType.WEATHER_MOTIVATIONAL
        },
        sound: true,
      },
      { 
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: morningDate
      },
      notificationType
    );
    
    console.log(`Scheduled morning message for ${morningDate.toLocaleString()} with ID ${morningId} (${notificationType === NotificationType.WEATHER_MOTIVATIONAL ? 'weather_motivational' : 'motivational'})`);
    return { usedMotivationalIndex };
  }
  return { usedMotivationalIndex: null };
}

/**
 * Schedule afternoon message
 */
async function scheduleAfternoonMessage(
  targetDay: Date,
  dayOffset: number,
  now: Date,
  excludeIndexFromMorning: number | null,
  pickMotivation: (
    targetDay: Date,
    time: 'morning'|'afternoon',
    excludeIndexFromSameDay: number | null
  ) => { title: string; body: string; index: number; pool: 'weekday'|'weekend' }
): Promise<void> {
  const afternoonHour = NOTIFICATION_TIMES.AFTERNOON_START + Math.floor(Math.random() * 2);
  const afternoonMinute = Math.floor(Math.random() * 60);
  
  const afternoonDate = new Date(targetDay);
  afternoonDate.setHours(afternoonHour, afternoonMinute, 0, 0);
  
  // Only schedule today's afternoon message if it's in the future
  if (dayOffset > 0 || afternoonDate > now) {
    // AFTERNOON IS ALWAYS MOTIVATIONAL - Never weather
    // This ensures users always get at least 1 motivational message per day
    const pick = pickMotivation(targetDay, 'afternoon', excludeIndexFromMorning ?? null);
    const afternoonMsg = { title: pick.title, body: pick.body };
    const notificationType = NotificationType.MOTIVATIONAL;
    
    console.log(`Day ${dayOffset} afternoon: Always motivational (50/50 balance rule)`);
    
    const afternoonId = await scheduleTypedNotification(
      {
        title: afternoonMsg.title,
        body: afternoonMsg.body,
        data: { 
          time: 'afternoon',
          scheduledFor: afternoonDate.toISOString(),
          isWeatherBased: false // Always false for afternoon
        },
        sound: true,
      },
      { 
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: afternoonDate
      },
      notificationType
    );
    
    console.log(`Scheduled afternoon message for ${afternoonDate.toLocaleString()} with ID ${afternoonId} (motivational)`);
  }
}

/**
 * Refresh weather notifications when app becomes active
 * This ensures weather data stays fresh even if app was closed for days
 */
export async function refreshWeatherNotifications(): Promise<void> {
  try {
    const weatherEnabled = await areWeatherNotificationsEnabled();
    if (!weatherEnabled) {
      return;
    }
    
    // Cancel existing weather notifications only
    await cancelNotificationsByType([NotificationType.WEATHER_MOTIVATIONAL]);
    
    // Reschedule all notifications with fresh weather data
    await scheduleProductionMotivationalMessages();
    
    console.log('Weather notifications refreshed with latest forecast data');
  } catch (error) {
    console.error('Error refreshing weather notifications:', error);
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
