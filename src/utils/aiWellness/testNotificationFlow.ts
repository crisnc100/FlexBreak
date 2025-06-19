import * as Notifications from 'expo-notifications';
import aiWellnessService from '../../services/ai/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TestScenario {
  name: string;
  userInput: string;
  isPremium: boolean;
  dayOfWeek: number; // 0-6, where 3 is Wednesday
  previousUsageToday: number;
  expectedCategory: string;
  description: string;
}

export const testScenarios: TestScenario[] = [
  {
    name: "Free user on Wednesday - First use",
    userInput: "My back is really sore from sitting all day",
    isPremium: false,
    dayOfWeek: 3,
    previousUsageToday: 0,
    expectedCategory: "pain",
    description: "Should provide wellness advice for back pain"
  },
  {
    name: "Free user on Wednesday - Already used",
    userInput: "I need more help with stretches",
    isPremium: false,
    dayOfWeek: 3,
    previousUsageToday: 1,
    expectedCategory: "limit_reached",
    description: "Should show daily limit reached message"
  },
  {
    name: "Free user on Tuesday",
    userInput: "Feeling stressed about work",
    isPremium: false,
    dayOfWeek: 2,
    previousUsageToday: 0,
    expectedCategory: "limit_reached",
    description: "Should show Wednesday-only message"
  },
  {
    name: "Premium user any day",
    userInput: "Need help with posture",
    isPremium: true,
    dayOfWeek: 1,
    previousUsageToday: 5,
    expectedCategory: "posture",
    description: "Should always provide advice for premium users"
  },
  {
    name: "First time user - Name collection",
    userInput: "Hi there!",
    isPremium: false,
    dayOfWeek: 3,
    previousUsageToday: 0,
    expectedCategory: "name_collection",
    description: "Should ask for user's name on first interaction"
  },
  {
    name: "User providing name",
    userInput: "My name is Sarah",
    isPremium: false,
    dayOfWeek: 3,
    previousUsageToday: 0,
    expectedCategory: "greeting",
    description: "Should greet user by name"
  }
];

export const runNotificationFlowTest = async (scenario: TestScenario): Promise<{
  success: boolean;
  result: any;
  error?: string;
}> => {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📝 ${scenario.description}`);
  
  try {
    // Mock the current day
    const originalGetDay = Date.prototype.getDay;
    Date.prototype.getDay = function() {
      return scenario.dayOfWeek;
    };
    
    // Set up test user
    const testUserId = `test_user_${Date.now()}`;
    await AsyncStorage.setItem('@user_id', testUserId);
    await AsyncStorage.setItem('@user_premium', scenario.isPremium.toString());
    
    // Set previous usage if needed
    if (scenario.previousUsageToday > 0) {
      const todayStr = new Date().toDateString();
      const usageKey = `@ai_usage_${testUserId}_${todayStr}`;
      await AsyncStorage.setItem(usageKey, scenario.previousUsageToday.toString());
    }
    
    // If testing name collection, ensure no previous conversations
    if (scenario.expectedCategory === 'name_collection') {
      const conversationKey = `@ai_wellness_conversations_${testUserId}`;
      await AsyncStorage.removeItem(conversationKey);
    }
    
    // Process the wellness check-in
    const result = await aiWellnessService.processWellnessCheckIn(
      scenario.userInput,
      testUserId
    );
    
    // Restore original getDay
    Date.prototype.getDay = originalGetDay;
    
    // Clean up test data
    await AsyncStorage.removeItem(`@ai_usage_${testUserId}_${new Date().toDateString()}`);
    await AsyncStorage.removeItem(`@ai_wellness_conversations_${testUserId}`);
    
    // Verify result
    const success = result.category === scenario.expectedCategory;
    
    console.log(`✅ Response: ${result.response}`);
    console.log(`📊 Category: ${result.category} (expected: ${scenario.expectedCategory})`);
    console.log(`🎯 Test ${success ? 'PASSED' : 'FAILED'}`);
    
    return {
      success,
      result,
      error: success ? undefined : `Expected category ${scenario.expectedCategory}, got ${result.category}`
    };
  } catch (error) {
    console.error(`❌ Test failed with error: ${error.message}`);
    return {
      success: false,
      result: null,
      error: error.message
    };
  }
};

export const runAllNotificationTests = async (): Promise<{
  totalTests: number;
  passed: number;
  failed: number;
  results: any[];
}> => {
  console.log('🚀 Starting AI Wellness Notification Flow Tests\n');
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const scenario of testScenarios) {
    const result = await runNotificationFlowTest(scenario);
    results.push({
      scenario: scenario.name,
      ...result
    });
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📈 Test Summary:');
  console.log(`Total: ${testScenarios.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  
  return {
    totalTests: testScenarios.length,
    passed,
    failed,
    results
  };
};

// Test notification scheduling
export const testNotificationScheduling = async (isPremium: boolean): Promise<void> => {
  console.log(`\n🔔 Testing notification scheduling for ${isPremium ? 'Premium' : 'Free'} user`);
  
  // Import scheduler
  const { scheduleAICheckIns, getScheduledAINotifications } = await import('../../services/ai/aiWellnessScheduler');
  
  // Schedule notifications
  await scheduleAICheckIns(isPremium);
  
  // Get scheduled notifications
  const scheduled = await getScheduledAINotifications();
  
  console.log(`📅 Scheduled ${scheduled.length} notifications:`);
  scheduled.forEach(notif => {
    console.log(`  - ${notif.scheduledFor}`);
  });
  
  if (isPremium) {
    console.log(scheduled.length === 7 ? '✅ Correct: 7 daily notifications' : '❌ Error: Should have 7 notifications');
  } else {
    console.log(scheduled.length === 1 ? '✅ Correct: 1 Wednesday notification' : '❌ Error: Should have 1 notification');
  }
};