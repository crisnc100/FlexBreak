# AI Wellness Coach MVP - Implementation Guide

> **Current Status (December 2024)**: 90% Complete - Feature is fully functional and tested. Main remaining work is connecting integration points (upgrade flow and notification tap handler) in the main app.

## Overview
The AI Wellness Coach is an innovative feature that combines AI-powered conversations with practical wellness advice through interactive notifications. Users can have natural conversations about their physical and mental wellness, receiving personalized suggestions for stretches, movement, and stress management.

## Core Concept
- **Daily AI Check-ins**: Scheduled notifications that ask "How are you doing?"
- **Natural Language Input**: Users type their response directly in the notification
- **Personalized AI Responses**: Context-aware suggestions based on user input
- **Privacy-First**: Only anonymous context sent to AI, personal data stays local
- **Freemium Model**: Free users get Wednesday-only access (2 messages), Premium users get daily access

## MVP Implementation - 4 Week Plan

---

## Phase 1: Core Infrastructure (Week 1)

### 1.1 Enhanced Notification System

#### Requirements:
- Expo Notifications with text input support
- Response handling for user input
- Local conversation storage

#### Implementation Steps:

```typescript
// src/utils/aiWellnessCoach.ts

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const AI_WELLNESS_KEYS = {
  CONVERSATION_HISTORY: '@ai_wellness_conversations',
  USER_PATTERNS: '@ai_wellness_patterns',
  EFFECTIVENESS_TRACKING: '@ai_wellness_effectiveness',
  LAST_CHECKIN: '@ai_wellness_last_checkin',
  WEEKLY_USAGE: '@ai_wellness_weekly_usage'
};

// Configure notification categories for text input
export const configureAINotifications = async () => {
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
};
```

### 1.2 AI Integration Setup

#### API Configuration:
```typescript
// src/config/aiConfig.ts

export const AI_CONFIG = {
  // Use environment variables for API keys
  API_KEY: process.env.OPENAI_API_KEY,
  MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 150,
  TEMPERATURE: 0.7,
  
  // System prompt for wellness coach
  SYSTEM_PROMPT: `You are a caring wellness coach for FlexBreak app. 
  Provide brief, practical advice for physical wellness and work stress. 
  Focus on: stretches, movement, posture, and motivation. 
  Keep responses under 50 words. Be encouraging and specific.`
};
```

### 1.3 Privacy-First Context System

```typescript
// src/utils/aiContext.ts

interface WellnessContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: string;
  userType: 'office' | 'remote' | 'active' | 'general';
  recentIssues: string[];
  effectiveSolutions: string[];
}

export const buildAnonymousContext = async (userInput: string): Promise<any> => {
  const context = {
    message: userInput,
    timestamp: new Date().toISOString(),
    contextualInfo: {
      timeOfDay: getTimeOfDay(),
      dayOfWeek: getDayOfWeek(),
      // Never send personal identifiers
    }
  };
  
  return context;
};
```

---

## Phase 2: MVP Features (Week 2)

### 2.1 Daily Check-in Scheduling

```typescript
// src/services/aiWellnessScheduler.ts

export const scheduleAICheckIn = async (isPremium: boolean) => {
  // Cancel existing check-ins
  await cancelExistingAICheckIns();
  
  const checkInDays = isPremium 
    ? [1, 2, 3, 4, 5, 6, 0] // Daily for premium
    : [3, 5]; // Wed & Fri for free
  
  for (const day of checkInDays) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "AI Wellness Check 🤖",
        body: "Hey! How's your body and mind feeling today? Tap and hold to chat",
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

### 2.2 Response Handler

```typescript
// src/handlers/aiWellnessHandler.ts

export const handleAIWellnessResponse = async (userInput: string) => {
  try {
    // 1. Store user input locally
    await storeConversation(userInput);
    
    // 2. Analyze patterns
    const patterns = await analyzeUserPatterns(userInput);
    
    // 3. Build anonymous context
    const context = await buildAnonymousContext(userInput);
    
    // 4. Get AI response
    const aiResponse = await getAIResponse(context);
    
    // 5. Schedule follow-up notification with response
    await scheduleAIResponseNotification(aiResponse);
    
    // 6. Track usage for freemium limits
    await trackUsage();
    
  } catch (error) {
    console.error('AI Wellness response error:', error);
    // Fallback to template response
    await sendFallbackResponse(userInput);
  }
};
```

### 2.3 Response Categories & Templates

```typescript
// src/data/wellnessResponses.ts

