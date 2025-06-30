import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export interface EnhancedNotificationConfig {
  userId: string;
  userName?: string;
  message?: string;
  conversationId?: string;
  soundType?: 'default' | 'gentle' | 'important';
  scheduledTime?: Date;
  data?: any;
}

export class EnhancedNotificationService {
  private static instance: EnhancedNotificationService;
  private notificationMessages: string[] = [
    "How's your day going? Let's do a quick wellness check! 🌟",
    'Time for a mindful moment! How are you feeling? 💭',
    'Hey there! Ready for your wellness check-in? 🌈',
    "Let's take a moment to check in on your well-being! ✨",
    "Your AI coach is here! How's everything today? 🤗",
    "Quick check-in time! How's your body feeling? 💪",
    'Hello! Let\'s see how you\'re doing today! 🌺',
    'Wellness check! How are you managing today? 🎯',
    "Time to connect! How's your energy level? ⚡",
    "Hey! Let's chat about how you're feeling! 💬",
  ];

  private constructor() {
    this.initialize();
  }

  static getInstance(): EnhancedNotificationService {
    if (!this.instance) {
      this.instance = new EnhancedNotificationService();
    }
    return this.instance;
  }

  private async initialize() {
    // Request permissions
    await this.requestPermissions();

    // Register notification categories for iOS
    if (Platform.OS === 'ios') {
      await this.setupIOSCategories();
    }

    // Setup notification channels for Android
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
          allowCriticalAlerts: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permissions not granted');
      return false;
    }

