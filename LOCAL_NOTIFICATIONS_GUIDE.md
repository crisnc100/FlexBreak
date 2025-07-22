# FlexBreak Local Notifications Guide

## Overview

FlexBreak has transitioned from Firebase Cloud Functions to local notifications for personal reminders. This provides a more reliable, cost-effective solution that works entirely on the user's device.

## How Local Notifications Work

### 1. **Scheduling**
- When users set up reminders, we use `expo-notifications` to schedule local notifications
- Notifications are scheduled up to 30 days in advance
- The app automatically refreshes these schedules when opened

### 2. **Features Supported**
✅ **All Premium Features Work Locally:**
- Custom reminder times
- Custom messages
- Different frequencies (daily, weekdays, custom days)
- Multiple reminders per day
- Weather-based messages (when location enabled)

### 3. **Implementation Details**

#### Core Files:
- `src/services/notificationScheduler.ts` - Handles scheduling logic
- `src/services/reminderService.ts` - Manages reminder settings
- `src/utils/notifications.ts` - Core notification utilities

#### Key Functions:
```typescript
// Schedule reminders based on user settings
scheduleAdvancedReminders(settings: ReminderSettings, premiumLevel: number)

// Save reminder settings locally and to Firestore
saveReminderSettings(settings: ReminderSettings)

// Get current reminder settings
getReminderSettings(): Promise<ReminderSettings>
```

### 4. **Data Storage**
- **Local**: AsyncStorage for immediate access
- **Cloud**: Firebase Firestore for backup and sync across devices

## Limitations & Solutions

### Limitation 1: 30-Day Schedule Window
**Issue**: iOS/Android only allow scheduling notifications 30 days in advance
**Solution**: App automatically reschedules when opened

### Limitation 2: Background Execution
**Issue**: Can't run scheduled code in background like cloud functions
**Solution**: All logic executes when notification triggers, using pre-saved data

### Limitation 3: Weather Updates
**Issue**: Can't fetch fresh weather data in background
**Solution**: Cache weather data for 3 hours, update when app opens

## User Experience

### For Users:
1. Set reminders as usual in Settings
2. Notifications work exactly the same
3. Must open app at least once per month
4. All premium features remain available

### Benefits:
- ✅ No server costs
- ✅ Works offline
- ✅ Instant updates (no server delay)
- ✅ More reliable
- ✅ Privacy-focused (data stays on device)

## Testing Reminders

```javascript
// Test immediate notification
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Test Reminder",
    body: "This is a test notification"
  },
  trigger: null // Immediate
});

// Test scheduled notification (1 minute)
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Scheduled Test",
    body: "This should appear in 1 minute"
  },
  trigger: {
    seconds: 60
  }
});
```

## Weather Cache Cleanup

Weather data is now cleaned up client-side:
- Automatic cleanup when app starts
- Removes cache older than 24 hours
- Manual cleanup available: `clearWeatherCache()`

## Migration Notes

### What Changed:
1. Removed Firebase Functions dependency
2. Reminders save directly to Firestore
3. All scheduling happens locally
4. Weather cache cleanup is client-side

### What Stayed the Same:
1. User interface
2. All features and functionality
3. Firebase Auth, Firestore, Storage
4. Premium features

## Future Enhancements

1. **Widget Support**: Show next reminder time
2. **Smart Scheduling**: ML-based optimal reminder times
3. **Batch Notifications**: Group similar reminders
4. **Rich Notifications**: Images, actions, etc.

## Troubleshooting

### Notifications Not Appearing:
1. Check notification permissions
2. Ensure reminders are enabled
3. Check device Do Not Disturb settings
4. Verify app has been opened recently

### Reminder Settings Not Saving:
1. Check internet connection (for Firestore sync)
2. Verify Firebase authentication
3. Check AsyncStorage is not full

### Weather Not Updating:
1. Check location permissions
2. Verify weather API key is set
3. Clear weather cache and retry