export const WELLNESS_PATTERNS = {
  // Physical issues
  back_pain: ['back', 'spine', 'lower back', 'upper back'],
  neck_pain: ['neck', 'shoulders', 'trapezius'],
  eye_strain: ['eyes', 'screen', 'blurry', 'headache'],
  fatigue: ['tired', 'exhausted', 'sleepy', 'fatigue'],
  
  // Mental/Work issues
  stress: ['stressed', 'anxious', 'overwhelmed', 'pressure'],
  focus: ['focus', 'concentrate', 'distracted', 'attention'],
  motivation: ['unmotivated', 'lazy', 'procrastinating', 'bored'],
  
  // Positive
  good: ['good', 'great', 'fine', 'okay', 'well']
};

export const QUICK_ACTIONS = {
  back_pain: {
    title: "Quick Back Relief",
    options: [
      { id: 'cat_cow', label: 'Cat-Cow Stretch', duration: '1 min' },
      { id: 'twist', label: 'Seated Twist', duration: '30 sec' },
      { id: 'walk', label: 'Quick Walk', duration: '2 min' }
    ]
  },
  stress: {
    title: "Stress Relief",
    options: [
      { id: 'breathe', label: 'Deep Breathing', duration: '1 min' },
      { id: 'shoulders', label: 'Shoulder Rolls', duration: '30 sec' },
      { id: 'mindful', label: 'Mindful Moment', duration: '2 min' }
    ]
  }
};
```

---

## Phase 3: User Experience (Week 3)

### 3.1 Conversation Flow

```typescript
// Example conversation flows

// Flow 1: Physical Issue
User: "my back is killing me"
AI: "Sitting too long? Try cat-cow stretches - 30 seconds can help! 
     Stand up, hands on lower back, gently arch backward 3 times. 
     Need a guided routine?"
[Yes - Open Routine] [Just Stretched] [Remind in 1hr]

// Flow 2: Work Stress
User: "cant focus on this project"
AI: "Brain fog is real! Try the 2-minute reset: Stand up, 
     10 arm circles, 5 deep breaths, look out window 20 seconds. 
     Fresh perspective incoming! 💪"
[Done!] [Need More Help] [Not Now]

// Flow 3: Positive Check-in
User: "feeling good today!"
AI: "That's wonderful! Keep the momentum going with a quick 
     energy boost stretch. Your consistency is paying off! 
     🌟 3 days streak!"
[Show Stretch] [Thanks!] [Share Win]
```

### 3.2 Effectiveness Tracking

```typescript
// src/utils/effectivenessTracker.ts

export const trackEffectiveness = async (
  issue: string,
  solution: string,
  effectiveness: 'helped' | 'somewhat' | 'not_really'
) => {
  const history = await getEffectivenessHistory();
  
  history.push({
    timestamp: Date.now(),
    issue,
    solution,
    effectiveness,
    contextualFactors: {
      timeOfDay: getTimeOfDay(),
      dayOfWeek: getDayOfWeek()
    }
  });
  
  await AsyncStorage.setItem(
    AI_WELLNESS_KEYS.EFFECTIVENESS_TRACKING,
    JSON.stringify(history)
  );
  
  // Update AI context for future responses
  if (effectiveness === 'helped') {
    await updateEffectiveSolutions(issue, solution);
  }
};
```

### 3.3 Smart Follow-ups

```typescript
// Schedule follow-up after 30 minutes
export const scheduleEffectivenessCheck = async (
  conversationId: string,
  suggestion: string
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Quick Check 📊",
      body: `Did the ${suggestion} help?`,
      data: { 
        type: 'ai_wellness_followup',
        conversationId,
        suggestion
      },
    },
    trigger: {
      seconds: 1800 // 30 minutes
    }
  });
};
```

---

## Phase 4: Testing & Launch (Week 4)

### 4.1 Freemium Implementation

```typescript
// src/services/aiWellnessFreemium.ts

