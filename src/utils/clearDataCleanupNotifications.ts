import * as Notifications from 'expo-notifications';

export const clearDataCleanupNotifications = async () => {
  try {
    // Get all scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find and cancel all data retention cleanup notifications
    const cleanupNotifications = scheduled.filter(n => 
      n.content.data?.type === 'data_retention_cleanup'
    );
    
    console.log(`Found ${cleanupNotifications.length} data cleanup notifications to cancel`);
    
    for (const notification of cleanupNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log(`Cancelled cleanup notification: ${notification.identifier}`);
    }
    
    return cleanupNotifications.length;
  } catch (error) {
    console.error('Error clearing data cleanup notifications:', error);
    return 0;
  }
};