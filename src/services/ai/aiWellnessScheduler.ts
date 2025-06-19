import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';

export const scheduleAICheckIns = async (isPremium: boolean = false, isInitialSetup: boolean = false) => {
  console.log(`Scheduling AI check-ins for ${isPremium ? 'premium' : 'free'} user`);
  
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
        title: "Welcome to AI Flex Coach! 🎉",
        body: "Tap to start! Just type your first name and share how you're feeling - I'll help with personalized wellness tips! 💪",
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
    
    // For initial setup, don't schedule regular check-ins yet
    // They'll be scheduled after the intro conversation
    return;
  }
  
  // Schedule new check-ins based on premium status
  const checkInDays = isPremium 
    ? [1, 2, 3, 4, 5, 6, 0] // Daily for premium
    : [3]; // Wednesday only for free users
  
  console.log(`Scheduling for days: ${checkInDays.join(', ')}`)
  
  for (const day of checkInDays) {
    // Calculate the next occurrence of this weekday
    const trigger = getNextWeekdayTrigger(day, 14, 0);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "AI Wellness Check 🤖",
        body: "Hey! How's your body and mind feeling today? Tap to chat",
        data: { 
          type: 'ai_wellness_checkin',
          userId
        },
        categoryIdentifier: 'AI_WELLNESS_CHECK',
      },
      trigger
    });
    
    console.log(`Scheduled AI check-in for day ${day} at ${trigger.date}`);
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
  const currentDay = now.getDay();
  
  let daysUntilTarget = targetDay - currentDay;
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }
  
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntilTarget);
  nextDate.setHours(hour, minute, 0, 0);
  
  // If the target time has already passed today, go to next week
  if (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + 7);
  }
  
  return nextDate;
}

function getNextWeekdayTrigger(day: number, hour: number, minute: number) {
  const nextDate = getNextWeekday(day, hour, minute);
  
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
  
  if (usageCount >= 1) {
    return { 
      canAccess: false, 
      reason: "You've used your daily AI wellness check-in. Come back tomorrow or upgrade to premium for unlimited access!" 
    };
  }
  
  return { canAccess: true };
};