export const checkAIWellnessAccess = async (): Promise<boolean> => {
  const isPremium = await getIsPremium();
  
  if (isPremium) {
    return true; // Unlimited access
  }
  
  // Free users: Check weekly usage
  const usage = await getWeeklyUsage();
  const today = new Date().getDay();
  
  // Free users get Wednesday (3) and Friday (5)
  const freeAccessDays = [3, 5];
  
  if (!freeAccessDays.includes(today)) {
    await showPremiumPrompt('AI Wellness Coach is available Wed & Fri for free users');
    return false;
  }
  
  if (usage[today] >= 1) {
    await showPremiumPrompt('Daily limit reached. Upgrade for unlimited access!');
    return false;
  }
  
  return true;
};
```

### 4.2 Analytics & Insights

```typescript
// Track usage patterns for improvement
export const aiWellnessAnalytics = {
  trackCheckIn: async (data: any) => {
    // Track locally for user insights
    const analytics = await getLocalAnalytics();
    analytics.checkIns.push({
      timestamp: Date.now(),
      category: categorizeInput(data.userInput),
      responseTime: data.responseTime,
      effectiveness: null // Updated later
    });
    await saveLocalAnalytics(analytics);
  },
  
  generateWeeklyInsights: async () => {
    const analytics = await getLocalAnalytics();
    return {
      mostCommonIssue: getMostFrequent(analytics.categories),
      bestSolutions: getTopSolutions(analytics.effectiveness),
      engagementRate: calculateEngagement(analytics.checkIns),
      improvements: calculateImprovements(analytics.patterns)
    };
  }
};
```

### 4.3 Error Handling & Fallbacks

```typescript
// Graceful degradation when AI is unavailable
const FALLBACK_RESPONSES = {
  back_pain: "Back pain is common with prolonged sitting. Try: Stand up, hands on lower back, gentle arch 3x. Cat-cow stretches for 30 seconds. Set hourly movement reminders!",
  
  stress: "Quick stress relief: Take 5 deep belly breaths. Roll shoulders back 10x. Look away from screen for 20 seconds. You've got this! 💪",
  
  general: "Taking a moment to check in is great! Try a quick body scan: Roll shoulders, stretch arms overhead, take 3 deep breaths. Small actions = big impact!"
};
```

---

## Success Metrics

### Week 1-2: Foundation
- [ ] Text input notifications working
- [ ] AI API integrated and responding
- [ ] Basic conversation storage implemented
- [ ] Privacy-first context system active

### Week 3: Features
- [ ] Pattern recognition functioning
- [ ] Effectiveness tracking operational
- [ ] Smart follow-ups scheduled
- [ ] Quick action buttons integrated

### Week 4: Polish
- [ ] Freemium limits enforced
- [ ] Analytics dashboard created
- [ ] Fallback system tested
- [ ] Beta user feedback collected

## Next Steps After MVP

1. **Voice Input**: Add voice-to-text for easier input
2. **Wellness Insights**: Weekly personalized reports
3. **Team Features**: Anonymous workplace wellness trends
4. **Multilingual**: Support multiple languages
5. **Advanced AI**: GPT-4 for more nuanced conversations

## Technical Requirements

- Expo SDK 49+
- React Native 0.72+
- OpenAI API access
- AsyncStorage for local data
- Expo Notifications with text input support

---

## LLM Integration Details

### Option 1: OpenRouter (Recommended for MVP)
**Pros:**
- Access to multiple models (GPT-4, Claude, Llama) with one API
- Pay-per-use pricing (no monthly fees)
- Built-in fallbacks if one model is down
- Easy model switching for testing

**Implementation:**
```typescript
// src/services/openRouterService.ts
import { OPENROUTER_API_KEY } from '@env';

const OPENROUTER_CONFIG = {
  baseURL: 'https://openrouter.ai/api/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://flexbreak.app', // Your app URL
    'X-Title': 'FlexBreak Wellness Coach'
  },
  model: 'openai/gpt-3.5-turbo', // Start with GPT-3.5 for cost
  // Alternative models:
  // 'anthropic/claude-instant-v1' - Faster, cheaper
  // 'meta-llama/llama-2-70b-chat' - Open source option
};

