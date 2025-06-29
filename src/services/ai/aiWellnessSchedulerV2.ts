import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
import { NotificationType, cancelNotificationsByType, scheduleTypedNotification } from '../../utils/notificationManager';
import { canScheduleNotifications, markScheduled } from './notificationDebouncer';

// Simplified state: just track if user has seen the welcome
function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}

export const hasSeenAIWelcome = async (): Promise<boolean> => {
  const seen = await AsyncStorage.getItem(KEYS.AI_WELLNESS.HAS_SEEN_WELCOME);
  return seen === 'true';
};

export const cleanupAllAINotifications = async () => {
  console.log('Cleaning up AI wellness notifications');
  await cancelNotificationsByType([NotificationType.AI_WELLNESS, NotificationType.UPGRADE_PROMPT]);
  console.log('AI notification cleanup complete');
};

export const scheduleAIWellnessV2 = async (action: 'enable' | 'disable' | 'welcome_response' | 'upgrade') => {
  console.log(`AI Wellness V2: Action = ${action}`);
  
  // Check debouncer to prevent spam
  if (action === 'enable' && !canScheduleNotifications('ai_wellness_enable')) {
    console.log('AI Wellness scheduling debounced - too soon since last schedule');
    return;
  }
  
  const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
  const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
  
  // Only clean up when disabling or before scheduling new ones
  if (action === 'disable' || action === 'enable') {
    await cleanupAllAINotifications();
  }
  
  switch (action) {
    case 'disable':
      console.log('AI Wellness disabled');
      return;
      
    case 'enable':
      const hasSeenWelcome = await hasSeenAIWelcome();
      
      if (!hasSeenWelcome) {
        // Show welcome message immediately when AI wellness is enabled
        const welcomeId = await scheduleTypedNotification(
          {
            title: "Welcome to AI Flex Coach! 🤖",
            body: "I'm here to help with your wellness! Swipe down and tap an option to tell me how you're feeling 💪",
            sound: true,
            data: { 
              userId,
              isWelcome: true
            },
            categoryIdentifier: 'AI_WELLNESS_SIMPLE' as any,
          },
          {
            seconds: 1,  // Immediate notification
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL
          },
          NotificationType.AI_WELLNESS
        );
        
        await AsyncStorage.setItem(KEYS.AI_WELLNESS.HAS_SEEN_WELCOME, 'true');
        console.log(`Scheduled welcome notification immediately with ID ${welcomeId}`);
      }
      
      // Always schedule regular check-ins when enabling (don't wait for welcome response)
      await scheduleRegularCheckIns(isPremium, userId);
      console.log(`Scheduled ${isPremium ? 'daily' : 'weekly'} check-ins`);
      
      // Mark as scheduled to prevent spam
      markScheduled('ai_wellness_enable');
      break;
      
    case 'welcome_response':
      // Welcome response is now just informational
      console.log('Welcome response received - user engaged with AI wellness');
      break;
      
    case 'upgrade':
      // Check if we've already sent a premium welcome notification
      const hasSeenPremiumWelcome = await AsyncStorage.getItem(KEYS.AI_WELLNESS.PREMIUM_WELCOME_SENT) === 'true';
      
      if (!hasSeenPremiumWelcome) {
        // Send upgrade notification only once
        const premiumWelcomeId = await scheduleTypedNotification(
          {
            title: "Welcome to Premium! 🌟",
            body: "You now have daily wellness check-ins to keep you healthy and motivated!",
            sound: true,
            data: { 
              userId,
              isPremiumWelcome: true
            },
            categoryIdentifier: 'AI_WELLNESS_SIMPLE' as any,
          },
          {
            seconds: 1,  // Immediate notification
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL
          },
          NotificationType.AI_WELLNESS
        );
        
        console.log(`Scheduled premium welcome notification immediately with ID ${premiumWelcomeId}`);
        
        // Mark as sent to prevent duplicates
        await AsyncStorage.setItem(KEYS.AI_WELLNESS.PREMIUM_WELCOME_SENT, 'true');
      }
      
      // If AI wellness is enabled, update to daily schedule
      const isEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED) === 'true';
      if (isEnabled) {
        await scheduleRegularCheckIns(true, userId);
        console.log('Updated to daily check-ins for premium user');
      }
      break;
  }
};

