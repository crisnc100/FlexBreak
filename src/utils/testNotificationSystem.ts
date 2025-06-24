import { getNotificationSummary, NotificationType, getNotificationsByType } from './notificationManager';
import * as Notifications from 'expo-notifications';

/**
 * Test the unified notification system
 * Run this to verify notifications are properly separated
 */
export const testNotificationSystem = async () => {
  console.log('===== NOTIFICATION SYSTEM TEST =====');
  
  try {
    // Get summary of all scheduled notifications
    const summary = await getNotificationSummary();
    
    console.log('\nNotification Summary:');
    console.log('-------------------');
    Object.entries(summary).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`${type}: ${count} notifications`);
      }
    });
    
    // Check for expected counts
    const totalMotivational = summary[NotificationType.MOTIVATIONAL] || 0;
    const totalAIWellness = summary[NotificationType.AI_WELLNESS] || 0;
    const totalReminders = summary[NotificationType.REMINDER] || 0;
    
    console.log('\nExpected vs Actual:');
    console.log('------------------');
    console.log(`Motivational: Should be ≤ 20 (2 per day × 10 days), found ${totalMotivational}`);
    console.log(`AI Wellness: Should be 1-7 (depending on premium status), found ${totalAIWellness}`);
    console.log(`Reminders: Variable based on user settings, found ${totalReminders}`);
    
    // Check for duplicate scheduling
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const motivationalByTime = new Map<string, number>();
    
    allScheduled.forEach(notification => {
      const data = notification.content.data;
      if (data?.type === 'motivational_message' && data?.scheduledFor) {
        const timeKey = data.scheduledFor;
        motivationalByTime.set(timeKey, (motivationalByTime.get(timeKey) || 0) + 1);
      }
    });
    
    // Check for duplicates
    const duplicates = Array.from(motivationalByTime.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('\n⚠️  WARNING: Duplicate motivational messages found at same times:');
      duplicates.forEach(([time, count]) => {
        console.log(`  - ${new Date(time).toLocaleString()}: ${count} messages`);
      });
    } else {
      console.log('\n✅ No duplicate motivational messages found');
    }
    
    // Check total daily notifications
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    let todaysNotifications = 0;
    allScheduled.forEach(notification => {
      if (notification.trigger && 'date' in notification.trigger) {
        const triggerDate = new Date(notification.trigger.date);
        if (triggerDate >= todayStart && triggerDate <= todayEnd) {
          todaysNotifications++;
        }
      }
    });
    
    console.log(`\nToday's scheduled notifications: ${todaysNotifications}`);
    if (todaysNotifications > 3) {
      console.log('⚠️  WARNING: More than 3 notifications scheduled for today');
    }
    
    console.log('\n===== TEST COMPLETE =====');
    
    return {
      summary,
      totalMotivational,
      totalAIWellness,
      totalReminders,
      duplicates: duplicates.length,
      todaysNotifications
    };
  } catch (error) {
    console.error('Error running notification system test:', error);
    throw error;
  }
};

/**
 * Clear all notifications for testing
 * WARNING: This will clear ALL scheduled notifications
 */
export const clearAllNotificationsForTesting = async () => {
  console.log('⚠️  Clearing ALL scheduled notifications...');
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('✅ All notifications cleared');
};

/**
 * Get detailed AI wellness notification information
 */
export const getAIWellnessNotificationDetails = async () => {
  console.log('===== AI WELLNESS NOTIFICATIONS =====');
  
  try {
    // Get all AI wellness notifications
    const aiNotifications = await getNotificationsByType([
      NotificationType.AI_WELLNESS,
      NotificationType.UPGRADE_PROMPT
    ]);
    
    console.log(`\nTotal AI Wellness Notifications: ${aiNotifications.length}`);
    console.log('--------------------------------');
    
    const details = aiNotifications.map(notification => {
      const trigger = notification.trigger;
      let scheduledTime = 'Unknown';
      
      if (trigger && 'date' in trigger) {
        scheduledTime = new Date(trigger.date).toLocaleString();
      } else if (trigger && 'seconds' in trigger) {
        const futureDate = new Date(Date.now() + (trigger.seconds * 1000));
        scheduledTime = `~${futureDate.toLocaleString()} (in ${trigger.seconds}s)`;
      }
      
      return {
        id: notification.identifier,
        title: notification.content.title || 'No title',
        body: notification.content.body || 'No body',
        type: notification.content.data?.type || 'Unknown type',
        userId: notification.content.data?.userId || 'Unknown user',
        scheduledTime,
        data: notification.content.data
      };
    });
    
    // Sort by scheduled time
    details.sort((a, b) => {
      const timeA = new Date(a.scheduledTime).getTime();
      const timeB = new Date(b.scheduledTime).getTime();
      return timeA - timeB;
    });
    
    // Print details
    details.forEach((notif, index) => {
      console.log(`\n${index + 1}. ${notif.title}`);
      console.log(`   Body: ${notif.body.substring(0, 50)}...`);
      console.log(`   Type: ${notif.type}`);
      console.log(`   Scheduled: ${notif.scheduledTime}`);
      console.log(`   User ID: ${notif.userId}`);
      if (notif.data?.isWelcome) console.log('   🌟 Welcome notification');
      if (notif.data?.isPremiumWelcome) console.log('   ⭐ Premium welcome');
    });
    
    // Group by day
    const byDay: Record<string, number> = {};
    details.forEach(notif => {
      const date = new Date(notif.scheduledTime);
      const dayKey = date.toDateString();
      byDay[dayKey] = (byDay[dayKey] || 0) + 1;
    });
    
    console.log('\n\nNotifications by Day:');
    console.log('-------------------');
    Object.entries(byDay).forEach(([day, count]) => {
      console.log(`${day}: ${count} notifications`);
    });
    
    return {
      total: aiNotifications.length,
      details,
      byDay
    };
  } catch (error) {
    console.error('Error getting AI wellness notification details:', error);
    throw error;
  }
};