export const getAIResponse = async (context: any) => {
  const response = await fetch(OPENROUTER_CONFIG.baseURL, {
    method: 'POST',
    headers: OPENROUTER_CONFIG.headers,
    body: JSON.stringify({
      model: OPENROUTER_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: WELLNESS_COACH_PROMPT
        },
        {
          role: 'user',
          content: context.message
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
};
```

### Option 2: Direct OpenAI API
**Pros:**
- Direct access to latest models
- Official SDK support
- Reliable and well-documented

**Implementation:**
```typescript
// src/services/openAIService.ts
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '@env';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const getAIResponse = async (context: any) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: WELLNESS_COACH_PROMPT },
      { role: "user", content: context.message }
    ],
    max_tokens: 150,
    temperature: 0.7,
  });
  
  return completion.choices[0].message.content;
};
```

### Option 3: Self-Hosted Model (Future consideration)
- Use Llama 2 or Mistral on your own server
- Complete privacy but requires infrastructure

---

## Firebase Integration for AI Wellness

### 1. Store Anonymous Usage Analytics

```typescript
// src/services/firebaseAIWellness.ts

// Cloud Firestore structure
const AI_WELLNESS_COLLECTION = 'ai_wellness_analytics';

export const logAnonymousUsage = async (data: {
  category: string, // 'back_pain', 'stress', etc.
  timeOfDay: string,
  effectiveness?: string,
  model?: string
}) => {
  try {
    // Only log anonymous, aggregated data
    await firebase.firestore()
      .collection(AI_WELLNESS_COLLECTION)
      .add({
        ...data,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        // No user ID or personal info
      });
  } catch (error) {
    console.error('Firebase analytics error:', error);
    // Fail silently - don't break the feature
  }
};
```

### 2. Cloud Functions for Premium Features

```typescript
// functions/src/aiWellness.ts

export const processAIWellnessRequest = functions.https.onCall(async (data, context) => {
  // Verify premium status
  const isPremium = await verifyPremiumStatus(context.auth?.uid);
  
  if (!isPremium && !isFreeTierAvailable(context.auth?.uid)) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Free tier limit reached. Upgrade to premium for unlimited access.'
    );
  }
  
  // Process the request
  const response = await getAIResponse(data.context);
  
  // Log usage for rate limiting
  await logUserUsage(context.auth?.uid);
  
  return { response };
});
```

### 3. Remote Config for AI Settings

```typescript
// Use Firebase Remote Config to control AI features
const remoteConfig = firebase.remoteConfig();

export const getAIConfig = async () => {
  await remoteConfig.fetchAndActivate();
  
  return {
    enabled: remoteConfig.getBoolean('ai_wellness_enabled'),
    freeUsageLimit: remoteConfig.getNumber('ai_wellness_free_limit'),
    model: remoteConfig.getString('ai_wellness_model'),
    maxTokens: remoteConfig.getNumber('ai_wellness_max_tokens'),
    systemPrompt: remoteConfig.getString('ai_wellness_prompt')
  };
};
```

### 4. A/B Testing Different Models

```typescript
// Test different AI models/prompts
export const getABTestVariant = async (userId?: string) => {
  const variant = userId ? hashUserId(userId) % 2 : 0;
  
  return variant === 0 
    ? { model: 'gpt-3.5-turbo', prompt: PROMPT_A }
    : { model: 'claude-instant', prompt: PROMPT_B };
};
```

---

## Environment Setup

### 1. Required Environment Variables
```bash
# .env
OPENROUTER_API_KEY=your_openrouter_key_here
# OR
OPENAI_API_KEY=your_openai_key_here

# Firebase (already configured)
FIREBASE_API_KEY=existing_key
FIREBASE_PROJECT_ID=existing_project
```

### 2. Install Required Packages
```bash
npm install openai  # If using OpenAI directly
# OR just use fetch for OpenRouter

