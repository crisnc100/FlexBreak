import aiWellnessService from '../../services/ai/aiWellnessService';
import { configureAINotifications } from '../../services/notifications/aiNotificationHandler';
import { scheduleAICheckIns, cancelAICheckIns, getScheduledAINotifications } from '../../services/ai/aiWellnessScheduler';

export const testAIIntegration = async () => {
  console.log('🤖 Testing AI Wellness Integration...\n');
  
  const tests = [
    {
      name: 'Basic AI Response Test',
      fn: async () => {
        const response = await aiWellnessService.processWellnessCheckIn(
          "my back hurts from sitting too long"
        );
        console.log('Response:', response.response);
        console.log('Category:', response.category);
        console.log('Actions:', response.suggestedActions);
        console.log('Fallback:', response.fallback ? 'Yes' : 'No');
        return response.response.length > 0;
      }
    },
    {
      name: 'Stress Response Test',
      fn: async () => {
        const response = await aiWellnessService.processWellnessCheckIn(
          "feeling stressed about deadlines"
        );
        console.log('Response:', response.response);
        return response.category === 'stress';
      }
    },
    {
      name: 'Positive Response Test',
      fn: async () => {
        const response = await aiWellnessService.processWellnessCheckIn(
          "feeling great today!"
        );
        console.log('Response:', response.response);
        return response.category === 'positive';
      }
    },
    {
      name: 'Notification Categories Test',
      fn: async () => {
        await configureAINotifications();
        console.log('Notification categories configured');
        return true;
      }
    },
    {
      name: 'Schedule Check-ins Test',
      fn: async () => {
        // First cancel any existing
        await cancelAICheckIns();
        
        // Schedule new ones
        await scheduleAICheckIns(false); // Test free tier
        
        // Check what was scheduled
        const scheduled = await getScheduledAINotifications();
        console.log(`Scheduled ${scheduled.length} notifications:`);
        scheduled.forEach(n => {
          console.log(`- ${n.scheduledFor}`);
        });
        
        return scheduled.length === 2; // Should be 2 for free tier (Wed & Fri)
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n📝 Running: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  return { passed, failed };
};

export const runQuickTest = async () => {
  console.log('🚀 Quick AI Wellness Test\n');
  
  try {
    const testInputs = [
      "my neck is stiff",
      "can't focus on work",
      "feeling good but could use a stretch"
    ];
    
    for (const input of testInputs) {
      console.log(`\nUser: "${input}"`);
      const response = await aiWellnessService.processWellnessCheckIn(input);
      console.log(`AI: ${response.response}`);
      if (response.fallback) {
        console.log('(Using fallback response)');
      }
    }
    
    console.log('\n✅ Quick test completed successfully!');
  } catch (error) {
    console.error('❌ Quick test failed:', error);
  }
};