import * as Notifications from 'expo-notifications';
import aiWellnessService from '../ai/core/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
// Removed non-MVP imports
// import ConversationAnalytics from '../ai/conversationAnalytics';
// import { MoodTracker } from '../ai/moodTracker';
// import { scheduleDataRetentionCleanup, scheduleRegularCheckInsAfterWelcome } from '../ai/aiWellnessScheduler';
import { scheduleAIWellnessV2 } from '../ai/scheduling/notificationScheduler';

export const configureAINotifications = async () => {
  // Don't schedule data retention cleanup as a notification
  // It should be handled differently to avoid user-visible notifications
  
  // Simple notification with text reply and voice option
  await Notifications.setNotificationCategoryAsync('AI_WELLNESS_SIMPLE', [
    {
      identifier: 'TEXT_REPLY',
      buttonTitle: '💬 Type Reply',
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
      identifier: 'VOICE_REPLY',
      buttonTitle: '🎙️ Voice Reply',
      options: {
        opensAppToForeground: true,
        isDestructive: false,
        isAuthenticationRequired: false,
      }
    }
  ]);
  
  // Removed redundant categories - using only AI_WELLNESS_SIMPLE defined above
  
  // Effectiveness check category removed - not part of MVP
  
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
            case 'TEXT_REPLY':
              // Use the text input from the notification
              userMessage = response.userText || '';
              if (!userMessage) {
                console.log('No text provided');
                return;
              }
              break;
            case 'VOICE_REPLY':
              // Voice reply from notification - show immediate feedback then open app
              console.log('Voice reply requested from notification');
              
              // Send immediate feedback notification
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "🎙️ Voice Reply Ready",
                  body: "Opening FlexBreak for voice recording...",
                  sound: false,
                  data: { 
                    type: 'ai_wellness_voice_feedback',
                    userId: data.userId
                  },
                },
                trigger: {
                  seconds: 1
                } as Notifications.TimeIntervalTriggerInput
              });
              
              // Set voice mode flag and open app
              await AsyncStorage.setItem('@ai_wellness_voice_mode', 'true');
              await AsyncStorage.setItem('@ai_wellness_voice_context', JSON.stringify({
                originalNotification: data,
                timestamp: Date.now()
              }));
              
              if (showAIWellnessModal) {
                showAIWellnessModal();
              }
              return;
            default:
              // For any other action, try to get text
              userMessage = response.userText || '';
              if (!userMessage) {
                // If no text, just open the app
                console.log('No text provided - opening app');
                if (showAIWellnessModal) {
                  showAIWellnessModal();
                }
                return;
              }
          }
          
          if (userMessage) {
            // Mood tracking removed for MVP
            
            // Process with AI (mark as notification for concise response)
            const result = await aiWellnessService.processWellnessCheckIn(
              userMessage,
              data.userId,
              true  // isNotification flag
            );
            
            // For welcome messages (both regular and premium), send the response as a notification
            // This ensures the user sees the AI's response
            if (data.isWelcome || data.isPremiumWelcome) {
              console.log('Sending AI response notification for welcome message');
              
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "AI Flex Coach 🤖",
                  body: result.response,
                  sound: true,
                  data: { 
                    type: 'ai_wellness_response',
                    userId: data.userId,
                    isWelcomeResponse: true
                  },
                },
                trigger: {
                  seconds: 2 // Send after 2 seconds
                } as Notifications.TimeIntervalTriggerInput
              });
            }
            
            // Always store the response for the bubble to show
            await AsyncStorage.setItem('@ai_wellness_last_response', JSON.stringify({
              response: result.response, // Store full response
              suggestedActions: result.suggestedActions,
              timestamp: Date.now(),
              fromNotification: true, // Flag to indicate this came from notification
              truncatedForNotification: result.response.length > 180 // Flag if response was truncated
            }));
            
            // If the app is in foreground, show the bubble
            if (showAIWellnessModal) {
              // Add small delay to ensure app state is ready
              setTimeout(() => {
                showAIWellnessModal();
              }, 200);
            }
            
            // Disable effectiveness checks - they're annoying
            // We don't need to ask "How are you feeling?" after every interaction
            
            // If this was a response to the welcome message, schedule regular check-ins
            if (data.isWelcome) {
              console.log('User responded to welcome - scheduling regular check-ins');
              await scheduleAIWellnessV2('welcome_response');
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
          
          // Store response and show in app instead of notification
          await AsyncStorage.setItem('@ai_wellness_last_response', JSON.stringify({
            response: result.response, // Store full response
            suggestedActions: result.suggestedActions,
            category: result.category,
            timestamp: Date.now(),
            fromNotification: true, // Flag to indicate this came from notification
            truncatedForNotification: result.response.length > 180 // Flag if response was truncated
          }));
          
          // Show the wellness bubble with the response
          if (showAIWellnessModal) {
            // Add small delay to ensure app state is ready
            setTimeout(() => {
              showAIWellnessModal();
            }, 200);
          }
          
          // Disable effectiveness checks - they're annoying
          // We don't need to ask "How are you feeling?" after every interaction
          
          // If this was a response to the welcome message, schedule regular check-ins
          if (data.isWelcome) {
            console.log('User responded to welcome - scheduling regular check-ins');
            await scheduleAIWellnessV2('welcome_response');
          }
        } else {
          // User just tapped notification without selecting an action
          console.log('User tapped AI wellness notification body - opening bubble');
          
          // If this was the welcome notification, schedule regular check-ins
          if (data.isWelcome) {
            console.log('User tapped welcome notification - scheduling regular check-ins');
            await scheduleAIWellnessV2('welcome_response');
          }
          
          // Show the wellness bubble instead of sending another notification
          if (showAIWellnessModal) {
            showAIWellnessModal();
          } else {
            // Fallback: set flag for app to check
            await AsyncStorage.setItem('@ai_wellness_show_modal', 'true');
          }
        }
      } else if (data?.type === 'ai_wellness_effectiveness') {
        // Effectiveness checks removed - not part of MVP
      } else if (data?.type === 'ai_wellness_upgrade') {
        // Handle upgrade prompt responses
        if (response.actionIdentifier === 'UPGRADE') {
          console.log('User wants to upgrade from AI wellness prompt');
          // Open subscription modal when app opens
          await AsyncStorage.setItem('@show_subscription_modal', 'true');
        }
        // For 'LATER' or just tapping, do nothing
      }
    } catch (error) {
      console.error('Error in AI notification handler:', error);
    }
  });
};

// Effectiveness tracking removed - not part of MVP