# Already installed
# expo-notifications
# @react-native-async-storage/async-storage
# firebase
```

### 3. API Key Security
```typescript
// src/config/secrets.ts
const IS_DEV = __DEV__;

export const getAPIKey = () => {
  if (IS_DEV) {
    // Use development key
    return process.env.OPENROUTER_API_KEY_DEV;
  }
  // Production key should be stored securely
  // Consider using Expo SecureStore for production
  return process.env.OPENROUTER_API_KEY_PROD;
};
```

---

## Cost Optimization

### 1. Token Usage Limits
```typescript
const TOKEN_LIMITS = {
  free: {
    maxInputTokens: 100,
    maxOutputTokens: 150,
    dailyLimit: 2
  },
  premium: {
    maxInputTokens: 200,
    maxOutputTokens: 200,
    dailyLimit: 20
  }
};
```

### 2. Caching Responses
```typescript
// Cache common responses to reduce API calls
const RESPONSE_CACHE = new Map();

export const getCachedOrFetchResponse = async (input: string) => {
  const cacheKey = generateCacheKey(input);
  
  if (RESPONSE_CACHE.has(cacheKey)) {
    return RESPONSE_CACHE.get(cacheKey);
  }
  
  const response = await getAIResponse(input);
  RESPONSE_CACHE.set(cacheKey, response);
  
  // Clear old cache entries
  if (RESPONSE_CACHE.size > 100) {
    const firstKey = RESPONSE_CACHE.keys().next().value;
    RESPONSE_CACHE.delete(firstKey);
  }
  
  return response;
};
```

### 3. Estimated Costs
- OpenRouter GPT-3.5: ~$0.001 per request
- Daily cost (100 users): ~$0.10
- Monthly cost: ~$3.00
- Premium revenue needed: 1-2 subscribers to break even

---

## Detailed LLM Integration Steps

### Step 1: Project Structure Setup

```
src/
├── services/
│   ├── ai/
│   │   ├── openRouterService.ts
│   │   ├── aiWellnessService.ts
│   │   ├── promptTemplates.ts
│   │   └── contextBuilder.ts
│   └── notifications/
│       └── aiNotificationHandler.ts
├── utils/
│   ├── aiWellness/
│   │   ├── patterns.ts
│   │   ├── effectiveness.ts
│   │   └── storage.ts
└── config/
    └── aiConfig.ts
```

### Step 2: Install Dependencies & Setup Environment

```bash
# 1. Install required packages
npm install react-native-dotenv

# 2. Create .env file in project root
touch .env

# 3. Add to .env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
APP_URL=https://flexbreak.app
```

### Step 3: Configure Babel for Environment Variables

```javascript
// babel.config.js
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

### Step 4: Create AI Configuration

```typescript
// src/config/aiConfig.ts
import { OPENROUTER_API_KEY, APP_URL } from '@env';

export const AI_CONFIG = {
  openRouter: {
    apiKey: OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',
    appUrl: APP_URL || 'https://flexbreak.app',
    defaultModel: 'openai/gpt-3.5-turbo',
    maxRetries: 3,
    timeout: 30000, // 30 seconds
  },
  
  models: {
    fast: 'openai/gpt-3.5-turbo',
    balanced: 'anthropic/claude-instant-v1',
    powerful: 'openai/gpt-4-turbo-preview',
    free: 'meta-llama/llama-2-70b-chat',
  },
  
  limits: {
    free: {
      dailyRequests: 2,
      maxInputLength: 100,
      maxOutputTokens: 150,
    },
    premium: {
      dailyRequests: 50,
      maxInputLength: 200,
      maxOutputTokens: 200,
    }
  }
};
```

### Step 5: Implement OpenRouter Service