export async function scheduleRegularCheckIns(isPremium: boolean, userId: string) {
  // Limit notifications to next 7 days to avoid hitting iOS 64 notification limit
  const MAX_DAYS_TO_SCHEDULE = 7;
  
  const checkInDays = isPremium 
    ? [0, 1, 2, 3, 4, 5, 6]
    : [3];
    
  console.log(`Scheduling check-ins for ${isPremium ? 'premium' : 'free'} user on days: ${checkInDays.join(', ')}`);
  
  // Check current notification count
  const { getNotificationSummary } = await import('../../utils/notificationManager');
  const summary = await getNotificationSummary();
  const totalScheduled = Object.values(summary).reduce((sum, count) => sum + count, 0);
  
  if (totalScheduled > 50) {
    console.warn(`Already have ${totalScheduled} notifications scheduled. Consider cleanup.`);
  }
  
  const scheduledDays: { [key: string]: { hour: number; minute: number } } = {};
  const now = new Date();
  
  // For free users on first enable, ensure Wednesday is at least 1 day away
  let minimumDaysAhead = 0;
  if (!isPremium && checkInDays.length === 1) {
    // For free users, ensure notification is at least tomorrow
    minimumDaysAhead = 1;
  }
  
  // For testing/debugging: Allow immediate scheduling on first enable
  const isFirstEnable = await AsyncStorage.getItem(KEYS.AI_WELLNESS.FIRST_ENABLE_DONE) !== 'true';
  if (isFirstEnable && isPremium) {
    minimumDaysAhead = 0; // Allow same-day scheduling for premium users on first enable
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.FIRST_ENABLE_DONE, 'true');
  }
  
  for (const day of checkInDays) {
    // Random time between 11 AM and 4 PM (11:00 - 16:59)
    const randomHour = 11 + Math.floor(Math.random() * 6);
    const randomMinute = Math.floor(Math.random() * 60);
    
    // Always enforce 24-hour minimum to prevent immediate notifications
    const trigger = getNextWeekdayTrigger(day, randomHour, randomMinute, true, minimumDaysAhead);
    
    const scheduledDate = new Date(trigger.date);
    const hoursFromNow = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Double-check we're not scheduling in the past
    if (hoursFromNow < 1) {
      console.error(`Attempted to schedule notification in the past for ${getDayName(day)}, skipping`);
      continue;
    }
    
    console.log(`Scheduling ${getDayName(day)} check-in for ${scheduledDate.toLocaleString()} (${hoursFromNow.toFixed(1)} hours from now)`);
    
    // Use time interval trigger instead of date trigger to ensure proper scheduling
    const secondsUntilNotification = Math.floor((scheduledDate.getTime() - now.getTime()) / 1000);
    
    // Ensure we're not scheduling in the past
    if (secondsUntilNotification < 60) {
      console.error(`⚠️ Attempted to schedule notification with only ${secondsUntilNotification} seconds - skipping`);
      continue;
    }
    
    const notificationId = await scheduleTypedNotification(
      {
        title: "Time for your wellness check-in 💪",
        body: "How are you feeling today? Tap to chat or use voice 🎙️",
        sound: true,
        data: { 
          userId,
          scheduledFor: scheduledDate.toISOString(),
          dayOfWeek: day,
          type: 'ai_wellness_checkin'  // Add explicit type
        },
        categoryIdentifier: 'AI_WELLNESS_SIMPLE' as any,
      },
      {
        date: scheduledDate,  // Use date trigger like motivational messages
        type: Notifications.SchedulableTriggerInputTypes.DATE
      },
      NotificationType.AI_WELLNESS
    );
    
    console.log(`✅ Scheduled check-in for ${getDayName(day)} at ${scheduledDate.toLocaleString()} with ID ${notificationId}`);
    scheduledDays[day.toString()] = { hour: randomHour, minute: randomMinute };
  }
  
  if (!isPremium) {
    await scheduleUpgradePrompts(userId);
  }
}

