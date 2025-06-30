import * as Notifications from 'expo-notifications';
import { enhancedNotificationService } from './EnhancedNotificationService';
import { navigationRef } from '../../navigation/NavigationService';

export class NotificationResponseHandler {
  private static instance: NotificationResponseHandler;

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): NotificationResponseHandler {
    if (!this.instance) {
      this.instance = new NotificationResponseHandler();
    }
    return this.instance;
  }

  private setupListeners() {
    // Handle notifications when app is in foreground
    Notifications.addNotificationReceivedListener(this.handleNotificationReceived);

    // Handle notification interactions
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);
  }

  private handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('[Notification Received]', notification);

    const data = notification.request.content.data;
    if (data?.type === 'AI_WELLNESS_ENHANCED') {
      // Additional in-app handling could be done here
    }
  };

  private handleNotificationResponse = async (
    response: Notifications.NotificationResponse
  ) => {
    console.log('[Notification Response]', response);

    // Delegate to enhanced notification service
    await enhancedNotificationService.handleNotificationResponse(response);

    const data = response.notification.request.content.data as any;
    if (data?.type === 'AI_WELLNESS_ENHANCED') {
      if (response.actionIdentifier === 'voice') {
        navigationRef.current?.navigate('AIWellnessVoice', {
          conversationId: data.conversationId,
          mode: 'voice',
        });
      } else if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        navigationRef.current?.navigate('AIWellnessChat', {
          conversationId: data.conversationId,
        });
      }
    }
  };
}

export const notificationResponseHandler = NotificationResponseHandler.getInstance();
