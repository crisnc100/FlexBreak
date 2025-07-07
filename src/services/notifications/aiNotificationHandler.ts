import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import aiWellnessService from '../ai/core/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
import fcmService from '../fcmService';
import firebaseMessagingService from '../firebaseMessagingService';
// Removed non-MVP imports
// import ConversationAnalytics from '../ai/conversationAnalytics';
// import { MoodTracker } from '../ai/moodTracker';
// import { scheduleDataRetentionCleanup, scheduleRegularCheckInsAfterWelcome } from '../ai/aiWellnessScheduler';
import { scheduleAIWellnessV2 } from '../ai/scheduling/notificationScheduler';

export const configureAINotifications = async () => {
  // Don't schedule data retention cleanup as a notification
  // It should be handled differently to avoid user-visible notifications
  
  console.log('Configuring AI notification categories...');
  
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

// Track processed notification IDs to prevent duplicates
const processedNotificationIds = new Set<string>();

// Track when we last processed notifications to avoid old ones
let lastProcessedTimestamp = 0;

// Export function to show AI modal - will be called from App.tsx
export let showAIWellnessModal: (() => void) | null = null;

export const setShowAIWellnessModal = (fn: () => void) => {
  showAIWellnessModal = fn;
};

export const setupAINotificationHandlers = () => {
  // Check for any pending notification responses when app starts
  checkPendingNotificationResponses();
  // Prevent duplicate handler registration
  if (handlersSetUp) {
    console.log('AI notification handlers already set up, skipping...');
    return;
  }
  
  handlersSetUp = true;
  console.log('Setting up AI notification handlers...');
  
  // Clear old processed IDs periodically (every 10 minutes)
  setInterval(() => {
    if (processedNotificationIds.size > 100) {
      processedNotificationIds.clear();
      console.log('Cleared processed notification IDs cache');
    }
  }, 600000); // 10 minutes
  
  // Handle notification responses (when user interacts)
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    try {
      console.log('=== Notification Response Received ===');
      console.log('Action Identifier:', response.actionIdentifier);
      console.log('User Text:', response.userText);
      console.log('Notification Type:', response.notification.request.content.data?.type);
      
      const { notification } = response;
      const data = notification.request.content.data;
      const notificationId = notification.request.identifier;
      
      // Check if we've already processed this notification
      if (processedNotificationIds.has(notificationId)) {
        console.log('Notification already processed, skipping:', notificationId);
        return;
      }
      
      // Mark as processed
      processedNotificationIds.add(notificationId);
      
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
            
            // Check if we have a real FCM token for better background handling
            const realFcmToken = firebaseMessagingService.getCurrentToken();
            const fcmAvailable = await fcmService.isAvailable();
            
            let result;
            if (realFcmToken || fcmAvailable) {
              console.log('Using FCM for notification response');
              // Use cloud function for all notification processing
              // Prefer real FCM token over Expo token for AI responses
              const tokenToUse = realFcmToken || await fcmService.getFCMToken();
              
              const fcmResult = await fcmService.handleAINotificationResponse(
                userMessage,
                data.userId,
                undefined,
                tokenToUse // Pass the best available token
              );
              
              if (fcmResult.success) {
                // FCM will send the notification, just store the response
                result = {
                  response: fcmResult.response || 'Response sent via notification',
                  category: 'wellness'
                };
                console.log('FCM handled the notification delivery successfully');
                
                // Store the response but DON'T send a local notification
                await AsyncStorage.setItem('@ai_wellness_last_response', JSON.stringify({
                  response: result.response,
                  suggestedActions: result.suggestedActions,
                  timestamp: Date.now(),
                  fromNotification: true,
                  truncatedForNotification: result.response.length > 180
                }));
                
                // If this was a response to the welcome message, schedule regular check-ins
                if (data.isWelcome) {
                  console.log('User responded to welcome - scheduling regular check-ins');
                  await scheduleAIWellnessV2('welcome_response');
                }
                
                return; // Exit early - FCM handles everything
              } else {
                console.warn('FCM failed, falling back to local processing');
                // Fall through to local processing
              }
            }
            
            // Only process locally if FCM is not available or failed
            console.log('Processing notification response locally');
            result = await aiWellnessService.processWellnessCheckIn(
              userMessage,
              data.userId,
              true  // isNotification flag
            );
            
            // Send local notification
            console.log('Sending AI response notification locally');
            console.log('AI Response:', result.response);
            
            try {
              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: "AI Flex Coach 🤖",
                  body: result.response,
                  sound: true,
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  channelId: Platform.OS === 'android' ? 'ai_wellness' : undefined,
                  data: { 
                    type: 'ai_wellness_checkin',  // Keep same type for continued conversation
                    userId: data.userId,
                    isResponse: true
                  },
                  categoryIdentifier: 'AI_WELLNESS_SIMPLE' as any,  // Allow reply to response
                },
                trigger: null // Send immediately
              });
              
              console.log('AI response notification scheduled with ID:', notificationId);
            } catch (notifError) {
              console.error('Failed to schedule AI response notification:', notifError);
            }
            
            // Store the response for app access later if needed
            await AsyncStorage.setItem('@ai_wellness_last_response', JSON.stringify({
              response: result.response,
              suggestedActions: result.suggestedActions,
              timestamp: Date.now(),
              fromNotification: true,
              truncatedForNotification: result.response.length > 180
            }));
            
            // Only show the bubble if app is in foreground and user specifically opened it
            // Don't auto-open for notification replies
            if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER && showAIWellnessModal) {
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
          
          // Process with AI (mark as notification for concise response)
          const result = await aiWellnessService.processWellnessCheckIn(
            userInput,
            data.userId,
            true  // isNotification flag
          );
          
          // Determine notification title based on response type
          let notificationTitle = 'AI Flex Coach 🤖';
          let categoryIdentifier: string | undefined = 'AI_WELLNESS_SIMPLE';
          
          if (result.category === 'limit_reached') {
            notificationTitle = 'Usage Limit Reached 🔒';
            // Add action button to upgrade
            categoryIdentifier = 'UPGRADE_PROMPT';
          } else if (result.category === 'name_collection') {
            notificationTitle = 'Nice to meet you! 👋';
          } else if (result.category === 'greeting') {
            notificationTitle = 'Welcome! 🌟';
          }
          
          // Send AI response as notification for conversation flow
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notificationTitle,
              body: result.response,
              sound: true,
              data: { 
                type: 'ai_wellness_checkin',  // Keep same type for continued conversation
                userId: data.userId,
                isResponse: true,
                category: result.category
              },
              categoryIdentifier: categoryIdentifier as any,
            },
            trigger: {
              seconds: 2 // Send after 2 seconds
            } as Notifications.TimeIntervalTriggerInput
          });
          
          // Store response for app access later if needed
          await AsyncStorage.setItem('@ai_wellness_last_response', JSON.stringify({
            response: result.response,
            suggestedActions: result.suggestedActions,
            category: result.category,
            timestamp: Date.now(),
            fromNotification: true,
            truncatedForNotification: result.response.length > 180
          }));
          
          // Only show the bubble if app is in foreground and user specifically opened it
          if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER && showAIWellnessModal) {
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

// Function to check for pending notification responses when app launches
export const checkPendingNotificationResponses = async () => {
  try {
    console.log('Checking for pending notification responses...');
    
    // Get the last notification response that may have been received while app was killed
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    
    if (lastResponse) {
      const { notification } = lastResponse;
      const notificationDate = notification.date; // Unix timestamp in seconds
      const currentTime = Date.now() / 1000; // Convert to seconds
      const timeDiff = currentTime - notificationDate;
      
      // Only process notifications from the last 5 minutes (300 seconds)
      if (timeDiff > 300) {
        console.log('Ignoring old notification response from', Math.round(timeDiff / 60), 'minutes ago');
        return;
      }
      
      console.log('Found pending notification response:', lastResponse);
      
      const data = notification.request.content.data;
      const notificationId = notification.request.identifier;
      
      // Check if already processed
      if (processedNotificationIds.has(notificationId)) {
        console.log('Pending notification already processed, skipping:', notificationId);
        return;
      }
      
      // Mark as processed
      processedNotificationIds.add(notificationId);
      lastProcessedTimestamp = currentTime;
      
      if (data?.type === 'ai_wellness_checkin' && lastResponse.userText) {
        console.log('Processing pending AI wellness response:', lastResponse.userText);
        
        // Try to use FCM first to prevent duplicates
        const fcmAvailable = await fcmService.isAvailable();
        
        if (fcmAvailable) {
          console.log('Using FCM for pending notification response');
          const fcmResult = await fcmService.handleAINotificationResponse(
            lastResponse.userText,
            data.userId
          );
          
          if (fcmResult.success) {
            console.log('FCM handled the pending notification successfully');
            
            // Store the response for app access
            await AsyncStorage.setItem('@ai_wellness_last_response', JSON.stringify({
              response: fcmResult.response || 'Response sent via notification',
              timestamp: Date.now(),
              fromNotification: true,
              fromPendingResponse: true
            }));
            
            return; // FCM handles everything
          } else {
            console.warn('FCM failed for pending response, falling back to local');
          }
        }
        
        // Only process locally if FCM is not available or failed
        const result = await aiWellnessService.processWellnessCheckIn(
          lastResponse.userText,
          data.userId,
          true  // isNotification flag
        );
        
        // Send the AI response as a notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "AI Flex Coach 🤖",
            body: result.response,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            channelId: Platform.OS === 'android' ? 'ai_wellness' : undefined,
            data: { 
              type: 'ai_wellness_checkin',
              userId: data.userId,
              isResponse: true
            },
            categoryIdentifier: 'AI_WELLNESS_SIMPLE' as any,
          },
          trigger: null // Send immediately
        });
        
        console.log('Sent pending AI response notification');
        
        // Store the response for app access
        await AsyncStorage.setItem('@ai_wellness_last_response', JSON.stringify({
          response: result.response,
          suggestedActions: result.suggestedActions,
          timestamp: Date.now(),
          fromNotification: true,
          fromPendingResponse: true
        }));
      }
    }
  } catch (error) {
    console.error('Error checking pending notification responses:', error);
  }
};