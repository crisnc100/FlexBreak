# AI Wellness Coach Implementation Handover Guide

## Overview
This document provides step-by-step instructions for implementing the AI Wellness Coach feature in FlexBreak. The feature allows users to have natural conversations about their wellness through notifications, receiving personalized AI-powered suggestions while maintaining complete privacy.

## Prerequisites
Before starting, ensure you have:
- [ ] Access to the FlexBreak codebase
- [ ] Node.js and npm installed
- [ ] Expo CLI installed (`npm install -g expo-cli`)
- [ ] An OpenRouter API key (get one at https://openrouter.ai)
- [ ] Basic understanding of React Native and TypeScript

## Implementation Timeline
- **Week 1**: Core infrastructure and API setup
- **Week 2**: AI service implementation and notification integration
- **Week 3**: User experience features and testing
- **Week 4**: Polish, error handling, and deployment

---

## Phase 1: Initial Setup (Days 1-2)

### Step 1.1: Create Required Directories
```bash
# Navigate to your project root
cd /path/to/FlexBreak

# Create the new directory structure
mkdir -p src/services/ai
mkdir -p src/services/notifications
mkdir -p src/utils/aiWellness
mkdir -p src/config
```

### Step 1.2: Install Dependencies
```bash
# Install environment variable support
npm install react-native-dotenv

# If using TypeScript, install types
npm install --save-dev @types/react-native-dotenv
```

### Step 1.3: Set Up Environment Variables
1. Create `.env` file in project root:
```bash
touch .env
```

2. Add your API key to `.env`:
```
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
APP_URL=https://flexbreak.app
```

3. Add `.env` to `.gitignore`:
```bash
echo ".env" >> .gitignore
```

### Step 1.4: Configure Babel
Update `babel.config.js`:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        envName: 'APP_ENV',
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
        verbose: false,
      }],
    ],
  };
};
```

### Step 1.5: Create TypeScript Declaration
Create `src/types/env.d.ts`:
```typescript
declare module '@env' {
  export const OPENROUTER_API_KEY: string;
  export const APP_URL: string;
}
```

---

## Phase 2: Core AI Implementation (Days 3-5)

### Step 2.1: Create AI Configuration
Create `src/config/aiConfig.ts`:
```typescript
// Copy the AI_CONFIG from the AI_WELLNESS_COACH_MVP.md file
// This includes models, limits, and API settings
```

### Step 2.2: Implement OpenRouter Service
1. Create `src/services/ai/openRouterService.ts`
2. Copy the complete OpenRouterService class from the MVP document
3. Test the service independently:
```typescript
// In App.tsx or a test file, add temporarily:
import openRouterService from './src/services/ai/openRouterService';

// Test the connection
const testAI = async () => {
  try {
    const response = await openRouterService.chat([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say hello!' }
    ]);
    console.log('AI Response:', response);
  } catch (error) {
    console.error('AI Test Failed:', error);
  }
};
```

### Step 2.3: Create Prompt Templates
Create `src/services/ai/promptTemplates.ts`:
```typescript
export const WELLNESS_COACH_PROMPT = `You are a caring wellness coach for FlexBreak app. 
Your role is to provide brief, practical advice for physical wellness and work-related stress.

Guidelines:
- Keep responses under 50 words
- Focus on stretches, movement, posture, and motivation
- Be encouraging and specific
- Suggest actions that can be done at a desk or in a small space
- If someone mentions pain, suggest gentle movements but remind them to consult a healthcare provider for persistent issues

Response format:
1. Acknowledge their feeling
2. Provide one specific, actionable suggestion
3. End with encouragement`;

