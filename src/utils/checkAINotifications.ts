import * as Notifications from 'expo-notifications';
import { getNotificationsByType, NotificationType } from './notificationManager';

/**
 * Get detailed information about all scheduled AI wellness notifications
 */
export async function getScheduledAINotifications() {
  try {
    // Get all AI wellness and upgrade prompt notifications
    const aiNotifications = await getNotificationsByType([
      NotificationType.AI_WELLNESS,
      NotificationType.UPGRADE_PROMPT
    ]);
    
    if (aiNotifications.length === 0) {
      console.log('🤖 No AI wellness notifications scheduled');
      return {
        count: 0,
        notifications: [],
        summary: 'No AI wellness notifications scheduled'
      };
    }
    
    // Sort by trigger date
    const sortedNotifications = aiNotifications.sort((a, b) => {
      const triggerA = a.trigger as any;
      const triggerB = b.trigger as any;
      
      // Handle different trigger types
      const dateA = triggerA.date ? new Date(triggerA.date).getTime() : 
                    triggerA.seconds ? Date.now() + (triggerA.seconds * 1000) : 0;
      const dateB = triggerB.date ? new Date(triggerB.date).getTime() : 
                    triggerB.seconds ? Date.now() + (triggerB.seconds * 1000) : 0;
      
      return dateA - dateB;
    });
    
    // Format notification details
    const details = sortedNotifications.map((notification, index) => {
      const trigger = notification.trigger as any;
      const data = notification.content.data;
      
      let scheduledTime: string;
      let daysFromNow: number;
      
      if (trigger.date) {
        const date = new Date(trigger.date);
        scheduledTime = date.toLocaleString();
        daysFromNow = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      } else if (trigger.seconds) {
        const date = new Date(Date.now() + trigger.seconds * 1000);
        scheduledTime = date.toLocaleString();
        daysFromNow = Math.ceil(trigger.seconds / (60 * 60 * 24));
      } else {
        scheduledTime = 'Unknown';
        daysFromNow = -1;
      }
      
      // Determine notification type
      const isUpgradePrompt = data?.type === 'ai_wellness_upgrade' || 
                             notification.content.title?.includes('Missing') ||
                             notification.content.title?.includes('Want daily');
      const isWelcome = data?.isWelcome || data?.isPremiumWelcome;
      const isCheckIn = !isUpgradePrompt && !isWelcome;
      
      const type = isWelcome ? '🎉 Welcome' : 
                  isUpgradePrompt ? '💎 Upgrade' : 
                  '💪 Check-in';
      
      return {
        index: index + 1,
        type,
        title: notification.content.title,
        body: notification.content.body,
        scheduledTime,
        daysFromNow: daysFromNow >= 0 ? daysFromNow : 0,
        dayOfWeek: data?.dayOfWeek !== undefined ? getDayName(data.dayOfWeek) : 'N/A',
        identifier: notification.identifier
      };
    });
    
    // Create summary
    const welcomeCount = details.filter(d => d.type.includes('Welcome')).length;
    const checkInCount = details.filter(d => d.type.includes('Check-in')).length;
    const upgradeCount = details.filter(d => d.type.includes('Upgrade')).length;
    
    const summary = `Total: ${aiNotifications.length} (${checkInCount} check-ins, ${upgradeCount} upgrades, ${welcomeCount} welcomes)`;
    
    // Log detailed information
    console.log(`\n🤖 AI Wellness Notifications (${aiNotifications.length} total)`);
    console.log('='.repeat(50));
    
    details.forEach(detail => {
      console.log(`\n${detail.index}. ${detail.type}`);
      console.log(`   Title: ${detail.title}`);
      console.log(`   Body: ${detail.body}`);
      console.log(`   When: ${detail.scheduledTime}`);
      if (detail.daysFromNow > 0) {
        console.log(`   Days from now: ${detail.daysFromNow}`);
      }
      if (detail.dayOfWeek !== 'N/A') {
        console.log(`   Day: ${detail.dayOfWeek}`);
      }
    });
    
    console.log('\n' + '='.repeat(50));
    console.log(summary);
    
    return {
      count: aiNotifications.length,
      notifications: details,
      summary,
      checkIns: checkInCount,
      upgrades: upgradeCount,
      welcomes: welcomeCount
    };
    
  } catch (error) {
    console.error('Error checking AI notifications:', error);
    return {
      count: 0,
      notifications: [],
      summary: 'Error checking notifications'
    };
  }
}

/**
 * Log a quick summary of AI wellness notifications
 */
export async function logAINotificationSummary() {
  const result = await getScheduledAINotifications();
  return result.summary;
}

/**
 * Check if AI notifications are properly scheduled based on user type
 */
export async function validateAINotificationSchedule(isPremium: boolean): Promise<{
  isValid: boolean;
  message: string;
}> {
  const result = await getScheduledAINotifications();
  
  // Expected counts
  const expectedCheckIns = isPremium ? 7 : 1; // Daily for premium, Wednesday for free
  const expectedUpgrades = isPremium ? 0 : 2; // Only for free users
  
  const isValid = result.checkIns === expectedCheckIns && 
                  result.upgrades === expectedUpgrades;
  
  let message = '';
  if (isValid) {
    message = `✅ AI notifications correctly scheduled for ${isPremium ? 'premium' : 'free'} user`;
  } else {
    message = `❌ AI notification mismatch:\n`;
    message += `   Check-ins: ${result.checkIns} (expected ${expectedCheckIns})\n`;
    message += `   Upgrades: ${result.upgrades} (expected ${expectedUpgrades})`;
  }
  
  return { isValid, message };
}

function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}