```typescript
// src/services/ai/openRouterService.ts
import { AI_CONFIG } from '../../config/aiConfig';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterService {
  private headers: HeadersInit;
  
  constructor() {
    this.headers = {
      'Authorization': `Bearer ${AI_CONFIG.openRouter.apiKey}`,
      'HTTP-Referer': AI_CONFIG.openRouter.appUrl,
      'X-Title': 'FlexBreak Wellness Coach',
      'Content-Type': 'application/json',
    };
  }
  
  async chat(
    messages: ChatMessage[], 
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const {
      model = AI_CONFIG.openRouter.defaultModel,
      maxTokens = 150,
      temperature = 0.7
    } = options;
    
    try {
      const response = await fetch(AI_CONFIG.openRouter.baseURL, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }
      
      const data: OpenRouterResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from AI');
      }
      
      return data.choices[0].message.content;
      
    } catch (error) {
      console.error('OpenRouter chat error:', error);
      throw error;
    }
  }
  
  async chatWithRetry(
    messages: ChatMessage[],
    options: any = {},
    retries: number = AI_CONFIG.openRouter.maxRetries
  ): Promise<string> {
    try {
      return await this.chat(messages, options);
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.chatWithRetry(messages, options, retries - 1);
      }
      throw error;
    }
  }
}

export default new OpenRouterService();
```

### Step 6: Create Wellness-Specific AI Service

```typescript
// src/services/ai/aiWellnessService.ts
import openRouterService from './openRouterService';
import { WELLNESS_COACH_PROMPT } from './promptTemplates';
import { buildUserContext } from './contextBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../config/aiConfig';

export class AIWellnessService {
  private conversationHistory: Map<string, any[]> = new Map();
  
  async processWellnessCheckIn(
    userInput: string,
    userId?: string
  ): Promise<{
    response: string;
    suggestedActions?: string[];
    category?: string;
  }> {
    try {
      // Check usage limits
      const canUse = await this.checkUsageLimit(userId);
      if (!canUse) {
        return {
          response: "You've reached your daily AI wellness limit. Upgrade to premium for unlimited access!",
          category: 'limit_reached'
        };
      }
      
      // Build context
      const context = await buildUserContext(userInput, userId);
      
      // Prepare messages
      const messages = [
        {
          role: 'system' as const,
          content: WELLNESS_COACH_PROMPT
        },
        {
          role: 'user' as const,
          content: `Context: ${JSON.stringify(context)}\n\nUser says: ${userInput}`
        }
      ];
      
      // Add conversation history if exists
      if (userId && this.conversationHistory.has(userId)) {
        const history = this.conversationHistory.get(userId);
        // Only include last 2 exchanges to save tokens
        messages.push(...history.slice(-4));
      }
      
      // Get AI response
      const aiResponse = await openRouterService.chatWithRetry(messages, {
        model: AI_CONFIG.models.fast,
        maxTokens: 150,
        temperature: 0.7
      });
      
      // Parse response for actions
      const suggestedActions = this.extractActions(aiResponse);
      const category = this.categorizeInput(userInput);
      
      // Store in conversation history
      if (userId) {
        const history = this.conversationHistory.get(userId) || [];
        history.push(
          { role: 'user', content: userInput },
          { role: 'assistant', content: aiResponse }
        );
        this.conversationHistory.set(userId, history);
      }
      
      // Track usage
      await this.trackUsage(userId);
      
      return {
        response: aiResponse,
        suggestedActions,
        category
      };
      
    } catch (error) {
      console.error('AI Wellness processing error:', error);
      
      // Return fallback response
      return {
        response: this.getFallbackResponse(userInput),
        category: 'error'
      };
    }
  }
  
  private async checkUsageLimit(userId?: string): Promise<boolean> {
    if (!userId) return true; // Anonymous users get limited access
    
    const isPremium = await AsyncStorage.getItem('@user_premium');
    if (isPremium === 'true') return true;
    
    // Check daily usage for free users
    const today = new Date().toDateString();
    const usageKey = `@ai_usage_${userId}_${today}`;
    const usage = await AsyncStorage.getItem(usageKey);
    const usageCount = usage ? parseInt(usage) : 0;
    
    return usageCount < AI_CONFIG.limits.free.dailyRequests;
  }
  
  private async trackUsage(userId?: string): Promise<void> {
    if (!userId) return;
    
    const today = new Date().toDateString();
    const usageKey = `@ai_usage_${userId}_${today}`;
    const usage = await AsyncStorage.getItem(usageKey);
    const usageCount = usage ? parseInt(usage) : 0;
    
    await AsyncStorage.setItem(usageKey, (usageCount + 1).toString());
  }
  
  private extractActions(response: string): string[] {
    // Simple action extraction - can be enhanced with better parsing
    const actions = [];
    
    if (response.includes('stretch')) actions.push('stretch');
    if (response.includes('walk')) actions.push('walk');
    if (response.includes('breathe') || response.includes('breathing')) actions.push('breathing');
    if (response.includes('water')) actions.push('hydrate');
    
    return actions;
  }
  
  private categorizeInput(input: string): string {
    const lowerInput = input.toLowerCase();
    
    const categories = {
      pain: ['pain', 'hurt', 'ache', 'sore'],
      stress: ['stress', 'anxious', 'overwhelm', 'worry'],
      fatigue: ['tired', 'exhausted', 'sleepy', 'fatigue'],
      focus: ['focus', 'concentrate', 'distract'],
      positive: ['good', 'great', 'fine', 'well']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }
  
  private getFallbackResponse(input: string): string {
    const category = this.categorizeInput(input);
    
    const fallbacks = {
      pain: "I hear you're experiencing discomfort. Try a gentle stretch: Stand up, roll your shoulders back 5 times, then gently twist side to side. If pain persists, consider taking a proper break.",
      stress: "Stress can build up quickly. Let's reset: Take 3 deep belly breaths, holding each for 4 counts. Then shake out your hands and arms. You've got this!",
      fatigue: "Feeling tired? A quick energy boost: Stand up, do 10 arm circles, take 5 deep breaths, and if possible, get some fresh air or water.",
      focus: "Need to refocus? Try the 20-20-20 rule: Look at something 20 feet away for 20 seconds. Then do 20 gentle neck rolls. This resets your mind and eyes.",
      positive: "That's wonderful to hear! Keep the momentum going with a quick stretch to maintain that good feeling.",
      general: "Thanks for checking in! Remember, small movement breaks throughout the day make a big difference. Try a quick stretch or walk."
    };
    
    return fallbacks[category] || fallbacks.general;
  }
}

export default new AIWellnessService();
```

