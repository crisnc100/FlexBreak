import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
import { todayStringLocal, getDayOfWeek } from '../../utils/progress/modules/utils/dateUtils';
import dataRetentionService from './dataRetentionPolicy';

function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}

export const scheduleAICheckIns = async (isPremium: boolean = false, isInitialSetup: boolean = false) => {
  console.log(`🔧 DEBUG: scheduleAICheckIns called - isPremium: ${isPremium}, isInitialSetup: ${isInitialSetup}`);
  
  // Cancel existing AI check-ins
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const aiCheckIns = scheduled.filter(n => 
    n.content.data?.type === 'ai_wellness_checkin'
  );
  
  console.log(`Found ${aiCheckIns.length} existing AI check-ins to cancel`);
  
  for (const notification of aiCheckIns) {
    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }
  
  // Get user ID if available
  const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
  
  // Check if user has seen welcome before
  const hasSeenWelcome = await AsyncStorage.getItem(KEYS.AI_WELLNESS.HAS_SEEN_WELCOME);
  
  // If this is initial setup AND user hasn't seen welcome before
  if (isInitialSetup && !hasSeenWelcome) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Welcome to AI Flex Coach! 🤖",
        body: "I'm here to help with your wellness! Swipe down and tap an option to tell me how you're feeling 💪",
        sound: true, // For now, use default sound until iOS bundle is configured
        data: { 
          type: 'ai_wellness_checkin',
          userId,
          isWelcome: true
        },
        categoryIdentifier: 'AI_WELLNESS_CHECK',
      },
      trigger: {
        seconds: 2 // Send after 2 seconds
      }
    });
    console.log('Scheduled welcome notification');
    
    // Mark that user has seen welcome
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.HAS_SEEN_WELCOME, 'true');
    
    // For initial setup, only send welcome - don't schedule regular check-ins yet
    return;
  }
  
  // Schedule new check-ins based on premium status
  const checkInDays = isPremium 
    ? [1, 2, 3, 4, 5, 6, 0] // Daily for premium
    : [3]; // Wednesday only for free users
  
  console.log(`Scheduling for days: ${checkInDays.join(', ')}`)
  
  for (const day of checkInDays) {
    // Generate random time between 11 AM and 4 PM
    const randomHour = 11 + Math.floor(Math.random() * 6); // 11-16 (11 AM - 4 PM)
    const randomMinute = Math.floor(Math.random() * 60); // 0-59 minutes
    
    // Calculate the next occurrence of this weekday with random time
    const trigger = getNextWeekdayTrigger(day, randomHour, randomMinute);
    
    console.log(`🔧 DEBUG: About to schedule notification for day ${day} (${getDayName(day)}) at ${randomHour}:${randomMinute.toString().padStart(2, '0')} with trigger:`, trigger);
    
    // Use direct reply for better UX
    const categoryId = 'AI_WELLNESS_DIRECT_REPLY';
    const bodyText = "How's your body feeling? Reply to this message or tap a quick option below 💬";
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "AI Wellness Check 🤖",
        body: bodyText,
        sound: true, // For now, use default sound until iOS bundle is configured
        data: { 
          type: 'ai_wellness_checkin',
          userId
        },
        categoryIdentifier: categoryId,
      },
      trigger
    });
    
    // Immediately verify what was actually scheduled
    const verifyScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const justScheduled = verifyScheduled.find(n => n.identifier === notificationId);
    if (justScheduled) {
      console.log(`🔧 DEBUG: VERIFICATION - Just scheduled notification ${notificationId} has trigger:`, justScheduled.trigger);
    } else {
      console.log(`🔧 DEBUG: VERIFICATION - Notification ${notificationId} not found in scheduled list!`);
    }
    
    console.log(`🔧 DEBUG: Successfully scheduled AI check-in for day ${day} at ${trigger.date}`);
  }
  
  console.log('AI check-ins scheduling complete');
};

export const cancelAICheckIns = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const aiCheckIns = scheduled.filter(n => 
    n.content.data?.type === 'ai_wellness_checkin'
  );
  
  for (const notification of aiCheckIns) {
    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }
};

export const getNextCheckInTime = async (): Promise<Date | null> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const aiCheckIns = scheduled.filter(n => 
    n.content.data?.type === 'ai_wellness_checkin'
  );
  
  if (aiCheckIns.length === 0) {
    return null;
  }
  
  // Find the next upcoming check-in
  const now = new Date();
  let nextCheckIn: Date | null = null;
  
  for (const notification of aiCheckIns) {
    if (notification.trigger && 'weekday' in notification.trigger) {
      const trigger = notification.trigger;
      const nextDate = getNextWeekday(trigger.weekday, trigger.hour, trigger.minute);
      
      if (!nextCheckIn || nextDate < nextCheckIn) {
        nextCheckIn = nextDate;
      }
    }
  }
  
  return nextCheckIn;
};

