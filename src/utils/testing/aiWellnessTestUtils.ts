import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { KEYS } from '../../services/storageService';
import { scheduleAIWellnessV2, debugAIWellnessNotifications } from '../../services/ai/scheduling/notificationScheduler';
import memoryService from '../../services/ai/memory/memoryService';

/**
 * Testing utilities for AI Wellness Coach
 * ⚠️ REMOVE BEFORE PRODUCTION
 */

export const AIWellnessTestUtils = {
  // Reset AI Wellness to fresh state
  async resetToFreshState() {
    console.log('🧹 Resetting AI Wellness to fresh state...');
    
    // Clear all AI wellness data
    const keys = Object.values(KEYS.AI_WELLNESS);
    await AsyncStorage.multiRemove(keys);
    
    // Clear wellness memory
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    await memoryService.clearMemory(userId);
    
    // Cancel all notifications
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const aiNotifications = allNotifications.filter(n => 
      n.content.data?.type?.includes('ai_wellness')
    );
    
    for (const notification of aiNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    
    console.log('✅ AI Wellness reset complete');
  },
  
  // Simulate different user states
  async simulateUserState(state: 'new' | 'returning' | 'premium' | 'heavy_user') {
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    
    switch (state) {
      case 'new':
        // Fresh user, no data
        await this.resetToFreshState();
        break;
        
      case 'returning':
        // User with some history
        await AsyncStorage.setItem(KEYS.AI_WELLNESS.USER_NAME, 'TestUser');
        await memoryService.addConversationInsight(userId, {
          category: 'back_pain',
          solution: 'cat-cow stretch',
          effectiveness: 'helped',
          timeOfDay: 'afternoon'
        });
        break;
        
      case 'premium':
        // Premium user with preferences
        await AsyncStorage.setItem(KEYS.USER.PREMIUM, 'true');
        await AsyncStorage.setItem(KEYS.AI_WELLNESS.TIME_PREFERENCE, 'morning');
        break;
        
      case 'heavy_user':
        // User with lots of history
        for (let i = 0; i < 20; i++) {
          await memoryService.addConversationInsight(userId, {
            category: ['back_pain', 'stress', 'fatigue'][i % 3],
            solution: ['stretches', 'breathing', 'walk'][i % 3],
            effectiveness: 'helped',
            timeOfDay: 'afternoon'
          });
        }
        break;
    }
    
    console.log(`✅ Simulated ${state} user state`);
  },
  
  // Schedule test notification in 30 seconds
  async scheduleTestNotification(personalized = true) {
    console.log('⏰ Scheduling test notification in 30 seconds...');
    
    const userName = personalized ? await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME) : null;
    const name = userName || 'there';
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Hey ${name}, quick test! 🧪`,
        body: personalized 
          ? `How's your back feeling today? Tap to chat or hold to use voice 🎙️`
          : `How are you feeling? Tap to chat or hold to use voice 🎙️`,
        sound: true,
        data: { 
          type: 'ai_wellness_checkin',
          isTest: true
        },
        categoryIdentifier: 'AI_WELLNESS_SIMPLE' as any,
      },
      trigger: {
        seconds: 30
      }
    });
    
    console.log(`✅ Test notification scheduled with ID: ${notificationId}`);
    return notificationId;
  },
  
  // View current AI Wellness state
  async getCurrentState() {
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    
    const state = {
      enabled: await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED) === 'true',
      userName: await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME),
      hasSeenWelcome: await AsyncStorage.getItem(KEYS.AI_WELLNESS.HAS_SEEN_WELCOME) === 'true',
      isPremium: await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true',
      timePreference: await AsyncStorage.getItem(KEYS.AI_WELLNESS.TIME_PREFERENCE),
      memory: await memoryService.getMemory(userId),
      scheduledNotifications: await debugAIWellnessNotifications()
    };
    
    console.log('📊 Current AI Wellness State:', JSON.stringify(state, null, 2));
    return state;
  },
  
  // Speed up testing by scheduling notifications sooner
  async enableTestMode() {
    // Store original state
    await AsyncStorage.setItem('@ai_wellness_test_mode', 'true');
    console.log('🚀 Test mode enabled - notifications will fire sooner');
    console.warn('⚠️  Remember to disable test mode before production!');
  },
  
  async disableTestMode() {
    await AsyncStorage.removeItem('@ai_wellness_test_mode');
    console.log('✅ Test mode disabled');
  },
  
  // Clear premium upgrade seen flag to test upgrade flow
  async clearPremiumUpgradeSeen() {
    await AsyncStorage.removeItem('@ai_wellness_premium_upgrade_seen');
    console.log('✅ Premium upgrade seen flag cleared - modal will show on next premium upgrade');
  },
  
  // Simulate premium upgrade
  async simulatePremiumUpgrade() {
    // First ensure user was free
    await AsyncStorage.setItem('@last_premium_status', 'false');
    // Then set to premium
    await AsyncStorage.setItem(KEYS.USER.PREMIUM, 'true');
    console.log('✅ Simulated premium upgrade - reload app to see upgrade modal');
  }
};

// Export for use in React Native Debugger console
if (__DEV__) {
  (global as any).AITest = AIWellnessTestUtils;
  console.log('🧪 AI Wellness Test Utils available as: AITest');
  console.log('   - AITest.resetToFreshState()');
  console.log('   - AITest.simulateUserState("new" | "returning" | "premium" | "heavy_user")');
  console.log('   - AITest.scheduleTestNotification()');
  console.log('   - AITest.getCurrentState()');
  console.log('   - AITest.enableTestMode() / disableTestMode()');
  console.log('   - AITest.clearPremiumUpgradeSeen()');
  console.log('   - AITest.simulatePremiumUpgrade()');
}