async function scheduleUpgradePrompts(userId: string) {
  const promptDays = [1, 5];  // Monday and Friday
  const messages = [
    {
      title: "Missing your AI Flex Coach? 💪",
      body: "Get daily wellness check-ins with premium!"
    },
    {
      title: "Want daily wellness support? 🌟",
      body: "Premium users get AI check-ins every day!"
    }
  ];
  
  for (let i = 0; i < promptDays.length; i++) {
    const day = promptDays[i];
    const message = messages[i];
    
    const randomHour = 14 + Math.floor(Math.random() * 4);  // 2 PM - 5 PM
    const randomMinute = Math.floor(Math.random() * 60);
    
    // Schedule for next occurrence of this day, at least 2 days in future
    const trigger = getNextWeekdayTrigger(day, randomHour, randomMinute, true, 2);
    
    const scheduledDate = new Date(trigger.date);
    const daysFromNow = Math.floor((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    // Only schedule if it's actually in the future
    if (daysFromNow >= 2) {
      const secondsUntilNotification = Math.floor((scheduledDate.getTime() - Date.now()) / 1000);
      
      const notificationId = await scheduleTypedNotification(
        {
          title: message.title,
          body: message.body,
          sound: true,
          data: { 
            userId,
            type: 'ai_wellness_upgrade'  // Add explicit type
          },
          categoryIdentifier: 'UPGRADE_PROMPT' as any,
        },
        {
          date: scheduledDate,  // Use date trigger
          type: Notifications.SchedulableTriggerInputTypes.DATE
        },
        NotificationType.UPGRADE_PROMPT
      );
      
      console.log(`Scheduled upgrade prompt for ${getDayName(day)} at ${scheduledDate.toLocaleString()} (in ${daysFromNow} days) with ID ${notificationId}`);
    } else {
      console.log(`Skipped upgrade prompt for ${getDayName(day)} - too close to current time`);
    }
  }
}

export async function debugAIWellnessNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const aiNotifications = scheduled.filter(n => 
    n.content.data?.type === 'ai_wellness_checkin' || 
    n.content.data?.type === 'ai_wellness_upgrade'
  );
  
  console.log(`\n=== AI Wellness Notifications Debug ===`);
  console.log(`Total scheduled: ${aiNotifications.length}`);
  
  aiNotifications.forEach((n, index) => {
    const trigger = n.trigger as any;
    const scheduledDate = trigger?.date ? new Date(trigger.date) : null;
    const hoursFromNow = scheduledDate ? 
      (scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60) : 'N/A';
    
    console.log(`\n${index + 1}. ${n.content.title}`);
    console.log(`   Type: ${n.content.data?.type}`);
    console.log(`   Scheduled: ${scheduledDate ? scheduledDate.toLocaleString() : 'Unknown'}`);
    console.log(`   Hours from now: ${typeof hoursFromNow === 'number' ? hoursFromNow.toFixed(1) : hoursFromNow}`);
  });
  console.log(`\n=====================================\n`);
  
  return aiNotifications;
}

function getNextWeekdayTrigger(
  targetDay: number, 
  hour: number, 
  minute: number, 
  enforceMinimum24Hours: boolean = false,
  minimumDaysInFuture: number = 0
) {
  const now = new Date();
  const currentDay = now.getDay();
  
  let daysUntilTarget = targetDay - currentDay;
  
  if (daysUntilTarget === 0) {
    if (now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute)) {
      daysUntilTarget = 7;
    }
  } else if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }
  
  if (daysUntilTarget < minimumDaysInFuture) {
    daysUntilTarget += 7 * Math.ceil((minimumDaysInFuture - daysUntilTarget) / 7);
  }
  
  if (enforceMinimum24Hours) {
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysUntilTarget);
    nextDate.setHours(hour, minute, 0, 0);
    
    const hoursUntilScheduled = (nextDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilScheduled < 24) {
      daysUntilTarget += 7;
    }
  }
  
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntilTarget);
  nextDate.setHours(hour, minute, 0, 0);
  
  // CRITICAL: Ensure the date is actually in the future
  // If it's less than 5 minutes in the future, push to next week
  const minutesUntilScheduled = (nextDate.getTime() - now.getTime()) / (1000 * 60);
  if (minutesUntilScheduled < 5) {
    nextDate.setDate(nextDate.getDate() + 7);
    console.log(`Notification was too close to current time, pushed to next week: ${nextDate.toLocaleString()}`);
  }
  
  return {
    date: nextDate,
    repeats: false
  };
}