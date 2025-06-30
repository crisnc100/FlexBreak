# Enhanced Duolingo-Style Notifications - Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing enhanced, Duolingo-style notifications for the AI Flex Coach feature. These notifications appear larger on the lock screen with custom styling and interactive elements, all using Expo's managed workflow.

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [Project Setup](#project-setup)
3. [Core Implementation](#core-implementation)
4. [Platform-Specific Enhancements](#platform-specific-enhancements)
5. [Integration with AI Coach](#integration-with-ai-coach)
6. [Testing & Debugging](#testing--debugging)
7. [Deployment](#deployment)

---

## Feature Overview

### What We're Building
- **Larger lock screen notifications** that stand out
- **Rich, formatted content** with emojis and styling
- **Interactive actions** (Reply, Voice, Later)
- **Custom sounds** for different scenarios
- **Personalized messages** using user's name
- **Platform-optimized** for both iOS and Android

### Visual Example
```
┌─────────────────────────────────────────┐
│ 🤖 AI Flex Coach                   now │
│ Hey Sarah! 👋                           │
│ ─────────────────────────────────────── │
│ How's your back feeling today? Let's    │
│ check in on your wellness journey! 🌟   │
│                                         │
│ [💬 Reply]  [🎤 Voice]  [⏰ Later]     │
└─────────────────────────────────────────┘
```

---

## Project Setup

### Step 1: Install Dependencies

```bash
# Ensure these are installed (most should already be in your project)
expo install expo-notifications
expo install expo-constants
expo install expo-device
expo install expo-file-system

# For generating dynamic images (optional but recommended)
npm install react-native-svg
npm install react-native-view-shot
```

### Step 2: Update app.json Configuration

**File: `app.json`**
```json
{
  "expo": {
    "name": "FlexBreak",
    "slug": "flexbreak",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#4A90E2",
          "sounds": [
            "./assets/sounds/AInotification1.mp3"
          ],
          "mode": "production"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["fetch", "remote-notification"],
        "NSUserNotificationAlertStyle": "banner"
      },
      "entitlements": {
        "com.apple.developer.usernotifications.communication": true,
        "com.apple.developer.usernotifications.time-sensitive": true
      }
    },
    "android": {
      "useNextNotificationsApi": true,
      "permissions": [
        "NOTIFICATIONS",
        "VIBRATE",
        "USE_FULL_SCREEN_INTENT"
      ]
    }
  }
}
```

### Step 3: Sound Asset

The AI notification sound is already in your project:
- `assets/sounds/AInotification1.mp3` - Custom AI Flex Coach notification sound

---

## Core Implementation

### Step 1: Enhanced Notification Service

**File: `src/services/notifications/EnhancedNotificationService.ts`**
```typescript
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
    "Time for a mindful moment! How are you feeling? 💭",
    "Hey there! Ready for your wellness check-in? 🌈",
    "Let's take a moment to check in on your well-being! ✨",
    "Your AI coach is here! How's everything today? 🤗",
    "Quick check-in time! How's your body feeling? 💪",
    "Hello! Let's see how you're doing today! 🌺",
    "Wellness check! How are you managing today? 🎯",
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
    const data = notification.request.content.data;
    
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
        await this.snoozeNotification(data.conversationId, data.userId);
        break;
        
      default:
        // User tapped notification - open chat
        await this.openChat(data.conversationId, data.userId);
        break;
    }
  }
  
  private async handleTextReply(
    conversationId: string,
    userId: string,
    userText: string
  ) {
    try {
      // Import AI service dynamically to avoid circular dependencies
      const { widgetAIService } = await import('../ai/widgetAIService');
      
      // Process with AI
      const response = await widgetAIService.processWidgetInteraction(
        userText,
        {
          conversationId,
          userId,
          isLockScreen: true,
          inputType: 'text',
        }
      );
      
      // Create follow-up notification with AI response
      await this.createEnhancedNotification({
        userId,
        message: response.message,
        conversationId,
        soundType: 'gentle',
        data: {
          isFollowUp: true,
          previousMessage: userText,
        },
      });
      
    } catch (error) {
      console.error('[Enhanced Notification] Error handling reply:', error);
    }
  }
  
  private async openVoiceMode(conversationId: string, userId: string) {
    // This will be handled by the app's deep linking
    const { Linking } = await import('react-native');
    Linking.openURL(`flexbreak://ai-wellness/voice?conversationId=${conversationId}&userId=${userId}`);
  }
  
  private async openChat(conversationId: string, userId: string) {
    const { Linking } = await import('react-native');
    Linking.openURL(`flexbreak://ai-wellness/chat?conversationId=${conversationId}&userId=${userId}`);
  }
  
  private async snoozeNotification(conversationId: string, userId: string) {
    // Schedule a reminder in 1 hour
    const oneHourLater = new Date();
    oneHourLater.setHours(oneHourLater.getHours() + 1);
    
    await this.createEnhancedNotification({
      userId,
      message: "Hey! Just checking in again. Ready for that wellness chat? 🌟",
      conversationId,
      scheduledTime: oneHourLater,
      soundType: 'gentle',
      data: {
        isSnoozed: true,
      },
    });
  }
  
  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  
  // Get notification statistics
  async getNotificationStats(userId: string) {
    const keys = await AsyncStorage.getAllKeys();
    const notificationKeys = keys.filter(k => k.startsWith('@enhanced_notification_'));
    
    const stats = {
      total: notificationKeys.length,
      today: 0,
      thisWeek: 0,
    };
    
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
```

### Step 2: Notification Response Handler

**File: `src/services/notifications/NotificationResponseHandler.ts`**
```typescript
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
      // Could show an in-app alert or update UI
      // For now, we let the OS handle display
    }
  };
  
  private handleNotificationResponse = async (
    response: Notifications.NotificationResponse
  ) => {
    console.log('[Notification Response]', response);
    
    // Delegate to enhanced notification service
    await enhancedNotificationService.handleNotificationResponse(response);
    
    // Handle navigation if app was opened
    const data = response.notification.request.content.data;
    if (data?.type === 'AI_WELLNESS_ENHANCED') {
      // Navigate based on action
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
```

### Step 3: Integration with AI Scheduler

**File: Update `src/services/ai/aiWellnessSchedulerV2.ts`**
```typescript
// Add import at the top
import { enhancedNotificationService } from '../notifications/EnhancedNotificationService';

// Update the scheduleNotification function
const scheduleNotification = async (
  message: string,
  scheduledTime: Date,
  userData: UserData,
  category: string = 'ai_wellness'
) => {
  console.log('[AI Scheduler] Scheduling enhanced notification for:', scheduledTime);
  
  // Use enhanced notifications for all users (free and premium)
  try {
    const notificationId = await enhancedNotificationService.createEnhancedNotification({
      userId: userData.userId || 'default',
      userName: userData.userName || undefined,
      message: message, // Use the AI-generated message
      scheduledTime,
      soundType: category === 'important' ? 'important' : 'default',
      data: {
        category,
        isPremium: userData.isPremium,
        scheduled: true,
      },
    });
    
    console.log('[AI Scheduler] Enhanced notification scheduled:', notificationId);
    return notificationId;
    
  } catch (error) {
    console.error('[AI Scheduler] Failed to create enhanced notification:', error);
    // Fallback to basic notification if needed
    return scheduleBasicNotification(message, scheduledTime, userData, category);
  }
};

// Add function to create immediate wellness check-in
export const triggerImmediateWellnessCheckIn = async (userId: string, userName?: string) => {
  try {
    const notificationId = await enhancedNotificationService.createEnhancedNotification({
      userId,
      userName,
      soundType: 'default',
      data: {
        triggered: 'manual',
        timestamp: new Date().toISOString(),
      },
    });
    
    console.log('[AI Scheduler] Immediate check-in triggered:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[AI Scheduler] Failed to trigger immediate check-in:', error);
    throw error;
  }
};
```

### Step 4: Hook for Enhanced Notifications

**File: `src/hooks/useEnhancedNotifications.ts`**
```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { enhancedNotificationService } from '../services/notifications/EnhancedNotificationService';
import { notificationResponseHandler } from '../services/notifications/NotificationResponseHandler';
import { useAuth } from './useAuth';
import { usePremium } from './usePremium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../services/storageService';

export const useEnhancedNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [notificationStats, setNotificationStats] = useState<any>(null);
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const responseHandlerRef = useRef<any>(null);
  
  useEffect(() => {
    const initialize = async () => {
      if (!user) return;
      
      // Initialize notification handlers
      responseHandlerRef.current = notificationResponseHandler.getInstance();
      
      // Load user preferences
      const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
      
      setIsInitialized(true);
      
      // Load notification stats
      const stats = await enhancedNotificationService.getNotificationStats(user.uid);
      setNotificationStats(stats);
    };
    
    initialize();
  }, [user]);
  
  const sendTestNotification = useCallback(async () => {
    if (!user || !isInitialized) return;
    
    try {
      const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
      
      const notificationId = await enhancedNotificationService.createEnhancedNotification({
        userId: user.uid,
        userName: userName || undefined,
        soundType: 'default',
        data: {
          isTest: true,
          timestamp: new Date().toISOString(),
        },
      });
      
      setLastNotificationId(notificationId);
      console.log('[Test Notification] Sent:', notificationId);
      
    } catch (error) {
      console.error('[Test Notification] Error:', error);
      throw error;
    }
  }, [user, isInitialized]);
  
  const cancelAllNotifications = useCallback(async () => {
    await enhancedNotificationService.cancelAllNotifications();
    console.log('[Notifications] All cancelled');
  }, []);
  
  const refreshStats = useCallback(async () => {
    if (!user) return;
    
    const stats = await enhancedNotificationService.getNotificationStats(user.uid);
    setNotificationStats(stats);
  }, [user]);
  
  return {
    isInitialized,
    lastNotificationId,
    notificationStats,
    sendTestNotification,
    cancelAllNotifications,
    refreshStats,
  };
};
```

### Step 5: Navigation Service Setup

**File: `src/navigation/NavigationService.ts`**
```typescript
import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}

export function push(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.push(name, params));
  }
}

export function goBack() {
  if (navigationRef.isReady()) {
    navigationRef.goBack();
  }
}
```

### Step 6: App.tsx Integration

**File: Update `App.tsx`**
```typescript
// Add to imports
import { navigationRef } from './src/navigation/NavigationService';
import { useEnhancedNotifications } from './src/hooks/useEnhancedNotifications';
import * as Linking from 'expo-linking';

// Inside App component
function App() {
  // ... existing code
  
  // Initialize enhanced notifications
  const { isInitialized: notificationsReady } = useEnhancedNotifications();
  
  // Handle deep links
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      const { hostname, path, queryParams } = Linking.parse(url);
      
      if (hostname === 'ai-wellness') {
        if (path === 'voice') {
          navigationRef.current?.navigate('AIWellnessVoice', {
            conversationId: queryParams?.conversationId,
            userId: queryParams?.userId,
          });
        } else if (path === 'chat') {
          navigationRef.current?.navigate('AIWellnessChat', {
            conversationId: queryParams?.conversationId,
            userId: queryParams?.userId,
          });
        }
      }
    };
    
    // Get initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    
    // Listen for URL changes
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    
    return () => subscription.remove();
  }, []);
  
  return (
    <NavigationContainer ref={navigationRef}>
      {/* ... rest of your app */}
    </NavigationContainer>
  );
}
```

---

## Platform-Specific Enhancements

### iOS-Specific Features

**File: `src/services/notifications/IOSEnhancements.ts`**
```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const enhanceIOSNotification = async (
  content: Notifications.NotificationContentInput
): Promise<Notifications.NotificationContentInput> => {
  if (Platform.OS !== 'ios') return content;
  
  return {
    ...content,
    // iOS 15+ Focus modes
    interruptionLevel: 'timeSensitive',
    relevanceScore: 1.0, // Highest relevance
    
    // Siri suggestions
    targetContentIdentifier: 'ai-wellness-checkin',
    
    // Thread grouping
    threadIdentifier: 'ai-wellness',
    
    // Summary argument for grouped notifications
    summaryArgument: 'AI Wellness Check-in',
    summaryArgumentCount: 1,
  };
};
```

### Android-Specific Features

**File: `src/services/notifications/AndroidEnhancements.ts`**
```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const enhanceAndroidNotification = async (
  content: Notifications.NotificationContentInput
): Promise<Notifications.NotificationContentInput> => {
  if (Platform.OS !== 'android') return content;
  
  return {
    ...content,
    // Android 12+ notification trampolines
    pressAction: {
      id: 'default',
      launchActivity: 'default',
    },
    
    // Notification bubbles (Android 11+)
    allowBubbles: true,
    
    // Conversation shortcuts
    shortcutId: 'ai-wellness-coach',
    
    // Long press actions
    contextualActions: [
      {
        title: 'Snooze 1 hour',
        actionId: 'snooze_1h',
      },
      {
        title: 'Turn off for today',
        actionId: 'disable_today',
      },
    ],
  } as any;
};
```

---

## Testing & Debugging

### Step 1: Test Notification Component

**File: `src/components/debug/TestNotifications.tsx`**
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useEnhancedNotifications } from '../../hooks/useEnhancedNotifications';
import { enhancedNotificationService } from '../../services/notifications/EnhancedNotificationService';
import { useAuth } from '../../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../services/storageService';

export const TestNotifications: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { sendTestNotification, cancelAllNotifications, notificationStats } = useEnhancedNotifications();
  const [isLoading, setIsLoading] = useState(false);
  
  const testScenarios = [
    {
      title: 'Default Check-in',
      action: async () => {
        const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
        await enhancedNotificationService.createEnhancedNotification({
          userId: user?.uid || 'test',
          userName: userName || undefined,
          soundType: 'default',
        });
      },
    },
    {
      title: 'Gentle Reminder',
      action: async () => {
        const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
        await enhancedNotificationService.createEnhancedNotification({
          userId: user?.uid || 'test',
          userName: userName || undefined,
          message: "No pressure! Just checking if you'd like to chat 💭",
          soundType: 'gentle',
        });
      },
    },
    {
      title: 'Important Message',
      action: async () => {
        const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
        await enhancedNotificationService.createEnhancedNotification({
          userId: user?.uid || 'test',
          userName: userName || undefined,
          message: "Hey! It's been a while. Let's check in on your wellness! 🌟",
          soundType: 'important',
        });
      },
    },
    {
      title: 'Scheduled (5 seconds)',
      action: async () => {
        const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
        const fiveSecondsLater = new Date();
        fiveSecondsLater.setSeconds(fiveSecondsLater.getSeconds() + 5);
        
        await enhancedNotificationService.createEnhancedNotification({
          userId: user?.uid || 'test',
          userName: userName || undefined,
          message: "Scheduled check-in! How are you? 📅",
          scheduledTime: fiveSecondsLater,
        });
      },
    },
  ];
  
  const runTest = async (test: any) => {
    setIsLoading(true);
    try {
      await test.action();
      Alert.alert('Success', `${test.title} notification sent!`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        Test Enhanced Notifications
      </Text>
      
      {notificationStats && (
        <View style={[styles.statsCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.statsTitle, { color: theme.text }]}>
            Notification Stats
          </Text>
          <Text style={[styles.statsText, { color: theme.textSecondary }]}>
            Today: {notificationStats.today} | This Week: {notificationStats.thisWeek}
          </Text>
        </View>
      )}
      
      <View style={styles.testGrid}>
        {testScenarios.map((test, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.testButton, { backgroundColor: theme.accent }]}
            onPress={() => runTest(test)}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>{test.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <TouchableOpacity
        style={[styles.cancelButton, { borderColor: theme.border }]}
        onPress={cancelAllNotifications}
      >
        <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
          Cancel All Notifications
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 14,
  },
  testGrid: {
    gap: 12,
  },
  testButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButtonText: {
    fontSize: 16,
  },
});
```

