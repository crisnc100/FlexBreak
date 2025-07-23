import * as Notifications from 'expo-notifications';

export const clearAllAINotifications = async () => {
  try {
    // Get all scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find all AI wellness related notifications
    const aiNotifications = scheduled.filter(n => {
      const data = n.content.data || {};
      return data.type === 'ai_wellness_checkin' || 
             data.type === 'ai_wellness_goodbye' || 
             data.type === 'ai_wellness_spam' ||
             data.type === 'ai_wellness_upgrade' ||
             data.isWelcome || 
             data.isPremiumWelcome;
    });
    
    console.log(`[clearAllAINotifications] Found ${aiNotifications.length} AI notifications to cancel`);
    
    // Cancel all AI wellness notifications
    for (const notification of aiNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log(`[clearAllAINotifications] Cancelled AI notification: ${notification.identifier}`);
    }
    
    // Also dismiss all currently displayed notifications
    // This helps clear any notifications that are already shown in the tray
    await Notifications.dismissAllNotificationsAsync();
    console.log('[clearAllAINotifications] Dismissed all displayed notifications');
    
    return aiNotifications.length;
  } catch (error) {
    console.error('[clearAllAINotifications] Error clearing AI notifications:', error);
    return 0;
  }
};

export const clearAllNotifications = async () => {
  try {
    // Cancel ALL scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[clearAllNotifications] Cancelled all scheduled notifications');
    
    // Dismiss all currently displayed notifications
    await Notifications.dismissAllNotificationsAsync();
    console.log('[clearAllNotifications] Dismissed all displayed notifications');
    
  } catch (error) {
    console.error('[clearAllNotifications] Error clearing all notifications:', error);
  }
};