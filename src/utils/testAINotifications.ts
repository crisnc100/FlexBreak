import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Test AI Wellness notification with text input
 * This simulates an AI wellness check-in notification
 */
export const testAIWellnessNotification = async () => {
  console.log('🧪 Testing AI Wellness notification with text input...');
  
  try {
    // Get user ID if available
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    
    // Schedule a test notification immediately
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "AI Wellness Check 🤖",
        body: "Hey! How's your body and mind feeling today? Tap to chat",
        data: { 
          type: 'ai_wellness_checkin',
          userId
        },
        categoryIdentifier: 'AI_WELLNESS_CHECK',
      },
      trigger: null // Immediate
    });
    
    console.log('✅ Test AI wellness notification sent with ID:', identifier);
    return identifier;
  } catch (error) {
    console.error('❌ Error sending test AI wellness notification:', error);
    throw error;
  }
};

/**
 * Test effectiveness check notification
 * This simulates a follow-up effectiveness check
 */
export const testEffectivenessNotification = async () => {
  console.log('🧪 Testing effectiveness check notification...');
  
  try {
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Quick Check-in 📊',
        body: 'Did the neck stretches help?',
        data: {
          type: 'ai_wellness_effectiveness',
          userId,
          action: 'neck stretches'
        },
        categoryIdentifier: 'EFFECTIVENESS_CHECK'
      },
      trigger: null // Immediate
    });
    
    console.log('✅ Test effectiveness notification sent with ID:', identifier);
    return identifier;
  } catch (error) {
    console.error('❌ Error sending test effectiveness notification:', error);
    throw error;
  }
};

/**
 * Test the complete AI wellness flow
 * 1. Send check-in notification
 * 2. User replies (simulated)
 * 3. AI response notification
 * 4. Effectiveness check after delay
 */
export const testCompleteAIFlow = async () => {
  console.log('🧪 Testing complete AI wellness flow...');
  
  try {
    // Step 1: Send initial check-in
    console.log('Step 1: Sending initial check-in...');
    await testAIWellnessNotification();
    
    // Step 2: Simulate user response (this would normally happen via notification action)
    console.log('Step 2: User should reply to the notification...');
    console.log('⚠️  Please tap the notification and enter a response like "My neck is sore"');
    
    // The rest of the flow will be triggered by the notification handlers
    console.log('✅ Test flow initiated. Watch for notifications!');
    
    return {
      success: true,
      message: 'AI wellness test flow started. Please interact with the notifications.'
    };
  } catch (error) {
    console.error('❌ Error in complete AI flow test:', error);
    throw error;
  }
};

/**
 * Check scheduled AI wellness notifications
 */
export const checkScheduledAINotifications = async () => {
  console.log('🧪 Checking scheduled AI wellness notifications...');
  
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const aiNotifications = scheduled.filter(n => 
      n.content.data?.type === 'ai_wellness_checkin'
    );
    
    console.log(`Found ${aiNotifications.length} AI wellness notifications:`);
    
    aiNotifications.forEach((n, index) => {
      const trigger = n.trigger as any;
      let scheduledTime = 'Unknown';
      
      if (trigger?.date) {
        scheduledTime = new Date(trigger.date).toLocaleString();
      } else if (trigger?.weekday) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        scheduledTime = `${days[trigger.weekday - 1]} at ${trigger.hour}:${String(trigger.minute).padStart(2, '0')}`;
      }
      
      console.log(`${index + 1}. ${n.content.title} - Scheduled for: ${scheduledTime}`);
    });
    
    return aiNotifications;
  } catch (error) {
    console.error('❌ Error checking scheduled notifications:', error);
    throw error;
  }
};