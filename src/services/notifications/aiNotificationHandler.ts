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

const trackEffectiveness = async (
  userId: string,
  action: string,
  effectiveness: string
) => {
  try {
    const key = KEYS.AI_WELLNESS.EFFECTIVENESS_TRACKING + `_${userId}`;
    const existing = await AsyncStorage.getItem(key);
    const tracking = existing ? JSON.parse(existing) : [];
    
    tracking.push({
      timestamp: Date.now(),
      action,
      effectiveness,
      date: new Date().toISOString()
    });
    
    // Keep last 100 entries
    if (tracking.length > 100) {
      tracking.splice(0, tracking.length - 100);
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(tracking));
  } catch (error) {
    console.error('Error tracking effectiveness:', error);
  }
};