import * as Notifications from 'expo-notifications';
import aiWellnessService from '../ai/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
import ConversationAnalytics from '../ai/conversationAnalytics';

export const configureAINotifications = async () => {
  // Set up quick response category with multiple options
  await Notifications.setNotificationCategoryAsync('AI_WELLNESS_CHECK', [
    {
      identifier: 'FEELING_GREAT',
      buttonTitle: '😊 Great!',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      }
    },
    {
      identifier: 'FEELING_SORE',
      buttonTitle: '🤕 Sore/Tired',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      }
    },
    {
      identifier: 'TYPE_CUSTOM',
      buttonTitle: '💬 Type Reply',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
      textInput: {
        submitButtonTitle: 'Send',
        placeholder: 'Tell me how you\'re feeling...'
      }
    }
  ]);
  
  // Set up advanced wellness category with voice note option
  await Notifications.setNotificationCategoryAsync('AI_WELLNESS_ADVANCED', [
    {
      identifier: 'QUICK_VOICE',
      buttonTitle: '🎙️ Voice Note',
      options: {
        opensAppToForeground: true, // Opens app for voice recording
        isDestructive: false,
        isAuthenticationRequired: false,
      }
    },
    {
      identifier: 'TYPE_DETAILED',
      buttonTitle: '📝 Detailed Reply',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
      textInput: {
        submitButtonTitle: 'Send',
        placeholder: 'Describe how you\'re feeling in detail...'
      }
    },
    {
      identifier: 'FEELING_STRESSED',
      buttonTitle: '😰 Stressed',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      }
    }
  ]);
  
  // Set up a direct reply category (like WhatsApp/iMessage)
  await Notifications.setNotificationCategoryAsync('AI_WELLNESS_DIRECT_REPLY', [
    {
      identifier: 'DIRECT_REPLY',
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
    },
    {
      identifier: 'QUICK_GOOD',
      buttonTitle: '😊 Good',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      }
    },
    {
      identifier: 'QUICK_STRESSED',
      buttonTitle: '😰 Stressed',
      options: {
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
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

// Export function to show AI modal - will be called from App.tsx
export let showAIWellnessModal: (() => void) | null = null;

export const setShowAIWellnessModal = (fn: () => void) => {
  showAIWellnessModal = fn;
};

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
    try {
      const { notification } = response;
      const data = notification.request.content.data;
      
      if (data?.type === 'ai_wellness_checkin') {
        // Handle quick action buttons
        if (response.actionIdentifier && response.actionIdentifier !== 'REPLY') {
          console.log(`User selected quick action: ${response.actionIdentifier}`);
          
          let userMessage = '';
          switch (response.actionIdentifier) {
            case 'FEELING_GREAT':
              userMessage = "I'm feeling great today! Full of energy.";
              break;
            case 'FEELING_SORE':
              userMessage = "I'm feeling sore and tired, especially in my neck/back/shoulders.";
              break;
            case 'FEELING_STRESSED':
              userMessage = "I'm feeling stressed and overwhelmed right now.";
              break;
            case 'TYPE_CUSTOM':
            case 'TYPE_DETAILED':
              // Use the text input from the notification
              userMessage = response.userText || '';
              if (!userMessage) {
                console.log('No custom text provided');
                return;
              }
              break;
            case 'QUICK_VOICE':
              // This opens the app with voice recording intent
              console.log('Voice note requested - app should open with voice recorder');
              // Store flag to open voice recorder
              await AsyncStorage.setItem('@ai_wellness_voice_mode', 'true');
              return;
            case 'QUICK_GOOD':
              userMessage = "I'm feeling good today! Everything is going well.";
              break;
            case 'QUICK_BAD':
              userMessage = "I'm not feeling great. Having some discomfort and stress.";
              break;
            case 'QUICK_STRESSED':
              userMessage = "I'm feeling stressed and could use some help relaxing.";
              break;
            case 'DIRECT_REPLY':
              // Use the text from the reply field
              userMessage = response.userText || '';
              if (!userMessage) {
                console.log('No reply text provided');
                return;
              }
              break;
            case 'OPEN_CHAT':
              // This should open the app with the chat modal
              console.log('User wants to open chat modal');
              if (showAIWellnessModal) {
                showAIWellnessModal();
              } else {
                // Fallback: set flag for app to check
                await AsyncStorage.setItem('@ai_wellness_show_modal', 'true');
              }
              return;
            default:
              userMessage = response.userText || '';
          }
          
          if (userMessage) {
            // Process with AI
            const result = await aiWellnessService.processWellnessCheckIn(
              userMessage,
              data.userId
            );
            
            // Send follow-up notification with AI response
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'AI Flex Coach 🤖',
                body: result.response,
                data: {
                  type: 'ai_wellness_response',
                  category: result.category,
                  actions: result.suggestedActions
                },
                categoryIdentifier: 'AI_WELLNESS_TEXT' // Allow text reply to continue conversation
              },
              trigger: null // Immediate
            });
            
            // Schedule effectiveness check if needed
            if (result.suggestedActions?.length > 0 && !data.isWelcome) {
              await scheduleEffectivenessCheck(
                data.userId,
                result.suggestedActions[0]
              );
            }
          }
          return; // Exit early for quick actions
        }
        
        // Get user's text input (for REPLY action or long press)
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
          // Skip for welcome messages and limit messages
          if (result.suggestedActions?.length > 0 && 
              result.category !== 'limit_reached' &&
              result.category !== 'name_collection' &&
              !data.isWelcome) {
            await scheduleEffectivenessCheck(
              data.userId,
              result.suggestedActions[0]
            );
          }
        } else {
          // User just tapped notification without selecting an action
          console.log('User tapped AI wellness notification body');
          
          // For simple tap, we'll send a follow-up notification with clearer instructions
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'AI Flex Coach 🤖',
              body: 'To respond: Tap and hold this notification (iOS) or swipe down (Android) to see quick reply options. Or just type your response below! 👇',
              data: {
                type: 'ai_wellness_response',
                userId: data.userId,
                helpMessage: true
              },
              categoryIdentifier: 'AI_WELLNESS_CHECK' // Keep the same category for actions
            },
            trigger: null // Immediate
          });
        }
      } else if (data?.type === 'ai_wellness_effectiveness') {
        // Handle effectiveness check response
        const effectiveness = response.actionIdentifier; // YES, SOMEWHAT, or NO
        await trackEffectiveness(data.userId, data.action, effectiveness);
      }
    } catch (error) {
      console.error('Error in AI notification handler:', error);
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
  
  // In development/testing, use shorter delay but not too short
  const delaySeconds = __DEV__ ? 300 : 1800; // 5 minutes in dev, 30 minutes in production
  
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
    
    // Track in analytics
    await ConversationAnalytics.trackEffectivenessResponse(userId, effectiveness);
    
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