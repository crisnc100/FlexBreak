import * as Notifications from 'expo-notifications';
import aiWellnessService from '../ai/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';

export const configureAINotifications = async () => {
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
  
  // Set up upgrade prompt category
  await Notifications.setNotificationCategoryAsync('UPGRADE_PROMPT', [
    {
      identifier: 'UPGRADE',
      buttonTitle: 'Upgrade to Premium 💎',
      options: { 
        opensAppToForeground: true,
        isDestructive: false,
        isAuthenticationRequired: false
      }
    },
    {
      identifier: 'LATER',
      buttonTitle: 'Maybe Later',
      options: { opensAppToForeground: false }
    }
  ]);
};

// Keep track of whether handlers are already set up
let handlersSetUp = false;

export const setupAINotificationHandlers = () => {
  // Prevent duplicate handler registration
  if (handlersSetUp) {
    console.log('AI notification handlers already set up, skipping...');
    return;
  }
  
  handlersSetUp = true;
  console.log('Setting up AI notification handlers...');
  
  // Handle notification responses (when user interacts)
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const { notification } = response;
    const data = notification.request.content.data;
    
    if (data?.type === 'ai_wellness_checkin') {
      // Get user's text input
      const userInput = response.userText;
      
      if (userInput) {
        console.log(`Processing AI wellness input from user ${data.userId}: "${userInput}"`);
        
        // Process with AI
        const result = await aiWellnessService.processWellnessCheckIn(
          userInput,
          data.userId
        );
        
        // Determine notification title based on response type
        let notificationTitle = 'Wellness Coach 🤖';
        let categoryIdentifier = undefined;
        
        if (result.category === 'limit_reached') {
          notificationTitle = 'Usage Limit Reached 🔒';
          // Add action button to upgrade
          categoryIdentifier = 'UPGRADE_PROMPT';
        } else if (result.category === 'name_collection') {
          notificationTitle = 'Nice to meet you! 👋';
        } else if (result.category === 'greeting') {
          notificationTitle = 'Welcome! 🌟';
        }
        
        // Send follow-up notification with AI response
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notificationTitle,
            body: result.response,
            data: {
              type: 'ai_wellness_response',
              category: result.category,
              actions: result.suggestedActions
            },
            categoryIdentifier
          },
          trigger: null // Immediate
        });
        
        // Schedule effectiveness check after 30 minutes
        if (result.suggestedActions?.length > 0 && 
            result.category !== 'limit_reached' &&
            result.category !== 'name_collection') {
          await scheduleEffectivenessCheck(
            data.userId,
            result.suggestedActions[0]
          );
        }
      } else {
        console.log('No text input received from notification response');
      }
    } else if (data?.type === 'ai_wellness_effectiveness') {
      // Handle effectiveness check response
      const effectiveness = response.actionIdentifier; // YES, SOMEWHAT, or NO
      await trackEffectiveness(data.userId, data.action, effectiveness);
    }
  });
};

const scheduleEffectivenessCheck = async (
  userId: string,
  action: string
) => {
  console.log(`Scheduling effectiveness check for action: ${action}`);
  
  // Get user's name if available
  const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
  const greeting = userName ? `Hey ${userName}!` : 'Quick check-in!';
  
  // Create more engaging follow-up messages
  const messages = {
    'neck stretches': `${greeting} How's your neck feeling after those stretches?`,
    'shoulder rolls': `${greeting} Did the shoulder rolls help relieve tension?`,
    'back stretches': `${greeting} Is your back feeling better after stretching?`,
    'stretches': `${greeting} Did the stretches help you feel better?`,
    'short walk': `${greeting} How was your walk? Feeling refreshed?`,
    'breathing exercises': `${greeting} Did the breathing exercises help you relax?`,
    'water break': `${greeting} Feeling more hydrated and alert?`,
    'eye rest': `${greeting} Are your eyes feeling less strained?`,
    'default': `${greeting} Did the ${action} help?`
  };
  
  const body = messages[action] || messages['default'];
  
  // In development/testing, use shorter delay
  const delaySeconds = __DEV__ ? 60 : 1800; // 1 minute in dev, 30 minutes in production
  
  console.log(`Effectiveness check will trigger in ${delaySeconds} seconds (${delaySeconds / 60} minutes)`);
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'How are you feeling? 💭',
      body,
      data: {
        type: 'ai_wellness_effectiveness',
        userId,
        action,
        timestamp: Date.now()
      },
      categoryIdentifier: 'EFFECTIVENESS_CHECK'
    },
    trigger: {
      seconds: delaySeconds
    }
  });
};

const trackEffectiveness = async (
  userId: string,
  action: string,
  effectiveness: string
) => {
  try {
    const key = KEYS.AI_WELLNESS.EFFECTIVENESS_TRACKING + `_${userId}`;
    const existing = await AsyncStorage.getItem(key);
    const tracking = existing ? JSON.parse(existing) : [];
    
    // Calculate effectiveness score
    let score = 0;
    if (effectiveness === 'YES') score = 1;
    else if (effectiveness === 'SOMEWHAT') score = 0.5;
    
    tracking.push({
      timestamp: Date.now(),
      action,
      effectiveness,
      score,
      date: new Date().toISOString()
    });
    
    // Keep last 100 entries
    if (tracking.length > 100) {
      tracking.splice(0, tracking.length - 100);
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(tracking));
    
    // Update action effectiveness summary
    await updateActionEffectiveness(userId, action, score);
    
    // Log for debugging
    console.log(`Tracked effectiveness: ${action} - ${effectiveness} (score: ${score})`);
  } catch (error) {
    console.error('Error tracking effectiveness:', error);
  }
};

// New function to maintain effectiveness summary for each action
const updateActionEffectiveness = async (
  userId: string,
  action: string,
  score: number
) => {
  try {
    const summaryKey = KEYS.AI_WELLNESS.PATTERNS + `_${userId}`;
    const existing = await AsyncStorage.getItem(summaryKey);
    const summary = existing ? JSON.parse(existing) : {};
    
    if (!summary[action]) {
      summary[action] = {
        totalScore: 0,
        count: 0,
        averageEffectiveness: 0,
        lastUsed: Date.now()
      };
    }
    
    summary[action].totalScore += score;
    summary[action].count += 1;
    summary[action].averageEffectiveness = summary[action].totalScore / summary[action].count;
    summary[action].lastUsed = Date.now();
    
    await AsyncStorage.setItem(summaryKey, JSON.stringify(summary));
  } catch (error) {
    console.error('Error updating action effectiveness:', error);
  }
};