export const CONTEXT_TEMPLATE = {
  timeOfDay: {
    morning: 'User is starting their day',
    afternoon: 'User is in the middle of their workday',
    evening: 'User is winding down'
  },
  patterns: {
    recurring: 'This issue happens frequently at this time',
    new: 'This is a new concern',
    improving: 'This has been getting better'
  }
};
```

### Step 2.4: Create Context Builder
Create `src/services/ai/contextBuilder.ts`:
```typescript
export const buildUserContext = async (userInput: string, userId?: string) => {
  const now = new Date();
  const hour = now.getHours();
  
  let timeOfDay: 'morning' | 'afternoon' | 'evening';
  if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else timeOfDay = 'evening';
  
  return {
    message: userInput,
    timeOfDay,
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
    // Add pattern detection here based on stored history
  };
};
```

### Step 2.5: Implement AI Wellness Service
1. Create `src/services/ai/aiWellnessService.ts`
2. Copy the complete AIWellnessService class from the MVP document
3. Ensure all imports are correct

---

## Phase 3: Notification Integration (Days 6-8)

### Step 3.1: Update Storage Service
Add to `src/services/storageService.ts`:
```typescript
// Add new keys for AI Wellness
export const KEYS = {
  // ... existing keys ...
  AI_WELLNESS: {
    CONVERSATION_HISTORY: '@ai_wellness_conversations',
    USER_PATTERNS: '@ai_wellness_patterns',
    EFFECTIVENESS_TRACKING: '@ai_wellness_effectiveness',
    LAST_CHECKIN: '@ai_wellness_last_checkin',
    WEEKLY_USAGE: '@ai_wellness_weekly_usage'
  }
};
```

### Step 3.2: Configure Notification Categories
In your app initialization (likely `App.tsx`):
```typescript
import * as Notifications from 'expo-notifications';

const configureAINotifications = async () => {
  // Set up text input category
  await Notifications.setNotificationCategoryAsync('AI_WELLNESS_CHECK', [
    {
      identifier: 'REPLY',
      buttonTitle: 'Reply',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
      textInput: {
        submitButtonTitle: 'Send',
        placeholder: 'How are you feeling?'
      }
    }
  ]);
  
  // Set up effectiveness check category
  await Notifications.setNotificationCategoryAsync('EFFECTIVENESS_CHECK', [
    {
      identifier: 'YES',
      buttonTitle: 'Yes! 👍',
      options: { opensAppToForeground: false }
    },
    {
      identifier: 'SOMEWHAT',
      buttonTitle: 'Somewhat',
      options: { opensAppToForeground: false }
    },
    {
      identifier: 'NO',
      buttonTitle: 'Not really',
      options: { opensAppToForeground: false }
    }
  ]);
};

// Call this in your app initialization
useEffect(() => {
  configureAINotifications();
}, []);
```

### Step 3.3: Create AI Notification Handler
Create `src/services/notifications/aiNotificationHandler.ts`:
1. Copy the handler implementation from the MVP document
2. Import the AI wellness service
3. Set up response listeners

### Step 3.4: Schedule AI Check-ins
Create `src/services/ai/aiWellnessScheduler.ts`:
```typescript
import * as Notifications from 'expo-notifications';
import { getIsPremium } from '../storageService';

export const scheduleAICheckIns = async () => {
  // Cancel existing AI check-ins
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const aiCheckIns = scheduled.filter(n => 
    n.content.data?.type === 'ai_wellness_checkin'
  );
  
  for (const notification of aiCheckIns) {
    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
  }
  
  // Schedule new check-ins based on premium status
  const isPremium = await getIsPremium();
  const checkInDays = isPremium 
    ? [1, 2, 3, 4, 5, 6, 0] // Daily for premium
    : [3, 5]; // Wed & Fri for free
  
  for (const day of checkInDays) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "AI Wellness Check 🤖",
        body: "Hey! How's your body and mind feeling today? Tap to chat",
        data: { type: 'ai_wellness_checkin' },
        categoryIdentifier: 'AI_WELLNESS_CHECK',
      },
      trigger: {
        weekday: day,
        hour: 14,
        minute: 0,
        repeats: true
      }
    });
  }
};
```

---

## Phase 4: User Experience Features (Days 9-11)

### Step 4.1: Add to Settings Screen
In your settings/preferences screen:
```typescript
import { Switch, View, Text } from 'react-native';
import { scheduleAICheckIns } from '../services/ai/aiWellnessScheduler';

