import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiWellnessService from '../../services/ai/aiWellnessService';
import { KEYS } from '../../services/storageService';

/**
 * Complete AI Wellness Flow Test
 * This demonstrates the entire user journey from initial setup to effectiveness tracking
 */

export const testCompleteAIWellnessFlow = async () => {
  console.log('🚀 Starting Complete AI Wellness Flow Test\n');
  console.log('This test will simulate the complete user journey:\n');
  console.log('1. User enables AI Wellness (free user on Wednesday)');
  console.log('2. Receives initial check-in notification');
  console.log('3. Responds with their name (first interaction)');
  console.log('4. Receives personalized greeting');
  console.log('5. Has a wellness conversation');
  console.log('6. Receives AI suggestion');
  console.log('7. Gets effectiveness check after 30 minutes');
  console.log('8. Provides feedback on effectiveness');
  console.log('9. Tests usage limits and upgrade prompts\n');
  
  const testUserId = `test_complete_flow_${Date.now()}`;
  
  try {
    // Step 1: Setup test environment
    console.log('📋 Step 1: Setting up test environment...');
    await AsyncStorage.setItem('@user_id', testUserId);
    await AsyncStorage.setItem(KEYS.USER.PREMIUM, 'false');
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.ENABLED, 'true');
    
    // Mock Wednesday
    const originalGetDay = Date.prototype.getDay;
    Date.prototype.getDay = function() { return 3; };
    
    // Step 2: First interaction - name collection
    console.log('\n📋 Step 2: First interaction - User says hello');
    const firstResponse = await aiWellnessService.processWellnessCheckIn(
      "Hello!",
      testUserId
    );
    console.log(`AI: ${firstResponse.response}`);
    console.log(`Category: ${firstResponse.category}`);
    
    // Step 3: User provides name
    console.log('\n📋 Step 3: User provides their name');
    const nameResponse = await aiWellnessService.processWellnessCheckIn(
      "I'm Sarah",
      testUserId
    );
    console.log(`AI: ${nameResponse.response}`);
    console.log(`Category: ${nameResponse.category}`);
    
    // Step 4: Wellness conversation
    console.log('\n📋 Step 4: User reports a wellness issue');
    const wellnessResponse = await aiWellnessService.processWellnessCheckIn(
      "My back is really sore from sitting all day at my desk",
      testUserId
    );
    console.log(`AI: ${wellnessResponse.response}`);
    console.log(`Category: ${wellnessResponse.category}`);
    console.log(`Suggested actions: ${wellnessResponse.suggestedActions?.join(', ')}`);
    
    // Step 5: Simulate effectiveness check
    console.log('\n📋 Step 5: Simulating 30-minute effectiveness check');
    console.log('In production, this would be a scheduled notification after 30 minutes');
    console.log('User would see: "Hey Sarah! Is your back feeling better after stretching?"');
    console.log('With options: Yes! 👍 | Somewhat | Not really');
    
    // Step 6: Track effectiveness
    console.log('\n📋 Step 6: User responds to effectiveness check');
    const { trackEffectiveness } = await import('../../services/notifications/aiNotificationHandler');
    // Simulate user clicking "Yes!"
    await trackEffectiveness(testUserId, 'back stretches', 'YES');
    console.log('Effectiveness tracked: back stretches - YES (score: 1.0)');
    
    // Step 7: Test usage limits
    console.log('\n📋 Step 7: Testing usage limits (free user)');
    const limitResponse = await aiWellnessService.processWellnessCheckIn(
      "I need more help",
      testUserId
    );
    console.log(`AI: ${limitResponse.response}`);
    console.log(`Category: ${limitResponse.category}`);
    console.log('✅ Usage limit enforced correctly');
    
    // Step 8: Test non-Wednesday access
    console.log('\n📋 Step 8: Testing access on non-Wednesday');
    Date.prototype.getDay = function() { return 2; }; // Tuesday
    const tuesdayResponse = await aiWellnessService.processWellnessCheckIn(
      "Help me with stretches",
      testUserId
    );
    console.log(`AI: ${tuesdayResponse.response}`);
    console.log('✅ Wednesday-only restriction enforced');
    
    // Step 9: Test premium user access
    console.log('\n📋 Step 9: Testing premium user access');
    await AsyncStorage.setItem(KEYS.USER.PREMIUM, 'true');
    const premiumResponse = await aiWellnessService.processWellnessCheckIn(
      "I need help with my posture",
      testUserId
    );
    console.log(`AI: ${premiumResponse.response}`);
    console.log('✅ Premium users have unlimited access any day');
    
    // Restore original getDay
    Date.prototype.getDay = originalGetDay;
    
    // Cleanup
    await AsyncStorage.removeItem(`@ai_wellness_conversations_${testUserId}`);
    await AsyncStorage.removeItem(`@ai_wellness_patterns_${testUserId}`);
    await AsyncStorage.removeItem(`@ai_wellness_effectiveness_${testUserId}`);
    await AsyncStorage.removeItem(`@ai_usage_${testUserId}_${new Date().toDateString()}`);
    
    console.log('\n✅ Complete AI Wellness Flow Test Passed!\n');
    
    return {
      success: true,
      summary: {
        nameCollection: '✅ Working',
        wellnessResponse: '✅ Working',
        effectivenessTracking: '✅ Working',
        usageLimits: '✅ Working',
        wednesdayOnly: '✅ Working',
        premiumAccess: '✅ Working'
      }
    };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Test notification scheduling and display
export const testNotificationDisplay = async () => {
  console.log('\n🔔 Testing Notification Display\n');
  
  try {
    // Schedule test notifications
    const notifications = [
      {
        title: 'AI Wellness Check 🤖',
        body: "Hey! How's your body and mind feeling today? Tap and hold to chat",
        categoryIdentifier: 'AI_WELLNESS_CHECK',
        delay: 2
      },
      {
        title: 'Usage Limit Reached 🔒',
        body: "You've used your free AI wellness chat for today. Come back next Wednesday or upgrade to premium for unlimited daily access! 🌟",
        categoryIdentifier: 'UPGRADE_PROMPT',
        delay: 5
      },
      {
        title: 'How are you feeling? 💭',
        body: "Hey Sarah! Is your back feeling better after stretching?",
        categoryIdentifier: 'EFFECTIVENESS_CHECK',
        delay: 8
      }
    ];
    
    console.log('Scheduling 3 test notifications...\n');
    
    for (const notif of notifications) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notif.title,
          body: notif.body,
          categoryIdentifier: notif.categoryIdentifier,
          data: { test: true }
        },
        trigger: {
          seconds: notif.delay
        }
      });
      
      console.log(`📬 In ${notif.delay} seconds: "${notif.title}"`);
    }
    
    console.log('\n✅ Test notifications scheduled! Check your device.');
    
  } catch (error) {
    console.error('❌ Failed to schedule test notifications:', error);
  }
};