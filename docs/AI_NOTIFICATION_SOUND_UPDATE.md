# AI Flex Coach Notification Sound Configuration Update

## Overview
This document explains how to configure the AI Flex Coach notifications to use the custom `AInotification1.mp3` sound file located in `assets/sounds/`.

## Important Note
Expo notifications in managed workflow have limitations with custom sounds. The sound file must be:
1. Included in the app bundle
2. Configured properly in app.json
3. Referenced correctly in the notification configuration

## Required Updates

### 1. Update app.json

**File: `app.json`**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/potentialLogo2.png",
          "color": "#4A90E2",
          "sounds": [
            "./assets/sounds/AInotification1.mp3"
          ],
          "mode": "production"
        }
      ]
    ]
  }
}
```

### 2. Update Enhanced Notification Service

**File: `src/services/notifications/EnhancedNotificationService.ts`**

Replace the sound configuration section with:

```typescript
private getSound(type: string): string | Notifications.NotificationSound {
  // For AI wellness notifications, always use the custom sound
  if (Platform.OS === 'ios') {
    return {
      shouldPlay: true,
      name: 'AInotification1.mp3', // iOS looks for this in the app bundle
      volume: 0.8,
      critical: false,
    };
  } else {
    // Android - just return the filename
    return 'AInotification1.mp3';
  }
}

private buildIOSContent(
  baseContent: Notifications.NotificationContentInput,
  soundType: string
): Notifications.NotificationContentInput {
  return {
    ...baseContent,
    categoryIdentifier: 'AI_WELLNESS_ENHANCED',
    sound: 'AInotification1.mp3', // Direct reference for iOS
    interruptionLevel: 'timeSensitive',
    relevanceScore: 1.0,
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
    sound: 'AInotification1.mp3', // Direct reference for Android
    vibrate: [0, 250, 250, 250],
    color: '#4A90E2',
    // ... rest of configuration
  };
}
```

### 3. Update Android Notification Channel

**File: `src/services/notifications/EnhancedNotificationService.ts`**

In the `setupAndroidChannels()` method:

```typescript
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
    sound: 'AInotification1.mp3', // Use the custom sound
  });
}
```

### 4. Simplified Implementation

If you want a simpler approach that works more reliably with Expo, update your notification creation:

```typescript
async createEnhancedNotification(config: EnhancedNotificationConfig): Promise<string> {
  // ... existing code ...
  
  const content: Notifications.NotificationContentInput = {
    title: '🤖 AI Flex Coach',
    subtitle: greeting,
    body: message,
    sound: 'AInotification1.mp3', // Simple string reference
    data: {
      type: 'AI_WELLNESS_ENHANCED',
      conversationId,
      userId,
    },
    badge: 1,
  };
  
  // Platform-specific settings
  if (Platform.OS === 'ios') {
    content.sound = {
      name: 'AInotification1.mp3',
      volume: 1.0,
    };
  }
  
  // ... rest of code ...
}
```

## Testing the Custom Sound

### 1. Build for Testing
Since custom sounds don't work in Expo Go, you need to build a development client:

```bash
# Create a development build
eas build --profile development --platform all

# Or for specific platform
eas build --profile development --platform ios
eas build --profile development --platform android
```

### 2. Test Notification
```typescript
// Add this test function to your app
const testAINotificationSound = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🤖 AI Flex Coach',
      body: 'Testing custom notification sound',
      sound: 'AInotification1.mp3',
    },
    trigger: { seconds: 2 },
  });
};
```

## Fallback for Expo Go

For testing in Expo Go (where custom sounds don't work), you can:

1. Use the default system sound
2. Play the sound in-app when notification is received

```typescript
// In your notification received handler
Notifications.addNotificationReceivedListener(async (notification) => {
  if (notification.request.content.data?.type === 'AI_WELLNESS_ENHANCED') {
    // Play custom sound in-app (only works when app is in foreground)
    await playAInotification1Sound(); // From soundEffects.ts
  }
});
```

## Important Notes

1. **File Format**: Ensure `AInotification1.mp3` is properly encoded and not too large (recommended < 30 seconds)

2. **iOS Requirements**: 
   - Sound file must be included in Xcode project (happens automatically with Expo)
   - Supported formats: aiff, wav, caf, mp3

3. **Android Requirements**:
   - Sound file must be in the app's raw resources
   - Expo handles this automatically during build

4. **Testing**: Custom sounds only work in:
   - Development builds (not Expo Go)
   - Production builds
   - TestFlight/Internal testing tracks

## Complete Updated Service Example

Here's the key part of the Enhanced Notification Service with custom sound:

```typescript
export class EnhancedNotificationService {
  // ... other code ...
  
  async createEnhancedNotification(config: EnhancedNotificationConfig): Promise<string> {
    const conversationId = config.conversationId || this.generateId();
    const message = config.message || this.getRandomMessage();
    const userName = config.userName;
    
    const greeting = userName ? `Hey ${userName}! 👋` : 'Hey there! 👋';
    
    // Store conversation context
    await this.storeConversationContext({
      conversationId,
      userId: config.userId,
      userName,
      initialMessage: message,
      timestamp: new Date().toISOString(),
    });
    
    // Create notification content with custom sound
    const content: Notifications.NotificationContentInput = {
      title: '🤖 AI Flex Coach',
      subtitle: greeting,
      body: message,
      sound: Platform.OS === 'ios' 
        ? { name: 'AInotification1.mp3', volume: 1.0 }
        : 'AInotification1.mp3',
      data: {
        type: 'AI_WELLNESS_ENHANCED',
        conversationId,
        userId: config.userId,
      },
      badge: 1,
    };
    
    // Add platform-specific enhancements
    if (Platform.OS === 'ios') {
      content.categoryIdentifier = 'AI_WELLNESS_ENHANCED';
      content.interruptionLevel = 'timeSensitive';
      content.relevanceScore = 1.0;
    } else if (Platform.OS === 'android') {
      content.channelId = 'ai-wellness-enhanced';
      content.priority = Notifications.AndroidNotificationPriority.HIGH;
      content.vibrate = [0, 250, 250, 250];
      content.color = '#4A90E2';
    }
    
    // Schedule notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: config.scheduledTime ? { date: config.scheduledTime } : null,
    });
    
    console.log('[Enhanced Notification] Created with custom sound:', notificationId);
    return notificationId;
  }
  
  // ... rest of the service
}
```

This configuration will ensure that all AI Flex Coach notifications use your custom `AInotification1.mp3` sound file.