### Step 2: Debug Configuration

**File: `src/config/debugConfig.ts`**
```typescript
export const DEBUG_CONFIG = {
  notifications: {
    logLevel: __DEV__ ? 'verbose' : 'error',
    testMode: __DEV__,
    showTestButton: __DEV__,
  },
};
```

---

## Deployment

### Step 1: Build Configuration

**File: Update `eas.json`**
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_ENABLE_ENHANCED_NOTIFICATIONS": "true"
      },
      "ios": {
        "resourceClass": "m1-medium",
        "bundleIdentifier": "com.flexbreak.app",
        "buildConfiguration": "Release"
      },
      "android": {
        "resourceClass": "large",
        "buildType": "release",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  }
}
```

### Step 2: Feature Flags

**File: `src/config/featureFlags.ts`**
```typescript
export const FEATURE_FLAGS = {
  ENHANCED_NOTIFICATIONS: {
    enabled: true,
    platforms: {
      ios: true,
      android: true,
    },
    soundEnabled: true,
    richContentEnabled: true,
    testModeEnabled: __DEV__,
  },
};
```

### Step 3: Pre-deployment Checklist

```markdown
## Enhanced Notifications Deployment Checklist

### Assets
- [ ] notification-icon.png (1024x1024) in assets/
- [ ] Sound files (.wav format) in assets/sounds/
- [ ] Test all sound files play correctly

### Configuration
- [ ] app.json updated with notification plugins
- [ ] iOS entitlements configured
- [ ] Android permissions added

### Testing
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Verify notification appears when app killed
- [ ] Test all action buttons (Reply, Voice, Later)
- [ ] Verify deep linking works
- [ ] Test notification sounds (Note: Custom sounds only work in development/production builds, not Expo Go)

### Monitoring
- [ ] Error tracking configured
- [ ] Analytics events added
- [ ] Performance monitoring enabled
```

---

## Summary

This implementation provides Duolingo-style enhanced notifications using Expo's managed workflow. Key features:

1. **Larger, eye-catching notifications** on lock screen
2. **Personalized messages** with user's name
3. **Interactive actions** without opening the app
4. **Custom AI notification sound** (`AInotification1.mp3`) for all AI Flex Coach notifications
5. **Platform-optimized** for both iOS and Android

The implementation requires no native code and can be built entirely using Expo on Windows. The notifications will appear larger and more prominent than standard notifications, similar to Duolingo's engaging style.

**Important Note**: Custom notification sounds only work in development builds or production apps, not in Expo Go. You'll need to create a development build using EAS Build to test the custom sound:
```bash
eas build --profile development --platform all
```