const SettingsScreen = () => {
  const [aiWellnessEnabled, setAIWellnessEnabled] = useState(false);
  
  useEffect(() => {
    // Load saved preference
    AsyncStorage.getItem('@ai_wellness_enabled').then(value => {
      setAIWellnessEnabled(value === 'true');
    });
  }, []);
  
  const toggleAIWellness = async (value: boolean) => {
    setAIWellnessEnabled(value);
    await AsyncStorage.setItem('@ai_wellness_enabled', value.toString());
    
    if (value) {
      await scheduleAICheckIns();
    } else {
      // Cancel AI check-ins
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const aiCheckIns = scheduled.filter(n => 
        n.content.data?.type === 'ai_wellness_checkin'
      );
      
      for (const notification of aiCheckIns) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  };
  
  return (
    <View>
      <Text>AI Wellness Coach</Text>
      <Text>Get personalized wellness advice through chat</Text>
      <Switch 
        value={aiWellnessEnabled}
        onValueChange={toggleAIWellness}
      />
      {!isPremium && (
        <Text>Free: 2 chats/week (Wed & Fri)</Text>
      )}
    </View>
  );
};
```

### Step 4.2: Create Usage Tracking
Create `src/utils/aiWellness/usageTracker.ts`:
```typescript
export const trackAIUsage = async (userId: string) => {
  const today = new Date().toDateString();
  const usageKey = `@ai_usage_${userId}_${today}`;
  
  const currentUsage = await AsyncStorage.getItem(usageKey);
  const count = currentUsage ? parseInt(currentUsage) : 0;
  
  await AsyncStorage.setItem(usageKey, (count + 1).toString());
  
  // Optional: Track weekly stats
  const weekKey = `@ai_usage_week_${userId}`;
  const weekStats = await AsyncStorage.getItem(weekKey);
  // Update weekly statistics
};
```

---

## Phase 5: Testing & Error Handling (Days 12-14)

### Step 5.1: Create Test Suite
Create `src/utils/testing/aiWellnessTests.ts`:
```typescript
export const runAIWellnessTests = async () => {
  console.log('Starting AI Wellness Tests...');
  
  const tests = [
    {
      name: 'Connection Test',
      fn: async () => {
        const response = await aiWellnessService.processWellnessCheckIn('test');
        return response.response.length > 0;
      }
    },
    {
      name: 'Category Detection',
      fn: async () => {
        const response = await aiWellnessService.processWellnessCheckIn('my back hurts');
        return response.category === 'pain';
      }
    },
    {
      name: 'Usage Limit Test',
      fn: async () => {
        // Test free tier limits
        // Mock multiple requests
      }
    }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      console.log(`✅ ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }
};
```

### Step 5.2: Add Error Boundaries
Create fallback responses for common issues:
```typescript
const ERROR_RESPONSES = {
  network: "Connection issue - but here's a quick tip: Stand up and do 5 shoulder rolls!",
  rateLimit: "You've used your AI chats for today. Try our pre-set routines!",
  timeout: "Taking too long - how about a simple 2-minute walk instead?",
  default: "Something went wrong, but movement is always good! Try a quick stretch."
};
```

---

## Deployment Checklist

### Before Going Live:
- [ ] API key is securely stored (not in code)
- [ ] Test on both iOS and Android
- [ ] Verify notification permissions work
- [ ] Test free tier limits (2/week)
- [ ] Test premium unlimited access
- [ ] Ensure fallback responses work
- [ ] Monitor API costs for a few days
- [ ] Create user documentation

### Performance Metrics to Track:
- Average response time
- API error rate
- User engagement rate
- Effectiveness feedback scores
- Cost per user

### Common Issues & Solutions:

**Issue**: Notifications not showing text input
**Solution**: Ensure notification categories are set up before scheduling

**Issue**: API responses too slow
**Solution**: Implement timeout (30s) and show fallback response

**Issue**: High API costs
**Solution**: Implement response caching for common inputs

**Issue**: Users hitting rate limits
**Solution**: Show clear upgrade prompt with value proposition

---

## Support & Troubleshooting

### Debug Mode
Add to your development environment:
```typescript
const DEBUG_AI_WELLNESS = true;

if (DEBUG_AI_WELLNESS) {
  console.log('AI Wellness Debug Mode Active');
  // Log all AI interactions
  // Show API response times
  // Display token usage
}
```

### Monitoring Dashboard
Track these metrics:
1. Daily active AI users
2. Average messages per user
3. Most common wellness categories
4. API costs vs revenue
5. User satisfaction (from effectiveness tracking)

### Next Steps After MVP:
1. Add voice input support
2. Create wellness insights dashboard
3. Implement group/team features
4. Add more AI models for variety
5. Build recommendation engine based on effectiveness data

---

## Final Notes

Remember:
- Start with a small beta group
- Monitor costs closely in the first week
- Gather user feedback actively
- Be ready to adjust prompts based on real usage
- Keep privacy as the top priority

This feature has the potential to be a major differentiator for FlexBreak. The key is balancing AI intelligence with user privacy and cost management.

Good luck with the implementation! 🚀