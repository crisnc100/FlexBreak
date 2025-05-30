# flexbreak Server Notification System

This document outlines the plan for implementing server-based notifications in the flexbreak app, while keeping user progress data in AsyncStorage. **This feature is scheduled for a later phase of development after core app functionality is complete.**

## Overview

The server notification system will allow us to:
1. Send reminders even when the app is closed
2. Schedule custom reminders based on user preferences
3. Send system notifications like streak reminders and level-up congratulations

## Prerequisites & Requirements

Before beginning notification system development, ensure the following are complete:

### App Readiness
- [x] Core app functionality is stable and tested
- [ ] User progress system is fully implemented
- [ ] Premium features are working correctly
- [ ] UX design for notification interactions is finalized

### Development Environment
- [ ] Development build capability (EAS Build or similar)
- [ ] Developer accounts with Apple and Google configured
- [ ] Firebase project properly configured
- [ ] Test devices for both iOS and Android
- [ ] Apple Developer Program membership ($99/year)
- [ ] Google Play Developer account ($25 one-time)

### Technical Knowledge Required
- Node.js backend development
- MongoDB or Firestore database management
- Firebase Cloud Messaging (FCM) implementation
- Apple Push Notification service (APNs)
- Cron job scheduling
- Expo development builds

## Architecture

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Mobile App   │     │   Firebase    │     │ Backend API   │
│ (React Native)│◄────┤  Cloud Msg    │◄────┤  (Node.js)    │
└───────────────┘     └───────────────┘     └───────────────┘
        ▲                                           ▲
        │                                           │
        │                                           │
        │                                           │
┌───────────────┐                          ┌───────────────┐
│  AsyncStorage │                          │ MongoDB/Cloud │
│ (Local Data)  │                          │  Database     │
└───────────────┘                          └───────────────┘
```

## Implementation Steps

### 1. Firebase Setup (2-3 days)

- [x] Create Firebase project
- [ ] Set up Firebase Cloud Messaging
- [ ] Add Firebase SDK to Expo app
  - [ ] Install required dependencies:
    ```
    expo install @react-native-firebase/app
    expo install @react-native-firebase/messaging
    expo install firebase
    ```
- [ ] Configure FCM for both iOS and Android
  - [ ] Add `GoogleService-Info.plist` to iOS
  - [ ] Add `google-services.json` to Android
  - [ ] Update `app.json` with Firebase configuration
- [ ] Generate development build with `eas build`
- [ ] Test basic push notifications

### 2. Backend API Development (1 week)

- [ ] Create Node.js/Express server
- [ ] Set up MongoDB or Firestore database
- [ ] Implement user authentication (can integrate with Firebase Auth)
- [ ] Create API endpoints:
  - [ ] Register device token
  - [ ] Update notification preferences
  - [ ] Fetch notification history

### 3. App-Side Changes (1 week)

- [ ] Add notification registration on app startup:
  ```javascript
  // In App.tsx
  useEffect(() => {
    registerForPushNotifications();
  }, []);
  
  async function registerForPushNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    
    // For FCM, use this approach in development builds
    const token = await messaging().getToken();
    
    // Send token to backend
    await api.registerDevice(token);
  }
  ```

- [ ] Create notification preference syncing:
  ```javascript
  // In useFeatureAccess.ts or similar
  const syncNotificationPreferences = async () => {
    try {
      // Get local preferences
      const settings = await notifications.getAllReminderSettings();
      
      // Send to server
      await api.updateNotificationPreferences({
        enabled: settings.enabled,
        time: settings.time,
        days: settings.days,
        frequency: settings.frequency,
        message: settings.message
      });
    } catch (error) {
      console.error('Failed to sync notification preferences', error);
    }
  };
  ```

### 4. Notification Types and Implementation (4-5 days)

#### Standard Reminders
- Daily reminders at user-specified time
- Implementation: Scheduled via cron jobs on server

#### Custom Reminders (Premium Feature)
- User-defined message
- Custom days/frequency
- Implementation: Store preferences in database, schedule via cron jobs

#### System Notifications
- Streak maintenance ("You're on a 5-day streak!")
- Level-up reminders ("You're close to leveling up!")
- Re-engagement ("It's been 3 days since your last stretch")
- Implementation: Run daily analysis jobs to identify users needing notifications

### 5. Testing and Deployment (1 week)

- [ ] Test notification delivery across devices
- [ ] Test background delivery
- [ ] Test notification interaction handling
- [ ] Perform load testing
- [ ] Deploy backend to cloud provider (AWS, Google Cloud, etc.)

## Database Schema

```javascript
// User Collection
{
  userId: String,  // Unique user identifier
  pushTokens: [    // Multiple devices per user
    {
      token: String,
      platform: String,  // 'ios' or 'android'
      lastActive: Date
    }
  ],
  notificationPreferences: {
    enabled: Boolean,
    time: String,        // Format: "HH:MM"
    days: [String],      // e.g., ['mon', 'wed', 'fri']
    frequency: String,   // 'daily', 'weekdays', 'custom'
    message: String      // Custom message
  },
  premium: Boolean,      // Premium status for feature access
  level: Number,         // User level (synced from client)
  lastActivity: Date,    // Last app activity
  streakCount: Number,   // Current streak (synced from client)
  timezone: String       // For scheduling in correct timezone
}

// Notification History Collection
{
  userId: String,
  notificationType: String,  // 'reminder', 'streak', 'level_up', etc.
  title: String,
  body: String,
  sentAt: Date,
  delivered: Boolean,
  interacted: Boolean
}
```

## Interim Solution

Until the full server notification system is implemented, use local notifications with the following limitations:

- **In-App Reminders**: Notifications will only appear when the app is in the foreground or recently backgrounded
- **Local Scheduling**: Limited reliability for exact timing across device states
- **No Remote Triggers**: Cannot send notifications based on server events
- **No Analytics**: Cannot track delivery and open rates

## Cost Estimates (Monthly)

- Firebase Cloud Messaging: Free tier (unlimited)
- MongoDB Atlas: $0-$57 (Free tier to M10 dedicated)
- Backend Hosting: $5-$25 (Basic VPS to managed service)
- Total: $5-$82/month depending on scale

## Future Enhancements

1. **A/B Testing**: Test different notification messages for effectiveness
2. **Analytics**: Track open rates and engagement
3. **Smart Scheduling**: Use ML to determine optimal notification times
4. **Rich Notifications**: Include images and action buttons

## Security Considerations

- All API endpoints secured with authentication
- Sensitive data encrypted at rest
- HTTPS for all communications
- Rate limiting to prevent abuse
- Regular security audits 

## Timeline for Implementation

Based on current development priorities, this feature is scheduled for:

- **Target Start Date**: After core app launch and initial user feedback
- **Estimated Development Time**: 3-4 weeks
- **Testing Period**: 1-2 weeks
- **Target Production Release**: TBD (based on app launch timeline)

## Important Notes

- Start collecting user tokens as soon as possible, even before implementing the full notification system
- Consider implementing a phased approach, starting with basic daily reminders
- Test thoroughly with both iOS and Android devices in various states (foreground, background, terminated)
- User notification preferences must comply with privacy regulations (GDPR, CCPA) 