function getNextWeekday(targetDay: number, hour: number, minute: number): Date {
  const now = new Date();
  
  // Always start from tomorrow to ensure no immediate notifications
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(hour, minute, 0, 0);
  
  const tomorrowDay = getDayOfWeek(tomorrow);
  let daysUntilTarget = targetDay - tomorrowDay;
  
  // If target day is before tomorrow's day, add a week
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }
  
  const nextDate = new Date(tomorrow);
  nextDate.setDate(tomorrow.getDate() + daysUntilTarget);
  
  console.log(`Next ${targetDay} (${getDayName(targetDay)}) will be: ${nextDate.toLocaleString()}`);
  
  return nextDate;
}

function getNextWeekdayTrigger(day: number, hour: number, minute: number) {
  const nextDate = getNextWeekday(day, hour, minute);
  
  // Check if this date is too soon (within next 24 hours) - this could cause immediate notifications
  const now = new Date();
  const timeDiff = nextDate.getTime() - now.getTime();
  const hoursUntil = timeDiff / (1000 * 60 * 60);
  
  console.log(`🔧 DEBUG: Trigger for ${getDayName(day)} is ${hoursUntil.toFixed(1)} hours from now`);
  
  if (hoursUntil < 24) {
    console.log(`⚠️  WARNING: Notification scheduled very soon! Only ${hoursUntil.toFixed(1)} hours away`);
  }
  
  return {
    date: nextDate,
    repeats: false  // Don't repeat - we'll reschedule manually
  };
}

// Debug function to see scheduled AI wellness notifications
export const getScheduledAINotifications = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const aiNotifications = scheduled.filter(n => 
    n.content.data?.type === 'ai_wellness_checkin'
  );
  
  return aiNotifications.map(n => ({
    id: n.identifier,
    title: n.content.title,
    body: n.content.body,
    trigger: n.trigger,
    scheduledFor: n.trigger && 'date' in n.trigger ? new Date(n.trigger.date).toLocaleString() : 'Unknown'
  }));
};

// Schedule regular check-ins after user responds to welcome
export const scheduleRegularCheckInsAfterWelcome = async () => {
  const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
  const hasRegularScheduled = await AsyncStorage.getItem('@ai_wellness_regular_scheduled');
  
  if (!hasRegularScheduled) {
    console.log('Scheduling regular AI check-ins after welcome response');
    await scheduleAICheckIns(isPremium, false); // isInitialSetup = false
    await AsyncStorage.setItem('@ai_wellness_regular_scheduled', 'true');
  }
};

export const checkAIWellnessAccess = async (): Promise<{ canAccess: boolean; reason?: string }> => {
  const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
  
  if (isPremium) {
    return { canAccess: true };
  }
  
  // Free users: Check if it's their allowed day
  const today = new Date().getDay();
  const freeAccessDays = [3]; // Wednesday only
  
  if (!freeAccessDays.includes(today)) {
    return { 
      canAccess: false, 
      reason: 'AI Wellness Coach is available on Wednesdays for free users. Upgrade to premium for daily access!' 
    };
  }
  
  // Check daily usage limit for free users
  const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
  const todayStr = new Date().toDateString();
  const usageKey = `@ai_usage_${userId}_${todayStr}`;
  const usage = await AsyncStorage.getItem(usageKey);
  const usageCount = usage ? parseInt(usage) : 0;
  
  if (usageCount >= 3) {
    return { 
      canAccess: false, 
      reason: "You've used your 3 free AI wellness check-ins for today. Come back next Wednesday or upgrade to premium for unlimited daily access!" 
    };
  }
  
  return { canAccess: true };
};

// Schedule daily data retention cleanup
export const scheduleDataRetentionCleanup = async () => {
  try {
    // Cancel existing cleanup notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const cleanupNotifications = scheduled.filter(n => 
      n.content.data?.type === 'data_retention_cleanup'
    );
    
    for (const notification of cleanupNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    
    // Schedule daily cleanup at 3 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Data Retention Cleanup",
        body: "Running scheduled data cleanup...",
        data: { type: 'data_retention_cleanup' },
      },
      trigger: {
        hour: 3,
        minute: 0,
        repeats: true
      }
    });
    
    console.log('Data retention cleanup scheduled for 3 AM daily');
  } catch (error) {
    console.error('Error scheduling data retention cleanup:', error);
  }
};

// Handle data retention cleanup notification
export const handleDataRetentionCleanup = async () => {
  try {
    await dataRetentionService.performDataCleanup();
  } catch (error) {
    console.error('Error performing data retention cleanup:', error);
  }
};