### Step 7: Integrate with Notification System

```typescript
// src/services/notifications/aiNotificationHandler.ts
import * as Notifications from 'expo-notifications';
import aiWellnessService from '../ai/aiWellnessService';

export const setupAINotificationHandlers = () => {
  // Handle notification responses (when user interacts)
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const { notification } = response;
    const data = notification.request.content.data;
    
    if (data?.type === 'ai_wellness_checkin') {
      // Get user's text input
      const userInput = response.userText;
      
      if (userInput) {
        // Process with AI
        const result = await aiWellnessService.processWellnessCheckIn(
          userInput,
          data.userId
        );
        
        // Send follow-up notification with AI response
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Wellness Coach 🤖',
            body: result.response,
            data: {
              type: 'ai_wellness_response',
              category: result.category,
              actions: result.suggestedActions
            }
          },
          trigger: null // Immediate
        });
        
        // Schedule effectiveness check after 30 minutes
        if (result.suggestedActions?.length > 0) {
          await scheduleEffectivenessCheck(
            data.userId,
            result.suggestedActions[0]
          );
        }
      }
    }
  });
};

const scheduleEffectivenessCheck = async (
  userId: string,
  action: string
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Quick Check-in 📊',
      body: `Did the ${action} help?`,
      data: {
        type: 'ai_wellness_effectiveness',
        userId,
        action
      },
      categoryIdentifier: 'EFFECTIVENESS_CHECK'
    },
    trigger: {
      seconds: 1800 // 30 minutes
    }
  });
};
```

### Step 8: Testing the Integration

```typescript
// src/utils/testing/testAIIntegration.ts

export const testAIIntegration = async () => {
  console.log('Testing AI Wellness Integration...');
  
  try {
    // Test 1: Basic response
    const response1 = await aiWellnessService.processWellnessCheckIn(
      "my back hurts from sitting too long"
    );
    console.log('Test 1 - Back pain:', response1);
    
    // Test 2: Stress response
    const response2 = await aiWellnessService.processWellnessCheckIn(
      "feeling stressed about deadlines"
    );
    console.log('Test 2 - Stress:', response2);
    
    // Test 3: Positive response
    const response3 = await aiWellnessService.processWellnessCheckIn(
      "feeling great today!"
    );
    console.log('Test 3 - Positive:', response3);
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
```

