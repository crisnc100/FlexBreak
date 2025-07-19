# Testing First-Time User Flow in Dev Build

## Method 1: Quick Reset (Recommended)

### On iOS Simulator:
1. **Device > Erase All Content and Settings**
2. Reinstall the app
3. Test the flow

### On Android Emulator:
1. **Settings > Apps > FlexBreak > Storage > Clear Data**
2. **Settings > Apps > FlexBreak > Permissions > Reset all**
3. Reopen the app

### On Physical Device:
1. Delete the FlexBreak app
2. Go to Settings > Privacy > Location Services > Reset
3. Reinstall from Expo Go or dev build

## Method 2: Developer Reset Button

Add this reset button to your Developer Section:

```typescript
// In DeveloperSection.tsx or create a new component
const resetFirstTimeFlow = async () => {
  // Clear all permission-related flags
  await AsyncStorage.multiRemove([
    'location_permission_granted',
    'weather_notifications_enabled',
    '@notification_permissions_granted',
    '@reminder_enabled',
    'has_requested_weather_prompt' // if you add this flag
  ]);
  
  // Also clear system permissions (iOS only via Settings)
  Alert.alert(
    'Reset Complete',
    'App data cleared. Now go to Settings > FlexBreak and reset permissions:\n\n' +
    '1. Notifications: Off\n' +
    '2. Location: Never\n\n' +
    'Then restart the app.',
    [{ text: 'OK' }]
  );
};
```

## Method 3: Test Each Step Individually

Create test buttons in Developer Section:

```typescript
// Test weather prompt directly
const testWeatherPrompt = async () => {
  await notifications.requestWeatherNotificationsPermission();
};

// Test notification enable flow
const testNotificationFlow = async () => {
  // Simulate turning on reminders
  handleReminderToggle(true);
};
```

## Step-by-Step Testing Guide

### 1. **Prepare Fresh State**
```bash
# Clear AsyncStorage data
npx react-native run-ios -- --reset-cache
# or
npx react-native run-android -- --reset-cache
```

### 2. **Reset Device Permissions**
- iOS: Settings > General > Reset > Reset Location & Privacy
- Android: Settings > Apps > FlexBreak > Permissions > Deny all

### 3. **Test Flow**
1. Open app
2. Toggle "Enable Reminders" → Should see notification permission
3. Allow notifications → Should see "Reminders Enabled" alert
4. Wait 1 second → Should see weather prompt
5. Tap "Enable Weather" → Should see location permission
6. Allow location → Weather features activate

## Debugging Tips

### Check Current State:
```javascript
// Add this debug function
const checkPermissionState = async () => {
  const states = {
    notifications: await AsyncStorage.getItem('@notification_permissions_granted'),
    reminders: await AsyncStorage.getItem('@reminder_enabled'),
    weather: await AsyncStorage.getItem('weather_notifications_enabled'),
    location: await AsyncStorage.getItem('location_permission_granted'),
  };
  console.log('Permission States:', states);
};
```

### Force Reset in Console:
```javascript
// Run in React Native Debugger console
AsyncStorage.clear();
```

## Common Issues

1. **Weather prompt not showing**
   - Check 1-second delay is working
   - Ensure `requestWeatherNotificationsPermission` is imported

2. **Permissions already granted**
   - Must reset at OS level, not just AsyncStorage
   - iOS: Delete app completely
   - Android: Clear app data + permissions

3. **Testing on Expo Go**
   - Permissions persist across app reloads
   - Use `expo start --clear` to reset

## Quick Test Checklist

- [ ] App data cleared
- [ ] OS permissions reset
- [ ] Fresh app install/reload
- [ ] Console open to see logs
- [ ] Ready to allow/deny each permission

## Pro Tip: Video Record

Record your screen while testing to:
- Review the exact flow
- Check timing of prompts
- Share with team/users
- Debug any issues