import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clean up all AI wellness notifications
 * This is a utility to stop the notification loop
 */
export async function cleanupAllAINotifications(): Promise<void> {
  try {
    console.log('Cleaning up all AI wellness notifications...');
    
    // Get all scheduled notifications
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    // More comprehensive filter for AI wellness notifications
    const aiNotifications = allScheduled.filter(n => {
      const type = n.content.data?.type;
      const title = n.content.title || '';
      const body = n.content.body || '';
      
      // Check multiple conditions to catch ALL AI notifications
      return type?.includes('ai_wellness') ||
             title.includes('AI Flex Coach') ||
             title.includes('AI Wellness') ||
             title.includes('wellness check-in') ||
             title.includes('Missing your AI') ||
             title.includes('Want daily wellness') ||
             title.includes('Time for your wellness') ||
             (body.includes('wellness') && (body.includes('AI') || body.includes('coach'))) ||
             body.includes('Flex Coach') ||
             body.includes('How are you feeling') ||
             n.content.categoryIdentifier === 'AI_WELLNESS_SIMPLE' ||
             n.content.categoryIdentifier === 'UPGRADE_PROMPT' ||
             n.content.categoryIdentifier === 'AI_WELLNESS_CHECK';
    });
    
    console.log(`Found ${aiNotifications.length} AI notifications to clean up`);
    
    // Log what we're cleaning
    aiNotifications.forEach((n, index) => {
      console.log(`${index + 1}. "${n.content.title}" - Type: ${n.content.data?.type || 'none'}`);
    });
    
    // Cancel all AI notifications
    for (const notif of aiNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      console.log(`✓ Cancelled: ${notif.content.title}`);
    }
    
    // Clear any flags that might trigger more notifications
    await AsyncStorage.removeItem('@ai_wellness_show_modal');
    await AsyncStorage.removeItem('@ai_wellness_voice_mode');
    await AsyncStorage.removeItem('@ai_wellness_last_toggle');
    await AsyncStorage.removeItem('@ai_wellness_toggle_count');
    await AsyncStorage.removeItem('@ai_wellness_regular_scheduled');
    
    console.log('AI notification cleanup complete');
    
    return;
  } catch (error) {
    console.error('Error cleaning up AI notifications:', error);
  }
}

/**
 * Check if there are any problematic AI notifications
 */
export async function checkForProblematicNotifications(): Promise<{
  immediateCount: number;
  totalCount: number;
  details: string[];
}> {
  try {
    const now = Date.now();
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    const aiNotifications = allScheduled.filter(n => {
      const data = n.content.data;
      return data?.type?.includes('ai_wellness');
    });
    
    const details: string[] = [];
    let immediateCount = 0;
    
    for (const notif of aiNotifications) {
      const trigger = notif.trigger as any;
      let timeInfo = 'Unknown trigger';
      
      if (trigger?.seconds) {
        timeInfo = `In ${trigger.seconds} seconds`;
        if (trigger.seconds < 60) {
          immediateCount++;
        }
      } else if (trigger?.date) {
        const scheduledTime = new Date(trigger.date).getTime();
        const timeDiff = scheduledTime - now;
        const minutes = Math.floor(timeDiff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
          timeInfo = `In ${days} days`;
        } else if (hours > 0) {
          timeInfo = `In ${hours} hours`;
        } else if (minutes > 0) {
          timeInfo = `In ${minutes} minutes`;
        } else if (timeDiff > 0) {
          timeInfo = `In ${Math.floor(timeDiff / 1000)} seconds`;
          immediateCount++;
        } else {
          timeInfo = 'PAST - should be cancelled';
          immediateCount++;
        }
      } else if (!trigger) {
        timeInfo = 'IMMEDIATE';
        immediateCount++;
      }
      
      details.push(`${notif.content.data?.type}: ${timeInfo} - "${notif.content.body?.substring(0, 50)}..."`);
    }
    
    return {
      immediateCount,
      totalCount: aiNotifications.length,
      details
    };
  } catch (error) {
    console.error('Error checking notifications:', error);
    return {
      immediateCount: 0,
      totalCount: 0,
      details: ['Error checking notifications']
    };
  }
}

/**
 * Debug function to view ALL scheduled notifications
 */
export async function viewAllScheduledNotifications() {
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`\n=== ALL SCHEDULED NOTIFICATIONS (${allScheduled.length} total) ===\n`);
    
    allScheduled.forEach((n, index) => {
      const trigger = n.trigger as any;
      let triggerInfo = 'Unknown';
      
      if (trigger?.seconds) {
        triggerInfo = `In ${trigger.seconds} seconds`;
      } else if (trigger?.date) {
        const date = new Date(trigger.date);
        triggerInfo = date.toLocaleString();
      } else if (!trigger) {
        triggerInfo = 'IMMEDIATE';
      }
      
      console.log(`${index + 1}. Title: "${n.content.title}"`);
      console.log(`   Body: "${n.content.body?.substring(0, 50)}..."`);
      console.log(`   Type: ${n.content.data?.type || 'none'}`);
      console.log(`   Category: ${n.content.categoryIdentifier || 'none'}`);
      console.log(`   Trigger: ${triggerInfo}`);
      console.log(`   ID: ${n.identifier}`);
      console.log('');
    });
    
    // Count AI-related notifications
    const aiCount = allScheduled.filter(n => {
      const title = n.content.title || '';
      const body = n.content.body || '';
      const type = n.content.data?.type || '';
      
      return title.toLowerCase().includes('wellness') ||
             title.toLowerCase().includes('ai') ||
             title.toLowerCase().includes('coach') ||
             body.toLowerCase().includes('wellness') ||
             type.includes('ai_wellness');
    }).length;
    
    console.log(`=== SUMMARY: ${aiCount} AI-related notifications out of ${allScheduled.length} total ===\n`);
    
    return allScheduled;
  } catch (error) {
    console.error('Error viewing notifications:', error);
    return [];
  }
}