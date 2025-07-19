import * as Notifications from 'expo-notifications';

// Notification types
export enum NotificationType {
  MOTIVATIONAL = 'motivational_message',
  WEATHER_MOTIVATIONAL = 'weather_motivational',
  AI_WELLNESS = 'ai_wellness_checkin',
  REMINDER = 'scheduled_reminder',
  PREMIUM_REMINDER = 'premium_reminder',
  TEST = 'test_notification',
  FLEX_SAVE = 'flex_save_prompt',
  UPGRADE_PROMPT = 'ai_wellness_upgrade',
  DATA_CLEANUP = 'data_cleanup_choice',
  OTHER = 'other'
}

// Interface for typed notifications
export interface TypedNotification {
  id: string;
  content: Notifications.NotificationContent;
  trigger: Notifications.NotificationTrigger | null;
  type: NotificationType;
}

/**
 * Get the notification type from notification data
 */
export function getNotificationType(notification: Notifications.NotificationRequest): NotificationType {
  const data = notification.content.data;
  const type = data?.type as string;
  
  if (!type) {
    // Try to infer from content
    const title = notification.content.title || '';
    const body = notification.content.body || '';
    
    if (title.includes('wellness') || body.includes('wellness')) {
      return NotificationType.AI_WELLNESS;
    }
    if (title.includes('FlexBreak Reminder')) {
      return NotificationType.REMINDER;
    }
    if (title.includes('Premium Reminder')) {
      return NotificationType.PREMIUM_REMINDER;
    }
    
    return NotificationType.OTHER;
  }
  
  // Map string types to enum
  switch (type) {
    case 'motivational_message':
      return NotificationType.MOTIVATIONAL;
    case 'weather_motivational':
      return NotificationType.WEATHER_MOTIVATIONAL;
    case 'ai_wellness_checkin':
      return NotificationType.AI_WELLNESS;
    case 'scheduled_reminder':
      return NotificationType.REMINDER;
    case 'premium_reminder':
      return NotificationType.PREMIUM_REMINDER;
    case 'test_notification':
    case 'local_test':
    case 'firebase_test':
    case 'minute_test':
      return NotificationType.TEST;
    case 'flex_save_prompt':
      return NotificationType.FLEX_SAVE;
    case 'ai_wellness_upgrade':
      return NotificationType.UPGRADE_PROMPT;
    case 'data_cleanup_choice':
      return NotificationType.DATA_CLEANUP;
    default:
      return NotificationType.OTHER;
  }
}

/**
 * Cancel all scheduled notifications of specific types
 */
export async function cancelNotificationsByType(types: NotificationType[]): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Found ${scheduled.length} total scheduled notifications`);
    
    const toCancel = scheduled.filter(notification => {
      const notificationType = getNotificationType(notification);
      return types.includes(notificationType);
    });
    
    console.log(`Canceling ${toCancel.length} notifications of types: ${types.join(', ')}`);
    
    for (const notification of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    
    console.log(`Successfully canceled ${toCancel.length} notifications`);
  } catch (error) {
    console.error('Error canceling notifications by type:', error);
  }
}

/**
 * Get all scheduled notifications of specific types
 */
export async function getNotificationsByType(types: NotificationType[]): Promise<Notifications.NotificationRequest[]> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    return scheduled.filter(notification => {
      const notificationType = getNotificationType(notification);
      return types.includes(notificationType);
    });
  } catch (error) {
    console.error('Error getting notifications by type:', error);
    return [];
  }
}

/**
 * Cancel all motivational messages only
 */
export async function cancelMotivationalMessages(): Promise<void> {
  await cancelNotificationsByType([NotificationType.MOTIVATIONAL]);
}

/**
 * Cancel all AI wellness notifications only
 */
export async function cancelAIWellnessNotifications(): Promise<void> {
  await cancelNotificationsByType([NotificationType.AI_WELLNESS, NotificationType.UPGRADE_PROMPT]);
}

/**
 * Get a summary of all scheduled notifications by type
 */
export async function getNotificationSummary(): Promise<Record<NotificationType, number>> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const summary: Record<NotificationType, number> = {
      [NotificationType.MOTIVATIONAL]: 0,
      [NotificationType.AI_WELLNESS]: 0,
      [NotificationType.REMINDER]: 0,
      [NotificationType.PREMIUM_REMINDER]: 0,
      [NotificationType.TEST]: 0,
      [NotificationType.FLEX_SAVE]: 0,
      [NotificationType.UPGRADE_PROMPT]: 0,
      [NotificationType.DATA_CLEANUP]: 0,
      [NotificationType.OTHER]: 0
    };
    
    for (const notification of scheduled) {
      const type = getNotificationType(notification);
      summary[type]++;
    }
    
    return summary;
  } catch (error) {
    console.error('Error getting notification summary:', error);
    return {} as Record<NotificationType, number>;
  }
}

/**
 * Schedule a notification with proper type tagging
 */
export async function scheduleTypedNotification(
  content: Notifications.NotificationContentInput,
  trigger: Notifications.NotificationTriggerInput | null,
  type: NotificationType
): Promise<string> {
  // Map NotificationType enum to actual string values
  const typeString = type === NotificationType.AI_WELLNESS ? 'ai_wellness_checkin' :
                     type === NotificationType.UPGRADE_PROMPT ? 'ai_wellness_upgrade' :
                     type === NotificationType.MOTIVATIONAL ? 'motivational_message' :
                     type === NotificationType.REMINDER ? 'scheduled_reminder' :
                     type === NotificationType.PREMIUM_REMINDER ? 'premium_reminder' :
                     type;
  
  // Use custom sound for AI wellness notifications
  let sound = content.sound;
  if (type === NotificationType.AI_WELLNESS || type === NotificationType.UPGRADE_PROMPT) {
    sound = 'AInotification1.mp3';
  }
  
  // Ensure the notification has the correct type in data
  const typedContent = {
    ...content,
    sound,
    data: {
      ...content.data,
      type: typeString
    }
  };
  
  return await Notifications.scheduleNotificationAsync({
    content: typedContent,
    trigger
  });
}