    return true;
  }

  private async setupIOSCategories() {
    await Notifications.setNotificationCategoryAsync('AI_WELLNESS_ENHANCED', [
      {
        identifier: 'reply',
        buttonTitle: '💬 Reply',
        options: {
          isAuthenticationRequired: false,
          opensAppToForeground: false,
        },
        textInput: {
          submitButtonTitle: 'Send',
          placeholder: 'How are you feeling?',
        },
      },
      {
        identifier: 'voice',
        buttonTitle: '🎤 Voice Reply',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'later',
        buttonTitle: '⏰ Later',
        options: {
          isDestructive: true,
        },
      },
    ]);
  }

  private async setupAndroidChannels() {
    // High priority channel for wellness notifications
    await Notifications.setNotificationChannelAsync('ai-wellness-enhanced', {
      name: 'AI Wellness Coach',
      description: 'Personalized wellness check-ins from your AI coach',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90E2',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
      bypassDnd: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'AInotification1.mp3',
    });

    // Gentle reminder channel (also uses the same sound)
    await Notifications.setNotificationChannelAsync('ai-wellness-gentle', {
      name: 'Gentle Reminders',
      description: 'Soft wellness reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      sound: 'AInotification1.mp3',
    });
  }

  async createEnhancedNotification(config: EnhancedNotificationConfig): Promise<string> {
    const conversationId = config.conversationId || this.generateId();
    const message = config.message || this.getRandomMessage();
    const userName = config.userName;

    // Build personalized greeting
    const greeting = userName ? `Hey ${userName}! 👋` : 'Hey there! 👋';

    // Store conversation context
    await this.storeConversationContext({
      conversationId,
      userId: config.userId,
      userName,
      initialMessage: message,
      timestamp: new Date().toISOString(),
    });

    // Create notification content
    const content = await this.buildNotificationContent({
      greeting,
      message,
      conversationId,
      userId: config.userId,
      soundType: config.soundType || 'default',
      data: config.data,
    });

    // Schedule notification
    const trigger = config.scheduledTime
      ? { date: config.scheduledTime }
      : null; // Immediate

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    console.log('[Enhanced Notification] Created:', notificationId);
    return notificationId;
  }

  private async buildNotificationContent(params: {
    greeting: string;
    message: string;
    conversationId: string;
    userId: string;
    soundType: string;
    data?: any;
  }): Promise<Notifications.NotificationContentInput> {
    const { greeting, message, conversationId, userId, soundType, data } = params;

    const baseContent: Notifications.NotificationContentInput = {
      title: '🤖 AI Flex Coach',
      subtitle: greeting,
      body: message,
      data: {
        ...data,
        type: 'AI_WELLNESS_ENHANCED',
        conversationId,
        userId,
      },
      badge: 1,
    };

    // Platform-specific enhancements
    if (Platform.OS === 'ios') {
      return this.buildIOSContent(baseContent, soundType);
    } else {
      return this.buildAndroidContent(baseContent, greeting, message);
    }
  }

  private buildIOSContent(
    baseContent: Notifications.NotificationContentInput,
    soundType: string
  ): Notifications.NotificationContentInput {
    return {
      ...baseContent,
      categoryIdentifier: 'AI_WELLNESS_ENHANCED',
      sound: this.getSound(soundType),
      interruptionLevel: 'timeSensitive',
      relevanceScore: 1.0,
      launchImageName: 'SplashScreen',
      // iOS 15+ Communication Notification (shows larger)
      _displayInCarPlay: false,
      _displayInList: true,
      _displayAsAlert: true,
    };
  }

  private buildAndroidContent(
    baseContent: Notifications.NotificationContentInput,
    greeting: string,
    message: string
  ): Notifications.NotificationContentInput {
    return {
      ...baseContent,
      channelId: 'ai-wellness-enhanced',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      vibrate: [0, 250, 250, 250],
      color: '#4A90E2',
      autoDismiss: false,
      sticky: false,
      // Android-specific styling
      largeIcon: 'https://flexbreak.app/assets/ai-coach-large-icon.png',
      // Enable expanded notification
      _displayInForeground: true,
      // Custom layout appearance
      androidMode: Notifications.AndroidNotificationChannelMode.IRRELEVANT,
      // Big Text Style
      style: {
        type: 'bigText',
        title: baseContent.title,
        subtitle: greeting,
        body: message,
        summaryText: 'Tap to start your wellness check-in',
      },
    } as Notifications.NotificationContentInput;
  }

  private getSound(type: string): string | Notifications.NotificationSound {
    // Always use the custom AI notification sound
    if (Platform.OS === 'ios') {
      return {
        shouldPlay: true,
        name: 'AInotification1.mp3',
        volume: type === 'gentle' ? 0.5 : 0.8,
        critical: false,
      };
    } else {
      // Android - just return the filename
      return 'AInotification1.mp3';
    }
  }

  private getRandomMessage(): string {
    const randomIndex = Math.floor(Math.random() * this.notificationMessages.length);
    return this.notificationMessages[randomIndex];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async storeConversationContext(context: any) {
    const key = `@enhanced_notification_${context.conversationId}`;
    await AsyncStorage.setItem(key, JSON.stringify(context));
  }

  async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { notification, actionIdentifier, userText } = response;
    const data = notification.request.content.data as any;

    if (data?.type !== 'AI_WELLNESS_ENHANCED') return;

    console.log('[Enhanced Notification] Response:', actionIdentifier, userText);

    switch (actionIdentifier) {
      case 'reply':
        if (userText) {
          await this.handleTextReply(data.conversationId, data.userId, userText);
        }
        break;
      case 'voice':
        // Deep link to voice mode
        await this.openVoiceMode(data.conversationId, data.userId);
        break;
      case 'later':
        // Simply log for now
        console.log('User chose to handle later');
        break;
      default:
        break;
    }
  }

  private async handleTextReply(conversationId: string, userId: string, text: string) {
    const key = `@enhanced_notification_${conversationId}_reply`;
    await AsyncStorage.setItem(key, JSON.stringify({ userId, text, timestamp: Date.now() }));
  }

  private async openVoiceMode(conversationId: string, userId: string) {
    const url = `flexbreak-app://ai-wellness/voice?conversationId=${conversationId}&userId=${userId}`;
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Opening voice mode...'
      },
      trigger: null,
    });
    if (typeof Linking !== 'undefined') {
      // Ensure Linking is loaded lazily
      const { default: LinkingModule } = await import('expo-linking');
      LinkingModule.openURL(url);
    }
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getNotificationStats(userId: string) {
    const keys = await AsyncStorage.getAllKeys();
    const notificationKeys = keys.filter((k) => k.startsWith('@enhanced_notification_'));
    const stats = {
      today: 0,
      thisWeek: 0,
    } as { today: number; thisWeek: number };

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    for (const key of notificationKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const notification = JSON.parse(data);
        const timestamp = new Date(notification.timestamp);
        if (timestamp >= todayStart) stats.today++;
        if (timestamp >= weekStart) stats.thisWeek++;
      }
    }

    return stats;
  }
}

export const enhancedNotificationService = EnhancedNotificationService.getInstance();