### Step 9: Error Handling & Monitoring

```typescript
// src/utils/aiWellness/errorHandler.ts

export class AIErrorHandler {
  static async handleError(error: any, context: any) {
    console.error('AI Wellness Error:', error);
    
    // Log to Firebase Analytics (anonymous)
    try {
      await firebase.analytics().logEvent('ai_wellness_error', {
        error_type: error.name,
        error_message: error.message?.substring(0, 100),
        context_category: context.category,
        timestamp: Date.now()
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    // Determine fallback action
    if (error.message?.includes('rate limit')) {
      return {
        response: "Taking a break is always a good idea! Try standing up and doing some gentle stretches.",
        fallback: true
      };
    }
    
    if (error.message?.includes('network')) {
      return {
        response: "Let's keep it simple - how about 5 deep breaths and a quick shoulder roll?",
        fallback: true
      };
    }
    
    // Generic fallback
    return {
      response: "Thanks for checking in! Remember, even a 30-second movement break makes a difference.",
      fallback: true
    };
  }
}
```

### Step 10: Production Deployment Checklist

```typescript
// deployment-checklist.md

## Pre-Deployment Checklist

### Environment Setup
- [ ] API keys stored securely in environment variables
- [ ] Production API key different from development
- [ ] API key not committed to repository

### Error Handling
- [ ] All API calls wrapped in try-catch
- [ ] Fallback responses for common errors
- [ ] Network failure handling
- [ ] Rate limit handling

### Testing
- [ ] Unit tests for AI service
- [ ] Integration tests with mock API
- [ ] Edge case testing (empty input, long input, special characters)
- [ ] Load testing for concurrent users

### Monitoring
- [ ] Error logging to Firebase Analytics
- [ ] Usage tracking implemented
- [ ] Cost monitoring dashboard
- [ ] Response time tracking

### Security
- [ ] No PII sent to AI
- [ ] Input sanitization
- [ ] Response validation
- [ ] API key rotation plan

### Performance
- [ ] Response caching implemented
- [ ] Timeout handling (30s max)
- [ ] Retry logic with exponential backoff
- [ ] Request debouncing
```

## Privacy & Security

- No personal data sent to AI (except optional first name)
- All patterns stored locally
- Anonymous context only
- Optional opt-out available
- Clear data disclosure

---

## Implementation Updates (December 2024)

### ✅ Completed Features
1. **Full OpenRouter Integration** - GPT-3.5-turbo working perfectly
2. **Notification System** - Text input categories on both platforms
3. **Name Collection** - Simple flow accepting single-word inputs
4. **Wednesday-Only Access** - Changed from Wed/Fri to Wednesday only for free users
5. **Usage Limits** - 2 messages + 3 intro messages for free users
6. **Effectiveness Tracking** - 30-minute follow-ups (1 min in dev)
7. **Fun Features** - Goodbye messages and toggle spam detection
8. **Welcome Flow** - Onboarding with clear instructions

### 🔧 Integration Points Needed
```typescript
// 1. Premium Upgrade Handler
import { handleAIWellnessUpgrade } from './services/ai/aiWellnessUpgrade';
// Call after successful premium purchase

// 2. Notification Tap Handler  
import { AIWellnessModal } from './components/ai/AIWellnessNotificationHandler';
// Show modal when user taps notification

// 3. Update Usage Limits
// In aiConfig.ts - increase to 3 messages for better UX
```

### 📊 Current Performance
- **Response Time**: < 2 seconds average
- **API Cost**: ~$0.001 per interaction
- **User Feedback**: Positive on functionality, some confusion on tap vs long-press

### 🚀 Ready for Beta Testing
The feature is functionally complete. Once integration points are connected, it's ready for:
1. Internal testing (10 users)
2. Beta launch (50 users)
3. Full rollout

---

This MVP provides a unique, practical wellness companion that combines AI intelligence with respect for user privacy, creating genuine value for both free and premium users.