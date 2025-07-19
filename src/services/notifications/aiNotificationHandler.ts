import * as Notifications from 'expo-notifications';
import aiWellnessService from '../ai/core/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
import { scheduleAIWellnessV2 } from '../ai/scheduling/notificationScheduler';

export const configureAINotifications = async () => {
  // Don't schedule data retention cleanup as a notification
  // It should be handled differently to avoid user-visible notifications
  
  // Simple notification with chat action
  await Notifications.setNotificationCategoryAsync('AI_WELLNESS_SIMPLE', [
    {
      identifier: 'CHAT',
      buttonTitle: '💬 Chat with FlexCoach',
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
  console.log('[aiNotificationHandler] Setting showAIWellnessModal function');
  showAIWellnessModal = fn;
};

// Shared function to handle notification responses
const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
  try {
    const { notification } = response;
    const data = notification.request.content.data || {};
    
    // Check for AI wellness notifications (including welcome notifications)
    // Handle both button tap (CHAT) and notification body tap (DEFAULT_ACTION_IDENTIFIER)
    const isAIWellnessNotification = data?.type === 'ai_wellness_checkin' || data?.isWelcome || data?.isPremiumWelcome;
    const isRelevantAction = response.actionIdentifier === 'CHAT' || response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;
    
    if (isAIWellnessNotification && isRelevantAction) {
      console.log('[aiNotificationHandler] User tapped AI wellness notification');
      
      // Check if AI wellness is enabled
      const aiWellnessEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
      if (aiWellnessEnabled !== 'true' && !data?.isWelcome && !data?.isPremiumWelcome) {
        console.log('AI wellness is disabled, not opening FlexChat modal');
        return;
      }
      
      // For any interaction (tap on notification body or "Chat with FlexCoach" button),
      // just open the app and show the FlexChatModal
      
      // If this was the welcome notification, schedule regular check-ins
      if (data?.isWelcome || data?.isPremiumWelcome) {
        console.log('User interacted with welcome notification - scheduling regular check-ins');
        await scheduleAIWellnessV2('welcome_response');
      }
      
      // Try to open the FlexChatModal if handler is available
      if (showAIWellnessModal) {
        console.log('Modal handler is available, opening FlexChatModal directly');
        showAIWellnessModal();
      } else {
        // Only set flag if we can't open directly (app was killed)
        console.log('Modal handler not available, setting flag for app open');
        await AsyncStorage.setItem('@show_flexchat_on_open', JSON.stringify({
          timestamp: Date.now(),
          value: true
        }));
      }
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
};

export const setupAINotificationHandlers = () => {
  // Prevent duplicate handler registration
  if (handlersSetUp) {
    console.log('AI notification handlers already set up, skipping...');
    return;
  }
  
  handlersSetUp = true;
  console.log('[aiNotificationHandler] Setting up AI notification handlers...');
  console.log('[aiNotificationHandler] showAIWellnessModal is:', showAIWellnessModal ? 'SET' : 'NULL');
  
  // Handle notification responses (when user interacts)
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationResponse(response);
  });
  console.log('[aiNotificationHandler] Notification response listener registered');
  
  // IMPORTANT: Check if app was opened from a notification (handles killed app state)
  // This must be done AFTER setting up the listener and with a small delay
  setTimeout(async () => {
    try {
      // Check if we've already processed the last notification in this session
      const processedKey = '@last_notification_processed';
      const lastProcessed = await AsyncStorage.getItem(processedKey);
      
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      console.log('[aiNotificationHandler] Checking last notification response:', !!lastResponse);
      
      if (lastResponse) {
        // Create a unique identifier for this notification response
        const responseId = `${lastResponse.notification.request.identifier}_${lastResponse.notification.date}`;
        
        // Only process if we haven't already processed this exact response
        if (lastProcessed !== responseId) {
          console.log('[aiNotificationHandler] App was opened from notification:', {
            actionIdentifier: lastResponse.actionIdentifier,
            notificationData: lastResponse.notification.request.content.data
          });
          
          // Process the notification
          await handleNotificationResponse(lastResponse);
          
          // Mark this notification as processed
          await AsyncStorage.setItem(processedKey, responseId);
        } else {
          console.log('[aiNotificationHandler] Notification already processed, skipping');
        }
      }
    } catch (error) {
      console.error('[aiNotificationHandler] Error checking last notification response:', error);
    }
  }, 500); // Increased delay to ensure everything is initialized
};

// Effectiveness tracking removed - not part of MVP